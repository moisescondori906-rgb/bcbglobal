import { setupAdminBot } from '../services/telegramBot.mjs';
import { safeTelegramCall, safeAsync } from '../utils/safe.mjs';
import { query, queryOne, transaction } from '../config/db.mjs';
import { 
  boliviaTime, 
  approveLevelPurchase, 
  approveRetiro, 
  rejectRetiro,
  getRetiroById,
  getRecargaById,
  distributeInvestmentCommissions
} from '../services/dbService.mjs';
import { checkIdempotencyRedis, acquireLock, releaseLock } from './redisService.mjs';
import logger from '../utils/logger.mjs';

/**
 * Lógica Central de Telegram v10.0.0: ARQUITECTURA DE SERVICIOS UNIFICADA.
 * Ahora utiliza las funciones de dbService para garantizar consistencia y auditoría.
 */
export async function setupTelegramLogic() {
  const bot = await setupAdminBot();
  if (!bot) return;

  logger.info('[TELEGRAM] Cargando Lógica de Eventos Resiliente v10.0.0...');

  // --- ESCUCHADOR DE CALLBACK QUERIES (Botones) ---
  bot.on('callback_query', async (callbackQuery) => {
    const { data, message, from, id: callbackId } = callbackQuery;
    if (!data || !from) return;

    // 0. BLINDAJE DE SECRETARIA v10.7.0
    const targetSecretariaId = process.env.TELEGRAM_CHAT_SECRETARIA || '-1003900884989';
    if (String(message.chat.id) === targetSecretariaId) {
      return safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { 
        text: '⚠️ Acciones deshabilitadas en este grupo. Use los grupos operativos.', 
        show_alert: true 
      }), 'answerCallbackQuery-secretariaBlock');
    }

    // Formato esperado v9.5.0+: accion:tipo:refId (ej: tomar:retiro:uuid)
    // Soporte v8.0.0 (Fallback): accion_tipo_refId
    let action, type, refId;
    if (data.includes(':')) {
      [action, type, refId] = data.split(':');
    } else if (data.includes('_')) {
      const parts = data.split('_');
      // Mapeo manual para compatibilidad con botones antiguos
      if (parts[0] === 'retiro' || parts[0] === 'recarga') {
        type = parts[0];
        action = parts[1] === 'pagar' || parts[1] === 'aprobar' ? 'aceptar' : parts[1];
        refId = parts.slice(2).join('_');
      } else {
        [action, type, refId] = parts;
      }
    }

    if (!action || !refId) {
      logger.warn(`[TELEGRAM] Callback data malformado: ${data}`);
      return safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { 
        text: '⚠️ Este botón pertenece a una versión antigua y ya no es válido.', 
        show_alert: true 
      }), 'answerCallbackQuery-malformed');
    }

    const telegramUserId = String(from.id);
    const telegramUsername = from.username || 'User_' + telegramUserId.substring(0, 5);

    // 1. IDEMPOTENCIA (Redis)
    const isProcessed = await checkIdempotencyRedis(callbackId);
    if (isProcessed) {
      return safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { text: '⚠️ Acción ya procesada.' }), 'answerCallback-Idempotency');
    }

    try {
      // 2. IDENTIFICACIÓN DE ADMINISTRADOR (Abierto v10.4.0)
      // Buscamos si el usuario de Telegram está vinculado a un admin web
      let webAdmin = await queryOne(`
        SELECT id, nombre_usuario as nombre 
        FROM usuarios 
        WHERE (telegram_user_id = ? OR telegram_user_id = ?) AND rol = 'admin'
      `, [telegramUserId, from.username]);

      // Si no está vinculado, permitimos el acceso pero usamos un Admin de la DB para auditoría
      if (!webAdmin) {
        // Intentamos buscar cualquier admin activo para que la auditoría no falle
        webAdmin = await queryOne(`SELECT id, nombre_usuario as nombre FROM usuarios WHERE rol = 'admin' LIMIT 1`);
        
        // Si no hay NINGÚN admin en la DB (raro), usamos un ID genérico o fallamos con gracia
        if (!webAdmin) {
          logger.error('[TELEGRAM] No se encontró ningún administrador en la tabla usuarios.');
          return safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { 
            text: '❌ Error crítico: No hay administradores configurados en el sistema.', 
            show_alert: true 
          }), 'answerCallbackQuery-NoAdmins');
        }

        // Usamos el nombre de Telegram del operador para el registro visual
        webAdmin.nombre = telegramUsername;
        logger.info(`[TELEGRAM-AUTH] Operador externo detectado: ${telegramUsername} (${telegramUserId}). Usando Admin ID: ${webAdmin.id} para auditoría.`);
      }

      const adminId = webAdmin.id;
      const adminName = webAdmin.nombre;

      // 3. LOCK DISTRIBUIDO (Redlock)
      const lock = await acquireLock(`telegram:${refId}`, 15000);
      if (!lock) {
        return safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { text: '⏳ Procesando en otra instancia, espera...' }), 'answerCallback-Lock');
      }

      try {
        // 4. TRANSACCIÓN ATÓMICA CON BLOQUEO DE FILA
        await transaction(async (conn) => {
          const [casoRows] = await conn.query(
            'SELECT * FROM telegram_casos_bloqueo WHERE referencia_id = ? FOR UPDATE', 
            [refId]
          );
          let caso = casoRows[0];

          if (!caso) {
            const opType = type || (data.includes('retiro') ? 'retiro' : 'recarga');
            await conn.query(
              'INSERT INTO telegram_casos_bloqueo (referencia_id, tipo_operacion, estado_operativo) VALUES (?, ?, "pendiente")',
              [refId, opType]
            );
            [caso] = await conn.query('SELECT * FROM telegram_casos_bloqueo WHERE referencia_id = ? FOR UPDATE', [refId]);
          }

          if (action === 'tomar') {
            // Permitir tomar incluso si ya está tomado (para permitir re-asignación libre v10.4.0)
            if (caso.estado_operativo === 'resuelto') {
              throw new Error(`Este caso ya fue resuelto por otro operador.`);
            }

            // Marcar como tomado en bloqueo (actualiza el responsable actual)
            await conn.query(`
              UPDATE telegram_casos_bloqueo 
              SET estado_operativo = 'tomado', 
                  tomado_por = ?, 
                  tomado_at = ?, 
                  telegram_message_id = ?
              WHERE referencia_id = ?
            `, [telegramUserId, boliviaTime.now(), String(message.message_id), refId]);

            // Actualizar estado_operativo en la tabla real
            const table = caso.tipo_operacion === 'retiro' ? 'retiros' : 'compras_nivel';
            await conn.query(`
              UPDATE ${table} SET 
                estado_operativo = 'tomado', 
                taken_by_admin_id = ?, 
                taken_by_admin_name = ?, 
                taken_at = ?
              WHERE id = ?`, 
              [adminId, adminName, boliviaTime.now(), refId]
            );

            await safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { text: `✅ Caso tomado por ${adminName}.` }), 'answerCallbackQuery-tomar');
            await updateTelegramMessage(bot, message, 'tomado', adminName, refId, caso.tipo_operacion);
          }

          else if (action === 'aceptar' || action === 'rechazar') {
            if (caso.estado_operativo !== 'tomado') {
              throw new Error('Debes tomar el caso antes de resolverlo.');
            }
            // Eliminada la restricción de "solo el que tomó puede resolver" para permitir gestión libre v10.4.0
            
            const isAceptar = action === 'aceptar';
            const opType = caso.tipo_operacion;

            if (opType === 'retiro') {
              if (isAceptar) {
                await approveRetiro(refId, adminId);
              } else {
                await rejectRetiro(refId, adminId, 'Rechazado desde Telegram');
              }
            } else {
              if (isAceptar) {
                // VALIDACIÓN DE JERARQUÍA ANTES DE APROBAR EN TELEGRAM
                const levels = await getLevels();
                const compra = await getRecargaById(refId);
                if (!compra) throw new Error('Orden de recarga no encontrada.');

                const targetLevel = levels.find(l => l.id === compra.nivel_id);
                const user = await queryOne('SELECT * FROM usuarios WHERE id = ?', [compra.usuario_id]);
                const currentLevel = levels.find(l => l.id === user.nivel_id);

                if (currentLevel && targetLevel && targetLevel.orden < currentLevel.orden) {
                  throw new Error(`No se puede bajar de nivel. El usuario ya es ${currentLevel.nombre}.`);
                }

                await approveLevelPurchase(refId, adminId);
                // Notificar comisiones (async)
                if (compra) distributeInvestmentCommissions(compra.usuario_id, compra.monto);
              } else {
                await conn.query(
                  `UPDATE compras_nivel SET estado = 'rechazada', procesado_por = ?, procesado_at = NOW() WHERE id = ?`,
                  [adminId, refId]
                );
              }
            }

            // Marcar como resuelto en bloqueo
            await conn.query(
              `UPDATE telegram_casos_bloqueo SET estado_operativo = 'resuelto', resuelto_at = ? WHERE referencia_id = ?`,
              [boliviaTime.now(), refId]
            );

            await safeTelegramCall(() => bot.answerCallbackQuery(callbackId, { text: `✅ Caso ${action}do correctamente.` }), 'answerCallbackQuery-resolver');
            await updateTelegramMessage(bot, message, 'resuelto', adminName, refId, opType, action);
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
