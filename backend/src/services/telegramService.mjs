import { setupAdminBot } from '../services/telegramBot.mjs';
import { safeTelegramCall, safeAsync } from '../utils/safe.mjs';
import { query, queryOne, transaction } from '../config/db.mjs';
import { boliviaTime } from '../services/dbService.mjs';
import { checkIdempotencyRedis, acquireLock, releaseLock } from './redisService.mjs';
import logger from '../utils/logger.mjs';

/**
 * Lógica Central de Telegram v9.5.0: RESILIENCIA TOTAL + UN CASO = UN RESPONSABLE.
 * Combina validación de integrantes, bloqueo de filas (MySQL) e idempotencia (Redis).
 */
export async function setupTelegramLogic() {
  const bot = await setupAdminBot();
  if (!bot) return;

  logger.info('[TELEGRAM] Cargando Lógica de Eventos Resiliente...');

  // --- ESCUCHADOR DE CALLBACK QUERIES (Botones) ---
  bot.on('callback_query', async (callbackQuery) => {
    const { data, message, from, id: callbackId } = callbackQuery;
    if (!data || !from) return;

    // Formato esperado: accion:tipo:refId (ej: tomar:retiro:uuid)
    const [action, type, refId] = data.split(':');
    const telegramUserId = String(from.id);

    // 1. IDEMPOTENCIA (Evitar doble procesamiento por clicks rápidos o reintentos de red)
    const isProcessed = await checkIdempotencyRedis(callbackId);
    if (isProcessed) {
      return safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { text: '⚠️ Acción ya procesada.' }), 'answerCallback-Idempotency');
    }

    try {
      // 2. VALIDACIÓN DE OPERADOR (Doble Factor: Tabla Especial + Tabla Usuarios v10.5.0)
      let member = await queryOne(`
        SELECT * FROM usuarios_telegram 
        WHERE telegram_id = ? AND activo = 1
      `, [telegramUserId]);

      // Si no está en usuarios_telegram, buscamos en la tabla usuarios principal (rol admin)
      if (!member) {
        const webAdmin = await queryOne(`
          SELECT id, nombre_usuario as nombre, telegram_username 
          FROM usuarios 
          WHERE telegram_user_id = ? AND rol = 'admin' AND activo = 1
        `, [telegramUserId]);

        if (webAdmin) {
          // Auto-vincular para futuras validaciones rápidas
          await query(`
            INSERT IGNORE INTO usuarios_telegram (telegram_id, nombre, telegram_username, activo)
            VALUES (?, ?, ?, 1)
          `, [telegramUserId, webAdmin.nombre, telegramUsername || webAdmin.telegram_username]);
          
          member = { telegram_id: telegramUserId, nombre: webAdmin.nombre, activo: 1 };
          logger.info(`[TELEGRAM-AUTH] Auto-vinculado administrador web: ${webAdmin.nombre} (${telegramUserId})`);
        }
      }

      if (!member) {
        logger.warn(`[TELEGRAM-AUTH-REJECTED] Usuario sin permisos intentó usar el bot. ID: ${telegramUserId}, Username: ${telegramUsername}`);
        return safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { 
          text: `❌ Sin permisos vinculados.\nTu ID de Telegram es: ${telegramUserId}\nRegístralo en el panel de Admin.`, 
          show_alert: true 
        }), 'answerCallbackQuery-noMember');
      }

      // 3. LOCK DISTRIBUIDO (Redlock)
      const lock = await acquireLock(`telegram:${refId}`, 15000);
      if (!lock) {
        return safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { text: '⏳ Procesando en otra instancia, espera...' }), 'answerCallback-Lock');
      }

      try {
        // 4. TRANSACCIÓN ATÓMICA CON BLOQUEO DE FILA (SELECT FOR UPDATE)
        await transaction(async (conn) => {
          // Bloqueo estricto del caso en la tabla de control operativo
          const [casoRows] = await conn.query(
            'SELECT * FROM telegram_casos_bloqueo WHERE referencia_id = ? FOR UPDATE', 
            [refId]
          );
          let caso = casoRows[0];

          // Si no existe, lo creamos (Fallback de seguridad)
          if (!caso) {
            const opType = type || (data.includes('retiro') ? 'retiro' : 'recarga');
            await conn.query(
              'INSERT INTO telegram_casos_bloqueo (referencia_id, tipo_operacion, estado_operativo) VALUES (?, ?, "pendiente")',
              [refId, opType]
            );
            [caso] = await conn.query('SELECT * FROM telegram_casos_bloqueo WHERE referencia_id = ? FOR UPDATE', [refId]);
          }

          // --- LÓGICA DE ACCIONES ---

          if (action === 'tomar') {
            if (caso.estado_operativo !== 'pendiente') {
              throw new Error(`Este caso ya fue ${caso.estado_operativo} por ${caso.tomado_por === telegramUserId ? 'ti' : 'otro operador'}.`);
            }

            await conn.query(`
              UPDATE telegram_casos_bloqueo 
              SET estado_operativo = 'tomado', tomado_por = ?, tomado_at = ?, telegram_message_id = ?
              WHERE referencia_id = ?
            `, [telegramUserId, boliviaTime.now(), String(message.message_id), refId]);

            // Sincronizar con la tabla real del sistema
            const table = caso.tipo_operacion === 'retiro' ? 'retiros' : 'compras_nivel';
            await conn.query(`
              UPDATE ${table} 
              SET estado_operativo = 'tomado', 
                  taken_by_admin_id = (SELECT id FROM usuarios WHERE rol='admin' LIMIT 1), -- Fallback a un admin real
                  taken_by_admin_name = ?, 
                  taken_at = ?
              WHERE id = ?
            `, [member.nombre || member.telegram_username || 'Admin', boliviaTime.now(), refId]);

            await safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { text: '✅ Caso tomado. Eres el único responsable.' }), 'answerCallbackQuery-tomar');
            await updateTelegramMessage(bot, message, 'tomado', member.nombre || member.telegram_username || 'Admin', refId, caso.tipo_operacion);
          }

          else if (action === 'aceptar' || action === 'rechazar') {
            if (caso.estado_operativo !== 'tomado') {
              throw new Error('Debes tomar el caso antes de resolverlo.');
            }
            if (caso.tomado_por !== telegramUserId) {
              throw new Error(`Solo ${caso.tomado_por_nombre || 'el operador original'} puede resolverlo.`);
            }

            const isAceptar = action === 'aceptar';
            const table = caso.tipo_operacion === 'retiro' ? 'retiros' : 'compras_nivel';
            const nuevoEstado = isAceptar ? (table === 'retiros' ? 'pagado' : 'completada') : 'rechazada';
            
            // Actualizar tabla real
            await conn.query(
              `UPDATE ${table} SET 
                estado = ?, 
                procesado_por = (SELECT id FROM usuarios WHERE rol='admin' LIMIT 1),
                procesado_at = ?,
                estado_operativo = ?
               WHERE id = ?`,
              [nuevoEstado, boliviaTime.now(), isAceptar ? 'aceptado' : 'rechazado', refId]
            );

            // Marcar como resuelto en bloqueo
            await conn.query(
              `UPDATE telegram_casos_bloqueo SET estado_operativo = 'resuelto', resuelto_at = ? WHERE referencia_id = ?`,
              [boliviaTime.now(), refId]
            );

            await safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { text: `✅ Caso ${action}do correctamente.` }), 'answerCallbackQuery-resolver');
            await updateTelegramMessage(bot, message, 'resuelto', member.nombre || member.telegram_username || 'Admin', refId, caso.tipo_operacion, action);
          }
        });
      } finally {
        await releaseLock(lock);
      }

    } catch (err) {
      logger.error(`[Telegram Callback Error]: ${err.message}`);
      safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { 
        text: `❌ ERROR: ${err.message}`, 
        show_alert: true 
      }), 'answerCallbackQuery-error');
    }
  });
}

