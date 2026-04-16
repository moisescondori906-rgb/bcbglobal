import { botAdmin, botRetiros, botSecretaria } from './telegramBot.js';
import { WithdrawalRepository, TelegramUserRepository } from '../repositories/telegramRepository.js';
import { WithdrawalService } from '../services/withdrawalService.js';
import worker from '../services/TelegramWorker.js';
import { query } from '../config/db.js';

// Cache para Rate Limit por usuario (10 acciones por minuto)
const userRateLimits = new Map();

/**
 * handleCallbackQuery - Punto de entrada único para callbacks de los 3 bots.
 * Implementa blindaje anti-spam, seguridad Fintech y manejo de errores robusto.
 */
export const handleCallbackQuery = async (bot, queryData) => {
  const { data, message, from } = queryData;
  if (!data || !from) return;

  const [accion, id] = data.split('_');
  const userId = from.id;
  const userName = from.first_name || from.username || 'Operador';

  try {
    // 1. Validación de ID
    if (!id || isNaN(id)) {
      return bot.answerCallbackQuery(queryData.id, { text: "❌ ID de retiro inválido", show_alert: true });
    }

    // 2. Anti-Spam (Rate Limit)
    const now = Date.now();
    const userRequests = userRateLimits.get(userId) || [];
    const recentRequests = userRequests.filter(ts => now - ts < 60000);
    
    if (recentRequests.length >= 10) {
      await query(
        `INSERT INTO seguridad_logs (telegram_id, accion, resultado, detalles) 
         VALUES (?, 'rate_limit', 'rate_limit', 'Excedió 10 acciones/min')`,
        [userId]
      );
      return bot.answerCallbackQuery(queryData.id, { 
        text: "⚠️ PROTECCIÓN ANTI-SPAM: Has realizado demasiadas acciones. Espera un minuto.", 
        show_alert: true 
      });
    }
    recentRequests.push(now);
    userRateLimits.set(userId, recentRequests);

    // 3. Seguridad Fintech (Operador Autorizado)
    const user = await TelegramUserRepository.findById(userId);
    
    if (!user) {
      await worker.sendCriticalAlert(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, "Intento No Autorizado", `Usuario: ${userName} (${userId})\nAcción: ${accion}\nID: ${id}`);
      return bot.answerCallbackQuery(queryData.id, { text: "❌ ACCESO DENEGADO: Tu ID no está registrado.", show_alert: true });
    }

    if (user.activo === 0 || user.intentos_fallidos >= 5) {
      await TelegramUserRepository.blockUser(userId, "Exceso de fallos o inactivo");
      return bot.answerCallbackQuery(queryData.id, { text: "🔒 CUENTA BLOQUEADA: Contacta al administrador.", show_alert: true });
    }

    // 4. Control por Roles
    if (user.rol === 'secretaria') {
      return bot.answerCallbackQuery(queryData.id, { text: "⚠️ SOLO LECTURA: Tu rol no permite interacciones.", show_alert: true });
    }

    if (user.rol === 'retiro' && !['tomar', 'aprobar', 'rechazar'].includes(accion)) {
      return bot.answerCallbackQuery(queryData.id, { text: "❌ Acción no permitida para tu equipo.", show_alert: true });
    }

    // 5. Ejecución de Lógica de Negocio
    if (accion === 'tomar') {
      await WithdrawalService.takeWithdrawal(id, { userId, userName });
      const withdrawal = await WithdrawalRepository.findByIdWithLevel(id);
      const text = formatRobustMessage(withdrawal, `🔒 Tomado por: ${userName}`);
      await syncMessageAcrossGroups(withdrawal, text, id, true);
      return bot.answerCallbackQuery(queryData.id, { text: "✅ Has tomado el retiro" });
    }

    if (accion === 'aprobar' || accion === 'rechazar') {
      const nuevoEstado = await WithdrawalService.processWithdrawal(id, accion, { userId, userName });
      const withdrawal = await WithdrawalRepository.findByIdWithLevel(id);
      const emoji = nuevoEstado === 'aprobado' ? '✅' : '❌';
      const text = formatRobustMessage(withdrawal, `${emoji} ${nuevoEstado.toUpperCase()} por: ${userName}`);
      await syncMessageAcrossGroups(withdrawal, text, id, false);
      return bot.answerCallbackQuery(queryData.id, { text: `✅ Caso ${nuevoEstado.toUpperCase()} correctamente` });
    }

  } catch (err) {
    console.error("❌ TELEGRAM CALLBACK ERROR:", err.message);
    await worker.sendCriticalAlert(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, "Error en Callback", `Error: ${err.message}\nUsuario: ${userName}\nAcción: ${accion}`);
    bot.answerCallbackQuery(queryData.id, { text: `❌ ERROR: ${err.message}`, show_alert: true }).catch(() => {});
  }
};

/**
 * Reconstruye el mensaje desde DB (Robusto)
 */
const formatRobustMessage = (withdrawal, footer = "") => {
  return `📌 <b>SISTEMA DE RETIROS FINTECH</b>\n\n` +
    `🆔 ID: <b>${withdrawal.id}</b>\n` +
    `👤 Usuario: ${withdrawal.telefono_usuario}\n` +
    `🏅 Nivel: ${withdrawal.nivel_nombre}\n` +
    `💵 Monto: <b>${withdrawal.monto} Bs</b>\n` +
    `🕒 Solicitado: ${new Date(withdrawal.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}\n\n` +
    `${footer}`;
};

/**
 * Sincroniza el estado del mensaje en todos los grupos.
 */
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
      const options = { chat_id: g.cid, message_id: g.mid, parse_mode: 'HTML' };
      if (keyboard) options.reply_markup = keyboard;
      
      // Usar el worker para asegurar que la edición se realice sin saturar la API
      worker.addToQueue(g.b, g.cid, text, { 
        edit_message_id: g.mid, 
        reply_markup: keyboard 
      });
    }
  }
};
