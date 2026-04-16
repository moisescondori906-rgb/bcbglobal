import { botAdmin, botRetiros, botSecretaria, sendToAdmin, sendToRetiros, sendToSecretaria } from './telegramBot.js';
import { WithdrawalRepository, TelegramUserRepository } from '../repositories/telegramRepository.js';
import { WithdrawalService } from '../services/withdrawalService.js';
import worker from '../services/TelegramWorker.js';
import { query, queryOne } from '../config/db.js';

const userRateLimits = new Map();

export const handleCallbackQuery = async (bot, queryData) => {
  const { data, message, from } = queryData;
  const [accion, id] = data.split('_');
  const userId = from.id;
  const userName = from.first_name || from.username || 'Operador';

  try {
    if (!id || isNaN(id)) {
      return bot.answerCallbackQuery(queryData.id, { text: "❌ ID inválido", show_alert: true });
    }

    // Rate Limit
    const now = Date.now();
    const userRequests = userRateLimits.get(userId) || [];
    const recentRequests = userRequests.filter(ts => now - ts < 60000);
    if (recentRequests.length >= 10) {
      await query(
        `INSERT INTO seguridad_logs (telegram_id, accion, resultado, detalles) 
         VALUES (?, 'rate_limit_exceeded', 'bloqueo', 'Usuario excedió 10 acciones/min')`,
        [userId]
      );
      return bot.answerCallbackQuery(queryData.id, { 
        text: "⚠️ DEMASIADAS ACCIONES: Por favor, espera un minuto (Anti-Spam).", 
        show_alert: true 
      });
    }
    recentRequests.push(now);
    userRateLimits.set(userId, recentRequests);

    // Seguridad
    const user = await TelegramUserRepository.findById(userId);
    if (!user) {
      await worker.sendCriticalAlert(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, "Intento No Autorizado", `Usuario: ${userName} (${userId})\nAcción: ${accion}\nID: ${id}`);
      return bot.answerCallbackQuery(queryData.id, { text: "❌ ACCESO DENEGADO: Tu ID no está autorizado.", show_alert: true });
    }
    if (user.intentos_fallidos >= 5 || user.activo === 0) {
      await query(`UPDATE usuarios_telegram SET activo=0 WHERE telegram_id=?`, [userId]);
      return bot.answerCallbackQuery(queryData.id, { text: "🔒 CUENTA BLOQUEADA por seguridad.", show_alert: true });
    }
    await query(`UPDATE usuarios_telegram SET ultima_actividad=NOW() WHERE telegram_id=?`, [userId]);

    // Roles y Turnos
    if (user.rol === 'secretaria') return bot.answerCallbackQuery(queryData.id, { text: "⚠️ Solo Lectura.", show_alert: true });
    const ahora = new Date().toLocaleTimeString('es-BO', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const turno = await queryOne(`SELECT id FROM turnos_operadores WHERE telegram_id=? AND activo=1 AND ((hora_inicio <= hora_fin AND ? BETWEEN hora_inicio AND hora_fin) OR (hora_inicio > hora_fin AND (? >= hora_inicio OR ? <= hora_fin)))`, [userId, ahora, ahora, ahora]);
    if (!turno && user.rol !== 'admin') return bot.answerCallbackQuery(queryData.id, { text: `⏰ FUERA DE TURNO (${ahora}).`, show_alert: true });

    // Acciones
    if (accion === 'tomar') {
      await WithdrawalService.takeWithdrawal(id, { userId, userName });
      const withdrawal = await WithdrawalRepository.findByIdWithLevel(id);
      const text = `📌 <b>NUEVO RETIRO</b>\n\n👤 Usuario: ${withdrawal.telefono_usuario}\n🏅 Nivel: ${withdrawal.nivel_nombre}\n💵 Monto: ${withdrawal.monto} Bs\n🕒 Hora: ${new Date(withdrawal.created_at).toLocaleTimeString()}\n\n🔒 <b>Tomado por:</b> ${userName}`;
      await syncMessage(withdrawal, text, [[{ text: '✅ Aprobar', callback_data: `aprobar_${id}` }, { text: '❌ Rechazar', callback_data: `rechazar_${id}` }]]);
      return bot.answerCallbackQuery(queryData.id, { text: "✅ Has tomado el retiro" });
    }

    if (accion === 'aprobar' || accion === 'rechazar') {
      const nuevoEstado = await WithdrawalService.processWithdrawal(id, accion, { userId, userName });
      const withdrawal = await WithdrawalRepository.findByIdWithLevel(id);
      const emoji = nuevoEstado === 'aprobado' ? '✅' : '❌';
      const text = `📌 <b>RETIRO ${nuevoEstado.toUpperCase()}</b>\n\n👤 Usuario: ${withdrawal.telefono_usuario}\n🏅 Nivel: ${withdrawal.nivel_nombre}\n💵 Monto: ${withdrawal.monto} Bs\n🕒 Hora: ${new Date(withdrawal.created_at).toLocaleTimeString()}\n\n${emoji} <b>${nuevoEstado.toUpperCase()} por:</b> ${userName}`;
      await syncMessage(withdrawal, text);
      return bot.answerCallbackQuery(queryData.id, { text: `✅ ${nuevoEstado.toUpperCase()} correctamente` });
    }

  } catch (err) {
    console.error("❌ CALLBACK ERROR:", err.message);
    await worker.sendCriticalAlert(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, "Error en Callback", `Error: ${err.message}\nUsuario: ${userName}\nData: ${data}`);
    bot.answerCallbackQuery(queryData.id, { text: `❌ ${err.message}`, show_alert: true }).catch(() => {});
  }
};

const syncMessage = async (withdrawal, text, keyboard = null) => {
  const syncGroups = [
    { b: botAdmin, cid: process.env.TELEGRAM_CHAT_ADMIN, mid: withdrawal.msg_id_admin },
    { b: botRetiros, cid: process.env.TELEGRAM_CHAT_RETIROS, mid: withdrawal.msg_id_retiros },
    { b: botSecretaria, cid: process.env.TELEGRAM_CHAT_SECRETARIA, mid: withdrawal.msg_id_secretaria }
  ];
  for (const g of syncGroups) {
    if (g.b && g.mid) {
      const opts = { chat_id: g.cid, message_id: g.mid, parse_mode: 'HTML' };
      if (keyboard) opts.reply_markup = { inline_keyboard: keyboard };
      await g.b.editMessageText(text, opts).catch(() => {});
    }
  }
};
