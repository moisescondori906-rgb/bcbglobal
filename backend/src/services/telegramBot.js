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
 * Escuchador global de Callbacks para los 3 Bots (Admin, Retiros, Secretaria)
 */
[botAdmin, botRetiros, botSecretaria].forEach(bot => {
  if (!bot) return;

  bot.on('callback_query', async (query) => {
    try {
      // 1. Validaciones iniciales
      if (!query || !query.data || !query.message) {
        return query.answer();
      }

      const { data, message, from } = query;
      const [accion, id] = data.split('_');

      if (!id || isNaN(id)) {
        return query.answer({ text: "❌ ID inválido", show_alert: true });
      }

      const userId = from.id;
      const userName = from.first_name || from.username || 'Operador';

      // 2. Importar DB dinámicamente
      const { query: dbQuery, queryOne } = await import('../config/db.js');

      // --- VALIDACIÓN DE ROLES DINÁMICOS ---
      const userTelegram = await queryOne(
        `SELECT rol FROM usuarios_telegram WHERE telegram_id=? AND activo=1`,
        [userId]
      );

      if (!userTelegram) {
        console.log(`[TELEGRAM] Acceso bloqueado: ${userName} (${userId}) no registrado o inactivo.`);
        return query.answer({ 
          text: "❌ No autorizado. Tu ID de Telegram no está registrado como operador activo.", 
          show_alert: true 
        });
      }

      const rol = userTelegram.rol;
      console.log(`[TELEGRAM] Acción: ${accion} | Operador: ${userName} | Rol: ${rol}`);

      // REGLAS DE ROLES:
      // - admin → todo
      // - retiro → tomar, aprobar, rechazar
      // - secretaria → solo ver (bloquear cualquier callback operativo)
      if (rol === 'secretaria') {
        return query.answer({ text: "⚠️ Acceso Denegado: Tu rol es solo de lectura.", show_alert: true });
      }

      if (rol === 'retiro' && !['tomar', 'aprobar', 'rechazar'].includes(accion)) {
        return query.answer({ text: "❌ Error: Acción no permitida para el equipo de Retiros.", show_alert: true });
      }
      // -------------------------------------

      // 3. LÓGICA DE TOMAR RETIRO (BLOQUEO REAL)
      if (accion === 'tomar') {
        const updateRes = await dbQuery(
          `UPDATE retiros 
           SET estado_operativo='tomado', tomado_por=?, tomado_por_nombre=?, fecha_toma=NOW() 
           WHERE id=? AND estado_operativo='pendiente'`,
          [userId, userName, id]
        );

        if (updateRes.affectedRows === 0) {
          return query.answer({ 
            text: "⚠️ Este retiro ya fue tomado por otro operador", 
            show_alert: true 
          });
        }

        // --- REGISTRO EN HISTORIAL (AUDITORÍA) ---
        await dbQuery(
          `INSERT INTO historial_retiros (retiro_id, accion, usuario, telegram_id, detalles) 
           VALUES (?, 'tomar', ?, ?, 'Caso tomado desde Telegram')`,
          [id, userName, userId]
        );

        // 4. EDITAR MENSAJE (SEGURO)
        const newText = `${message.text}\n\n🔒 <b>Tomado por:</b> ${userName}`;
        
        try {
          await bot.editMessageText(newText, {
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
        } catch (e) {
          console.error("Error editando mensaje (Toma):", e.message);
        }

        // Sincronizar otros grupos si tienen message_ids guardados
        const retiro = await queryOne(`SELECT msg_id_admin, msg_id_retiros, msg_id_secretaria FROM retiros WHERE id=?`, [id]);
        
        const syncGroups = [
          { b: botAdmin, cid: process.env.TELEGRAM_CHAT_ADMIN, mid: retiro?.msg_id_admin },
          { b: botRetiros, cid: process.env.TELEGRAM_CHAT_RETIROS, mid: retiro?.msg_id_retiros },
          { b: botSecretaria, cid: process.env.TELEGRAM_CHAT_SECRETARIA, mid: retiro?.msg_id_secretaria }
        ];

        for (const g of syncGroups) {
          // No editamos el mensaje actual (ya se editó arriba)
          if (g.b && g.mid && g.mid !== message.message_id) {
            await g.b.editMessageText(newText, { chat_id: g.cid, message_id: g.mid, parse_mode: 'HTML' }).catch(() => {});
          }
        }

        return query.answer({ text: "✅ Has tomado el retiro" });
      }

      // 5. APROBAR / RECHAZAR (SEGURIDAD TOTAL)
      if (accion === 'aprobar' || accion === 'rechazar') {
        const retiro = await queryOne(
          `SELECT tomado_por, estado_operativo, msg_id_admin, msg_id_retiros, msg_id_secretaria FROM retiros WHERE id=?`, 
          [id]
        );

        if (!retiro) {
          return query.answer({ text: "❌ Retiro no encontrado", show_alert: true });
        }

        // Validar: Solo quien lo tomó puede procesar
        if (retiro.tomado_por != userId) {
          return query.answer({ text: "❌ No autorizado", show_alert: true });
        }

        // Validar estado: Debe estar en estado 'tomado'
        if (retiro.estado_operativo !== 'tomado') {
          return query.answer({ text: "⚠️ Ya procesado", show_alert: true });
        }

        const nuevoEstado = accion === 'aprobar' ? 'aprobado' : 'rechazado';
        const finalStatus = accion === 'aprobar' ? 'completado' : 'rechazado';
        const emoji = accion === 'aprobar' ? '✅' : '❌';

        await dbQuery(
          `UPDATE retiros 
           SET estado_operativo=?, procesado_por=?, fecha_procesado=NOW(), estado=? 
           WHERE id=?`,
          [nuevoEstado, userId, finalStatus, id]
        );

        // --- REGISTRO EN HISTORIAL (AUDITORÍA) ---
        await dbQuery(
          `INSERT INTO historial_retiros (retiro_id, accion, usuario, telegram_id, detalles) 
           VALUES (?, ?, ?, ?, ?)`,
          [id, nuevoEstado, userName, userId, `Retiro ${nuevoEstado} vía Telegram`]
        );

        // 6. MENSAJE FINAL
        const finalText = `${message.text}\n\n${emoji} <b>${nuevoEstado.toUpperCase()} por:</b> ${userName}`;

        try {
          await bot.editMessageText(finalText, {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML'
          });
        } catch (e) {
          console.error("Error final (Edición):", e.message);
        }

        // Sincronizar todos los grupos con el estado final
        const finalSyncGroups = [
          { b: botAdmin, cid: process.env.TELEGRAM_CHAT_ADMIN, mid: retiro.msg_id_admin },
          { b: botRetiros, cid: process.env.TELEGRAM_CHAT_RETIROS, mid: retiro.msg_id_retiros },
          { b: botSecretaria, cid: process.env.TELEGRAM_CHAT_SECRETARIA, mid: retiro.msg_id_secretaria }
        ];

        for (const g of finalSyncGroups) {
          if (g.b && g.mid && g.mid !== message.message_id) {
            await g.b.editMessageText(finalText, { chat_id: g.cid, message_id: g.mid, parse_mode: 'HTML' }).catch(() => {});
          }
        }

        return query.answer({ text: `✅ ${nuevoEstado.toUpperCase()} correctamente` });
      }

    } catch (err) {
      console.error("❌ ERROR CALLBACK:", err.message);
      try {
        await query.answer({ text: "❌ Error interno", show_alert: true });
      } catch {}
    }
  });
});

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
