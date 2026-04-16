import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

// Inicialización de múltiples bots
export const botAdmin = process.env.TELEGRAM_BOT_TOKEN_ADMIN 
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_ADMIN, { polling: true }) 
  : null;

export const botRetiros = process.env.TELEGRAM_BOT_TOKEN_RETIROS 
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_RETIROS, { polling: true }) 
  : null;

export const botSecretaria = process.env.TELEGRAM_BOT_TOKEN_SECRETARIA 
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_SECRETARIA, { polling: true }) 
  : null;

console.log("Sistema Multi-Bot iniciado (Admin, Retiros, Secretaria)");

// Funciones de utilidad mejoradas para multi-bot
export const sendToAdmin = async (message, options = {}) => {
  if (!botAdmin) return false;
  try {
    const opts = { parse_mode: 'HTML', ...options };
    const res = await botAdmin.sendMessage(process.env.TELEGRAM_CHAT_ADMIN, message, opts);
    console.log("✅ Admin: Mensaje enviado");
    return res;
  } catch (e) {
    console.error("❌ Admin Error:", e.message);
    return false;
  }
};

export const sendToRetiros = async (message, options = {}) => {
  if (!botRetiros) return false;
  try {
    const opts = { parse_mode: 'HTML', ...options };
    const res = await botRetiros.sendMessage(process.env.TELEGRAM_CHAT_RETIROS, message, opts);
    console.log("✅ Retiros: Mensaje enviado");
    return res;
  } catch (e) {
    console.error("❌ Retiros Error:", e.message);
    return false;
  }
};

export const sendToSecretaria = async (message, options = {}) => {
  if (!botSecretaria) return false;
  try {
    const opts = { parse_mode: 'HTML', ...options };
    const res = await botSecretaria.sendMessage(process.env.TELEGRAM_CHAT_SECRETARIA, message, opts);
    console.log("✅ Secretaria: Mensaje enviado");
    return res;
  } catch (e) {
    console.error("❌ Secretaria Error:", e.message);
    return false;
  }
};

/**
 * Escuchador global de Callbacks para control de Retiros
 */
