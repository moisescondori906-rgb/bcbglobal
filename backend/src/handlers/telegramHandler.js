import { botAdmin, botRetiros, botSecretaria } from './telegramBot.js';
import { WithdrawalRepository, TelegramUserRepository } from '../repositories/telegramRepository.js';
import { WithdrawalService } from '../services/withdrawalService.js';
import { checkGlobalRateLimit, acquireLock, releaseLock } from '../services/redisService.js';
import worker from '../services/TelegramWorker.js';
import { query } from '../config/db.js';
import logger from '../lib/logger.js';

/**
 * handleCallbackQuery - Punto de entrada único para Webhooks.
 * Implementa Idempotencia, Locks Distribuidos y Rate Limit Global.
 */
export const handleCallbackQuery = async (bot, queryData) => {
  const { data, message, from } = queryData;
  if (!data || !from) return;

  const [accion, id] = data.split('_');
  const userId = from.id;
  const userName = from.first_name || from.username || 'Operador';

  try {
    // 1. Idempotencia & Locks Distribuidos (Redis)
    // Evita que dos instancias o dos clics rápidos procesen lo mismo
    const lockKey = `callback:${id}:${accion}`;
    const hasLock = await acquireLock(lockKey, 10000); // 10s lock
    if (!hasLock) {
      return bot.answerCallbackQuery(queryData.id, { text: "⚠️ Procesando... por favor espera.", show_alert: false });
    }

    // 2. Rate Limit Global (Redis)
    const isAllowed = await checkGlobalRateLimit(userId);
    if (!isAllowed) {
      await query(
        `INSERT INTO seguridad_logs (telegram_id, accion, resultado, detalles) 
         VALUES (?, 'rate_limit', 'rate_limit', 'Excedió 10 acciones/min (Redis Global)')`,
        [userId]
      );
      await releaseLock(lockKey);
      return bot.answerCallbackQuery(queryData.id, { text: "⚠️ Límite excedido. Espera un minuto.", show_alert: true });
    }

    // 3. Seguridad & Roles
    const user = await TelegramUserRepository.findById(userId);
    if (!user || user.activo === 0 || user.intentos_fallidos >= 5) {
      await releaseLock(lockKey);
      return bot.answerCallbackQuery(queryData.id, { text: "🔒 Acceso denegado o cuenta bloqueada.", show_alert: true });
    }
    if (user.rol === 'secretaria') {
      await releaseLock(lockKey);
      return bot.answerCallbackQuery(queryData.id, { text: "⚠️ Solo lectura.", show_alert: true });
    }

    // 4. Lógica de Negocio (Servicio Transaccional)
    if (accion === 'tomar') {
      await WithdrawalService.takeWithdrawal(id, { userId, userName });
      const withdrawal = await WithdrawalRepository.findByIdWithLevel(id);
      const text = formatRobustMessage(withdrawal, `🔒 Tomado por: ${userName}`);
      await syncMessageAcrossGroups(withdrawal, text, id, true);
      await bot.answerCallbackQuery(queryData.id, { text: "✅ Has tomado el retiro" });
    } else if (accion === 'aprobar' || accion === 'rechazar') {
      const nuevoEstado = await WithdrawalService.processWithdrawal(id, accion, { userId, userName });
      const withdrawal = await WithdrawalRepository.findByIdWithLevel(id);
      const emoji = nuevoEstado === 'aprobado' ? '✅' : '❌';
      const text = formatRobustMessage(withdrawal, `${emoji} ${nuevoEstado.toUpperCase()} por: ${userName}`);
      await syncMessageAcrossGroups(withdrawal, text, id, false);
      await bot.answerCallbackQuery(queryData.id, { text: `✅ Caso ${nuevoEstado.toUpperCase()} correctamente` });
    }

    // Liberar lock tras éxito
    await releaseLock(lockKey);

  } catch (err) {
    logger.error(`[TELEGRAM-CALLBACK] ${err.message}`, { userId, id, accion });
    await bot.answerCallbackQuery(queryData.id, { text: `❌ ${err.message}`, show_alert: true }).catch(() => {});
  }
};

const formatRobustMessage = (withdrawal, footer = "") => {
  return `📌 <b>SISTEMA FINTECH DISTRIBUIDO</b>\n\n` +
    `🆔 ID: <b>${withdrawal.id}</b>\n` +
    `👤 Usuario: ${withdrawal.telefono_usuario}\n` +
    `🏅 Nivel: ${withdrawal.nivel_nombre}\n` +
    `💵 Monto: <b>${withdrawal.monto} Bs</b>\n` +
    `🕒 Solicitado: ${new Date(withdrawal.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}\n\n` +
    `${footer}`;
};

const syncMessageAcrossGroups = async (withdrawal, text, id, withButtons = false) => {
  const keyboard = withButtons ? {
    inline_keyboard: [[
      { text: '✅ Aprobar', callback_data: `aprobar_${id}` },
      { text: '❌ Rechazar', callback_data: `rechazar_${id}` }
    ]]
  } : null;

  const groups = [
    { b: botAdmin, cid: process.env.TELEGRAM_CHAT_ADMIN, mid: withdrawal.msg_id_admin },
    { b: botRetiros, cid: process.env.TELEGRAM_CHAT_RETIROS, mid: withdrawal.msg_id_retiros },
    { b: botSecretaria, cid: process.env.TELEGRAM_CHAT_SECRETARIA, mid: withdrawal.msg_id_secretaria }
  ];

  for (const g of groups) {
    if (g.b && g.mid) {
      // Usar import dinámico para evitar circularidad si es necesario, 
      // pero aquí usamos el worker directamente que ya maneja la cola.
      const { enqueueTelegramMessage } = await import('../services/BullMQService.js');
      await enqueueTelegramMessage(g.b.token, g.cid, text, { 
        edit_message_id: g.mid, 
        reply_markup: keyboard 
      });
    }
  }
};
