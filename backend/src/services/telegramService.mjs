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
      // 2. VALIDACIÓN DE INTEGRANTE (Solo operadores activos)
      const member = await queryOne(`
        SELECT i.*, e.tipo as equipo_tipo 
        FROM telegram_integrantes i 
        JOIN telegram_equipos e ON i.equipo_id = e.id 
        WHERE i.telegram_user_id = ? AND i.activo = 1 AND e.activo = 1
      `, [telegramUserId]);

      if (!member) {
        return safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { 
          text: '❌ No tienes permisos o tu equipo está desactivado.', 
          show_alert: true 
        }), 'answerCallbackQuery-noMember');
      }

      // 3. LOCK DISTRIBUIDO (Redlock) para evitar colisiones entre instancias del cluster
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
            `, [member.nombre_visible, boliviaTime.now(), refId]);

            await safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { text: '✅ Caso tomado. Eres el único responsable.' }), 'answerCallbackQuery-tomar');
            await updateTelegramMessage(bot, message, 'tomado', member.nombre_visible, refId, caso.tipo_operacion);
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
            await updateTelegramMessage(bot, message, 'resuelto', member.nombre_visible, refId, caso.tipo_operacion, action);
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