if (botAdmin) {
  botAdmin.on('callback_query', async (query) => {
    try {
      // 1. Parsear correctamente
      const { data, message, from } = query;
      if (!data) return;
      
      const [accion, id] = data.split('_');
      const userId = from.id;
      const userName = from.first_name || from.username || 'Operador';

      console.log("Acción:", accion, "Usuario:", userId);

      const { query: dbQuery, queryOne } = await import('../config/db.js');

      // 2. LÓGICA DE TOMAR
      if (accion === 'tomar') {
        const updateRes = await dbQuery(
          `UPDATE retiros SET estado_operativo='tomado', tomado_por=?, fecha_toma=NOW(), tomado_por_nombre=? 
           WHERE id=? AND estado_operativo='pendiente'`,
          [userId, userName, id]
        );

        if (updateRes.affectedRows === 0) {
          console.log(`⚠️ Ya fue tomado: Retiro ${id}`);
          return query.answer({ text: "⚠️ Este retiro ya fue tomado por otro operador", show_alert: true });
        }

        const syncText = `${message.text}\n\n🔒 <b>Tomado por:</b> ${userName}`;
        
        await botAdmin.editMessageText(syncText, {
          chat_id: message.chat.id,
          message_id: message.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Aprobar', callback_data: `aprobar_${id}` },
              { text: '❌ Rechazar', callback_data: `rechazar_${id}` }
            ]]
          }
        });

        // Sincronizar otros grupos
        const retiro = await queryOne(`SELECT msg_id_retiros, msg_id_secretaria FROM retiros WHERE id=?`, [id]);
        if (botRetiros && retiro?.msg_id_retiros) {
          await botRetiros.editMessageText(syncText, { chat_id: process.env.TELEGRAM_CHAT_RETIROS, message_id: retiro.msg_id_retiros, parse_mode: 'HTML' }).catch(() => {});
        }
        if (botSecretaria && retiro?.msg_id_secretaria) {
          await botSecretaria.editMessageText(syncText, { chat_id: process.env.TELEGRAM_CHAT_SECRETARIA, message_id: retiro.msg_id_secretaria, parse_mode: 'HTML' }).catch(() => {});
        }

        return query.answer({ text: "✅ Has tomado el retiro" });
      }

      // 3. LÓGICA DE APROBAR / RECHAZAR
      if (accion === 'aprobar' || accion === 'rechazar') {
        const retiro = await queryOne(`SELECT tomado_por, estado_operativo, msg_id_retiros, msg_id_secretaria FROM retiros WHERE id=?`, [id]);
        
        if (!retiro) return query.answer({ text: "❌ Retiro no encontrado", show_alert: true });

        // Verificar que el operador sea quien lo tomó
        if (retiro.tomado_por != userId) {
          return query.answer({ text: "❌ No autorizado. Solo quien tomó el retiro puede procesarlo.", show_alert: true });
        }

        // Bloquear doble acción (verificar estado)
        if (retiro.estado_operativo !== 'tomado') {
          return query.answer({ text: "⚠️ Este retiro ya no está en estado 'tomado'", show_alert: true });
        }

        const nuevoEstado = accion === 'aprobar' ? 'aprobado' : 'rechazado';
        const emoji = accion === 'aprobar' ? '✅' : '❌';
        const finalStatus = accion === 'aprobar' ? 'completado' : 'rechazado';

        await dbQuery(
          `UPDATE retiros SET estado_operativo=?, procesado_por=?, fecha_procesado=NOW(), estado=? WHERE id=?`,
          [nuevoEstado, userId, finalStatus, id]
        );

        const finalSyncText = `${message.text}\n\n${emoji} <b>${nuevoEstado.toUpperCase()} por:</b> ${userName}`;

        await botAdmin.editMessageText(finalSyncText, {
          chat_id: message.chat.id,
          message_id: message.message_id,
          parse_mode: 'HTML'
        });

        if (botRetiros && retiro.msg_id_retiros) {
          await botRetiros.editMessageText(finalSyncText, { chat_id: process.env.TELEGRAM_CHAT_RETIROS, message_id: retiro.msg_id_retiros, parse_mode: 'HTML' }).catch(() => {});
        }
        if (botSecretaria && retiro.msg_id_secretaria) {
          await botSecretaria.editMessageText(finalSyncText, { chat_id: process.env.TELEGRAM_CHAT_SECRETARIA, message_id: retiro.msg_id_secretaria, parse_mode: 'HTML' }).catch(() => {});
        }

        return query.answer({ text: `✅ Retiro ${nuevoEstado} con éxito` });
      }

    } catch (err) {
      console.error("❌ ERROR CRÍTICO CALLBACK:", err.message);
      try { await query.answer({ text: "❌ Error: " + err.message, show_alert: true }); } catch (e) {}
    }
  });
}

export const formatRetiroMessage = (data) => {
  const { telefono, nivel, monto, hora } = data;
  return `📌 <b>NUEVO RETIRO</b>\n\n👤 Usuario: ${telefono}\n🏅 Nivel: ${nivel}\n💵 Monto: ${monto} Bs\n🕒 Hora: ${hora}`;
};

export const formatRecargaMessage = (data) => {
  const { telefono, nivel, monto } = data;
  return `📌 <b>NUEVA RECARGA</b>\n\n👤 Usuario: ${telefono}\n🏅 Nivel: ${nivel}\n💵 Monto: ${monto} Bs`;
};

// Exportar objeto por defecto para compatibilidad
export default {
  botAdmin,
  botRetiros,
  botSecretaria,
  sendToAdmin,
  sendToRetiros,
  sendToSecretaria,
  formatRetiroMessage,
  formatRecargaMessage
};