/**
 * Helper para editar mensajes en Telegram según el estado
 */
async function updateTelegramMessage(bot, message, estado, operador, refId, tipo, resolucion = '') {
  const chatId = message.chat.id;
  const messageId = message.message_id;
  let text = message.text || message.caption || '';

  // Limpiar texto anterior de estado si existe
  text = text.split('\n\n---')[0];

  let newText = text;
  let buttons = [];

  if (estado === 'tomado') {
    newText += `\n\n--- ⏳ EN PROCESO ---\n👨‍💼 Operador: ${operador}\n🕒 Tomado a las: ${boliviaTime.getTimeString()}`;
    buttons = [
      [
        { text: '✅ Aceptar/Pagar', callback_data: `aceptar:${tipo}:${refId}` },
        { text: '❌ Rechazar', callback_data: `rechazar:${tipo}:${refId}` }
      ]
    ];
  } else if (estado === 'resuelto') {
    const emoji = resolucion === 'aceptar' ? '✅' : '❌';
    newText += `\n\n--- ${emoji} ${resolucion.toUpperCase()} ---\n👨‍💼 Por: ${operador}\n🕒 A las: ${boliviaTime.getTimeString()}`;
    buttons = []; // Sin botones tras resolver
  }

  await safeTelegramCall(() => {
    if (message.caption) {
      return bot.editMessageCaption(newText, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      return bot.editMessageText(newText, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: buttons }
      });
    }
  }, 'editTelegramMessage');
}
