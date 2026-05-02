import { 
  getRecargaById, updateRecarga, 
  getRetiroById, updateRetiro, 
  findUserById, updateUser,
  getLevels, handleLevelUpRewards,
  createMovimiento, boliviaTime,
  findAdminByTelegramId, getDailyWithdrawalSummary,
  distributeInvestmentCommissions
} from '../services/dbService.mjs';
import { 
  sendToSecretaria, 
  formatRecargaMessage, 
  formatRetiroMessage 
} from '../services/telegramBot.mjs';
import logger, { createModuleLogger } from '../utils/logger.mjs';
import { safeTelegram, safeAsync } from '../utils/safe.mjs';

const telegramLogicLogger = createModuleLogger('TELEGRAM-LOGIC');

export async function processTelegramUpdate(update) {
  return await safeAsync(async () => {
    const { callback_query, message: incomingMessage } = update;
    
    // 1. Manejo de comandos (Resumen Diario) - BLINDADO v8.1.0
    if (incomingMessage && incomingMessage.text?.startsWith('/resumen')) {
      return safeTelegram(() => handleDailySummary(incomingMessage), 'handleDailySummary-Command');
    }

    if (!callback_query) return;

    const { data, message, id: callbackQueryId, from: telegramUser } = callback_query;
    const chatId = message.chat.id;
    const messageId = message.message_id;

    telegramLogicLogger.info(`Procesando click: ${data} de usuario ${telegramUser.id}`);

    const parts = data.split('_');
    const type = parts[0];
    const action = parts[1];
    const id = parts.slice(2).join('_');

    // 2. VALIDACIÓN DE ADMINISTRADOR
    const admin = await findAdminByTelegramId(telegramUser.id);
    
    if (!admin) {
      logger.warn(`[TELEGRAM-LOGIC] ACCESO DENEGADO: ${telegramUser.id}`);
      return safeTelegram(() => answerCallback(callbackQueryId, '❌ No tienes permisos para realizar esta acción.'), 'answerCallback-Denied');
    }

    const adminName = admin.nombre || admin.nombre_usuario || admin.nombre_real;
    logger.info(`[Telegram Logic] Admin identificado: ${adminName} (ID DB: ${admin.id})`);

    // --- MÓDULO DE RETIROS ---
    if (type === 'retiro') {
      logger.info(`[Telegram Logic] Acción de Retiro: ${action} para ID: ${id}`);
      const retiro = await getRetiroById(id);
      if (!retiro) {
        logger.error(`[Telegram Logic] Retiro no encontrado: ${id}`);
        return answerCallback(callbackQueryId, 'Retiro no encontrado.');
      }

      // ACCIÓN: TOMAR RETIRO
      if (action === 'tomar') {
        if (retiro.estado !== 'pendiente') {
          const taker = retiro.taken_by_admin_name || 'otro administrador';
          return safeTelegram(() => answerCallback(callbackQueryId, `⚠️ Este retiro ya está siendo ejecutado por ${taker}.`), 'answerCallback-Taken');
        }

        await updateRetiro(id, { 
          estado: 'en_proceso',
          taken_by_admin_id: admin.id,
          taken_by_admin_name: adminName,
          taken_at: boliviaTime.getISOString(),
          telegram_message_id: String(messageId),
          telegram_chat_id: String(chatId)
        });

        const statusMsg = `⏳ EN PROCESO\n👤 Tomado por: ${adminName}\n🕒 Hora: ${new Date().toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' })}`;
        const buttons = {
          inline_keyboard: [[
            { text: '✅ Marcar como Pagado', callback_data: `retiro_pagar_${id}` },
            { text: '❌ Rechazar', callback_data: `retiro_rechazar_${id}` }
          ]]
        };
        
        // Sincronizar todos los mensajes
        const metadata = retiro.telegram_metadata || [];
        if (metadata.length > 0) {
          for (const item of metadata) {
            await editTelegramMessage(item.chat_id, item.message_id, message.text || message.caption, statusMsg, buttons);
          }
        } else {
          await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg, buttons);
        }
        
        logger.info(`[TELEGRAM-LOGIC] Retiro ${id} tomado por ${adminName}`);
        return safeTelegram(() => answerCallback(callbackQueryId, '✅ Retiro asignado. Procede con el pago.'), 'answerCallback-Success');
      }

      // ACCIÓN: PAGAR O RECHAZAR
      if (action === 'pagar' || action === 'rechazar') {
        // VALIDACIÓN: Solo el admin que tomó el retiro
        if (retiro.taken_by_admin_id && retiro.taken_by_admin_id !== admin.id) {
          return safeTelegram(() => answerCallback(callbackQueryId, `⚠️ Solo ${retiro.taken_by_admin_name} puede finalizar este retiro.`), 'answerCallback-WrongAdmin');
        }

        if (action === 'pagar') {
          await updateRetiro(id, { 
            estado: 'pagado',
            processed_by_admin_id: admin.id,
            processed_by_admin_name: adminName,
            processed_at: boliviaTime.getISOString()
          });
          
          const statusMsg = `✅ PAGADO por ${adminName}`;
          
          // Notificar a Secretaria
          const user = await findUserById(retiro.usuario_id);
          sendToSecretaria(`<b>✅ RETIRO PAGADO</b>\n👤 Usuario: <code>${user.telefono}</code>\n💵 Monto: <code>${retiro.monto} BOB</code>\n👨‍💼 Admin: ${adminName}`);

          const metadata = retiro.telegram_metadata || [];
          if (metadata.length > 0) {
            for (const item of metadata) {
              await editTelegramMessage(item.chat_id, item.message_id, message.text || message.caption, statusMsg);
            }
          } else {
            await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);
          }
          
          logger.info(`[Telegram Logic] Retiro ${id} pagado por ${adminName}`);
        } else {
          // VALIDACIÓN DE ESTADO: Evitar reembolsos dobles
          if (retiro.estado === 'rechazado') {
            return answerCallback(callbackQueryId, '⚠️ Este retiro ya fue rechazado anteriormente.');
          }

          const user = await findUserById(retiro.usuario_id);
          const updates = {};
          if (retiro.tipo_billetera === 'comisiones') {
            updates.saldo_comisiones = Number(((Number(user.saldo_comisiones) || 0) + Number(retiro.monto)).toFixed(2));
          } else {
            updates.saldo_principal = Number(((Number(user.saldo_principal) || 0) + Number(retiro.monto)).toFixed(2));
          }
          
          // Primero actualizamos el estado del retiro para bloquear futuros clics
          await updateRetiro(id, { 
            estado: 'rechazado',
            rejected_by_admin_id: admin.id,
            rejected_by_admin_name: adminName,
            rejected_at: boliviaTime.getISOString()
          });
          
          // Luego devolvemos el saldo
          await updateUser(user.id, updates);
          
          // Crear movimiento de auditoría
          await createMovimiento({
            usuario_id: user.id,
            tipo_movimiento: 'ajuste_admin',
            monto: Number(retiro.monto),
            descripcion: `Reembolso por retiro rechazado (${id.substring(0,8)})`,
            referencia: `REJ-${id.substring(0,8)}`,
            fecha: boliviaTime.getISOString()
          });

          const statusMsg = `❌ RECHAZADO por ${adminName} (Saldo devuelto)`;

          // Notificar a Secretaria
          const userObj = await findUserById(retiro.usuario_id);
          sendToSecretaria(`<b>❌ RETIRO RECHAZADO</b>\n👤 Usuario: <code>${userObj.telefono}</code>\n💵 Monto: <code>${retiro.monto} BOB</code>\n👨‍💼 Admin: ${adminName}`);

          const metadata = retiro.telegram_metadata || [];
          if (metadata.length > 0) {
            for (const item of metadata) {
              await editTelegramMessage(item.chat_id, item.message_id, message.text || message.caption, statusMsg);
            }
          } else {
            await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);
          }
          
          logger.info(`[TELEGRAM-LOGIC] Retiro ${id} rechazado por ${adminName}`);
        }
        return safeTelegram(() => answerCallback(callbackQueryId, 'Operación finalizada.'), 'answerCallback-Done');
      }
    }

    // --- MÓDULO DE RECARGAS ---
    if (type === 'recarga') {
      logger.info(`[TELEGRAM-LOGIC] Acción de Recarga: ${action} para ID: ${id}`);
      const recarga = await getRecargaById(id);
      if (!recarga || (recarga.estado !== 'pendiente' && recarga.estado !== 'pendiente_ascenso')) {
        logger.error(`[TELEGRAM-LOGIC] Recarga no encontrada o no pendiente: ${id}`);
        return safeTelegram(() => answerCallback(callbackQueryId, 'Esta solicitud ya no está pendiente.'), 'answerCallback-RecargaDone');
      }

      if (action === 'aprobar') {
        const user = await findUserById(recarga.usuario_id);
        const niveles = await getLevels();
        const nivelDestino = niveles.find(n => (n.deposito || n.costo) === recarga.monto);
        const nivelActual = niveles.find(n => n.id === user.nivel_id);

        let statusMsg = '';
        if (recarga.modo === 'Compra VIP' && nivelDestino) {
          const updates = { nivel_id: nivelDestino.id };
          if (nivelActual && (nivelActual.deposito > 0 || nivelActual.costo > 0)) {
            const montoADevolver = nivelActual.deposito || nivelActual.costo;
            updates.saldo_comisiones = Number((Number(user.saldo_comisiones || 0) + montoADevolver).toFixed(2));
            await createMovimiento({
              usuario_id: user.id,
              tipo_movimiento: 'ajuste_admin',
              monto: montoADevolver,
              descripcion: `Reembolso de inversión anterior (${nivelActual.nombre}) por ascenso`,
              referencia: `REF-${id.substring(0,8)}`,
              fecha: boliviaTime.now().toISOString()
            });
          }
          await updateUser(user.id, updates);
          await updateRecarga(id, { 
            estado: 'aprobada', 
            procesado_por_admin_id: admin.id, 
            procesado_por_admin_name: adminName,
            procesado_at: boliviaTime.getISOString() 
          });
          await handleLevelUpRewards(user.id, user.nivel_id, nivelDestino.id);
          // Distribuir comisiones por ascenso (Inversión)
          await distributeInvestmentCommissions(user.id, recarga.monto);
          statusMsg = `✅ Ascenso Aprobado por ${adminName} a ${nivelDestino.nombre}`;
          logger.info(`[Telegram Logic] Recarga (VIP) ${id} aprobada por ${adminName}`);
        } else {
          await createMovimiento({
            usuario_id: user.id,
            tipo_movimiento: 'ajuste_admin',
            monto: recarga.monto,
            descripcion: `Recarga de saldo aprobada`,
            referencia: `REC-${id.substring(0,8)}`,
            fecha: boliviaTime.getISOString()
          });
          const nuevoSaldo = Number((Number(user.saldo_principal || 0) + recarga.monto).toFixed(2));
          await updateUser(user.id, { saldo_principal: nuevoSaldo });
          await updateRecarga(id, { 
            estado: 'aprobada', 
            procesado_por_admin_id: admin.id, 
            procesado_por_admin_name: adminName,
            processed_at: boliviaTime.getISOString() 
          });
          // Distribuir comisiones por recarga de saldo (Inversión)
          await distributeInvestmentCommissions(user.id, recarga.monto);
          statusMsg = `✅ Recarga Aprobada por ${adminName}`;
          
          // Notificar a Secretaria
          sendToSecretaria(`<b>✅ RECARGA APROBADA</b>\n👤 Usuario: <code>${user.telefono}</code>\n💵 Monto: <code>${recarga.monto} BOB</code>\n👨‍💼 Admin: ${adminName}\n🕒 Fecha: ${boliviaTime.getISOString()}`);
          
          logger.info(`[TELEGRAM-LOGIC] Recarga (Saldo) ${id} aprobada por ${adminName}`);
        }

        const metadata = recarga.telegram_metadata || [];
        if (metadata.length > 0) {
          for (const item of metadata) {
            await editTelegramMessage(item.chat_id, item.message_id, message.text || message.caption, statusMsg);
          }
        } else {
          await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);
        }
        return safeTelegram(() => answerCallback(callbackQueryId, '✅ Operación exitosa.'), 'answerCallback-AprobarSuccess');
      } else {
        const { motivo } = parts[3] ? { motivo: parts.slice(3).join('_') } : { motivo: 'Comprobante inválido o no legible.' };

        await updateRecarga(id, {
          estado: 'rechazada',
          procesado_por_admin_id: admin.id,
          procesado_por_admin_name: adminName,
          admin_notas: motivo,
          procesado_at: boliviaTime.getISOString()
        });

        const statusMsg = `❌ RECHAZADA por ${adminName}\n📝 Motivo: ${motivo}`;

        // Notificar a Secretaria
        const userRec = await findUserById(recarga.usuario_id);
        sendToSecretaria(`<b>❌ RECARGA RECHAZADA</b>\n👤 Usuario: <code>${userRec.telefono}</code>\n💵 Monto: <code>${recarga.monto} BOB</code>\n📝 Motivo: ${motivo}\n👨‍💼 Admin: ${adminName}`);

        const metadata = recarga.telegram_metadata || [];
        if (metadata.length > 0) {
          for (const item of metadata) {
            await editTelegramMessage(item.chat_id, item.message_id, message.text || message.caption, statusMsg);
          }
        } else {
          await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);
        }

        logger.info(`[TELEGRAM-LOGIC] Recarga ${id} rechazada por ${adminName}`);
        return safeTelegram(() => answerCallback(callbackQueryId, 'Recarga rechazada.'), 'answerCallback-RechazarSuccess');
      }
    }
  }, 'processTelegramUpdate');
}

async function handleDailySummary(message) {
  return await safeAsync(async () => {
    const admin = await findAdminByTelegramId(message.from.id);
    if (!admin) return;

    const token = process.env.TELEGRAM_RETIROS_TOKEN;
    if (!token) return;

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
    const summary = await getDailyWithdrawalSummary(today);

    let text = `<b>📊 RESUMEN DIARIO DE RETIROS (${today})</b>\n\n`;

    if (!summary || summary.total === 0) {
      text += "No se procesaron retiros el día de hoy.";
    } else {
      text += `   - Cantidad: ${summary.total} retiros\n`;
      text += `   - Total: ${Number(summary.monto || 0).toFixed(2)} BOB\n\n`;
      text += `💰 <b>TOTAL GENERAL: ${Number(summary.monto || 0).toFixed(2)} BOB</b>`;
    }

    await safeTelegram(async () => {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: text,
          parse_mode: 'HTML'
        })
      });
    }, 'handleDailySummary');
  }, 'handleDailySummary-Logic');
}

async function editTelegramMessage(chatId, messageId, oldText, statusText, replyMarkup = { inline_keyboard: [] }) {
  const tokens = [
    process.env.TELEGRAM_BOT_TOKEN_ADMIN,
    process.env.TELEGRAM_BOT_TOKEN_RETIROS,
    process.env.TELEGRAM_BOT_TOKEN_RECARGAS
  ].filter(Boolean);

  const cleanOldText = oldText?.replace(/📢 <b>.*?<\/b>/g, '').trim();
  const newText = `${cleanOldText}\n\n📢 <b>${statusText}</b>`;

  for (const token of tokens) {
    await safeTelegram(async () => {
      // Intentar primero con Caption (para fotos de QR o comprobantes)
      const resCaption = await fetch(`https://api.telegram.org/bot${token}/editMessageCaption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          caption: newText,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        })
      });

      if (!resCaption.ok) {
        // Si falla Caption, intentar con Text
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: newText,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          })
        });
      }
    }, `editTelegramMessage-${token.substring(0, 5)}`);
  }
}

async function answerCallback(callbackQueryId, text) {
  const tokens = [
    process.env.TELEGRAM_BOT_TOKEN_ADMIN,
    process.env.TELEGRAM_BOT_TOKEN_RETIROS,
    process.env.TELEGRAM_BOT_TOKEN_RECARGAS
  ].filter(Boolean);

  for (const token of tokens) {
    const success = await safeTelegram(async () => {
      const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text,
          show_alert: false
        })
      });
      return res.ok;
    }, `answerCallback-${token.substring(0, 5)}`);
    
    if (success) break; // Si tuvo éxito con un token, ya está respondido
  }
}
