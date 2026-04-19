import { 
  getRecargaById, updateRecarga, 
  getRetiroById, updateRetiro, 
  findUserById, updateUser,
  getLevels, handleLevelUpRewards,
  createMovimiento, boliviaTime,
  findAdminByTelegramId, getDailyWithdrawalSummary,
  distributeInvestmentCommissions
} from './queries.js';
import logger from './logger.js';
import { safeTelegramCall } from '../services/telegramBot.js';

export async function processTelegramUpdate(update) {
  const { callback_query, message: incomingMessage } = update;
  
  // 1. Manejo de comandos (Resumen Diario)
  if (incomingMessage && incomingMessage.text?.startsWith('/resumen')) {
    return handleDailySummary(incomingMessage);
  }

  if (!callback_query) return;

  const { data, message, id: callbackQueryId, from: telegramUser } = callback_query;
  const chatId = message.chat.id;
  const messageId = message.message_id;

  logger.info(`[Telegram Logic] Procesando click: ${data} de usuario ${telegramUser.id} (${telegramUser.username || 'sin user'})`);

  try {
    const parts = data.split('_');
    const type = parts[0];
    const action = parts[1];
    const id = parts.slice(2).join('_');

    logger.debug(`[Telegram Logic] Datos parseados - Tipo: ${type}, Acción: ${action}, ID: ${id}`);

    // 2. VALIDACIÓN DE ADMINISTRADOR
    logger.debug(`[Telegram Logic] Validando admin con Telegram ID: ${telegramUser.id}`);
    const admin = await findAdminByTelegramId(telegramUser.id);
    
    if (!admin) {
      logger.warn(`[Telegram Logic] ACCESO DENEGADO: El usuario ${telegramUser.id} no es un admin registrado.`);
      return answerCallback(callbackQueryId, '❌ No tienes permisos para realizar esta acción.');
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
          return answerCallback(callbackQueryId, `⚠️ Este retiro ya está siendo ejecutado por ${taker}.`);
        }

        await updateRetiro(id, { 
          estado: 'en_proceso',
          taken_by_admin_id: admin.id,
          taken_by_admin_name: adminName,
          taken_at: new Date().toISOString(),
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
        
        logger.info(`[Telegram Logic] Retiro ${id} tomado por ${adminName}`);
        return answerCallback(callbackQueryId, '✅ Retiro asignado. Procede con el pago.');
      }

      // ACCIÓN: PAGAR O RECHAZAR
      if (action === 'pagar' || action === 'rechazar') {
        // VALIDACIÓN: Solo el admin que tomó el retiro
        if (retiro.taken_by_admin_id && retiro.taken_by_admin_id !== admin.id) {
          return answerCallback(callbackQueryId, `⚠️ Solo ${retiro.taken_by_admin_name} puede finalizar este retiro.`);
        }

        if (action === 'pagar') {
          await updateRetiro(id, { 
            estado: 'pagado',
            processed_by_admin_id: admin.id,
            processed_by_admin_name: adminName,
            processed_at: new Date().toISOString()
          });
          
          const statusMsg = `✅ PAGADO por ${adminName}`;
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
            rejected_at: new Date().toISOString()
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
            fecha: new Date().toISOString()
          });

          const statusMsg = `❌ RECHAZADO por ${adminName} (Saldo devuelto)`;
          const metadata = retiro.telegram_metadata || [];
          if (metadata.length > 0) {
            for (const item of metadata) {
              await editTelegramMessage(item.chat_id, item.message_id, message.text || message.caption, statusMsg);
            }
          } else {
            await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);
          }
          
          logger.info(`[Telegram Logic] Retiro ${id} rechazado por ${adminName}`);
        }
        return answerCallback(callbackQueryId, 'Operación finalizada.');
      }
    }

    // --- MÓDULO DE RECARGAS ---
    if (type === 'recarga') {
      logger.info(`[Telegram Logic] Acción de Recarga: ${action} para ID: ${id}`);
      const recarga = await getRecargaById(id);
      if (!recarga || (recarga.estado !== 'pendiente' && recarga.estado !== 'pendiente_ascenso')) {
        logger.error(`[Telegram Logic] Recarga no encontrada o no pendiente: ${id}`);
        return answerCallback(callbackQueryId, 'Esta solicitud ya no está pendiente.');
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
            procesado_at: new Date().toISOString() 
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
            fecha: boliviaTime.now().toISOString()
          });
          const nuevoSaldo = Number((Number(user.saldo_principal || 0) + recarga.monto).toFixed(2));
          await updateUser(user.id, { saldo_principal: nuevoSaldo });
          await updateRecarga(id, { 
            estado: 'aprobada', 
            procesado_por_admin_id: admin.id, 
            procesado_por_admin_name: adminName,
            processed_at: new Date().toISOString() 
          });
          // Distribuir comisiones por recarga de saldo (Inversión)
          await distributeInvestmentCommissions(user.id, recarga.monto);
          statusMsg = `✅ Recarga Aprobada por ${adminName}`;
          logger.info(`[Telegram Logic] Recarga (Saldo) ${id} aprobada por ${adminName}`);
        }

        const metadata = recarga.telegram_metadata || [];
        if (metadata.length > 0) {
          for (const item of metadata) {
            await editTelegramMessage(item.chat_id, item.message_id, message.text || message.caption, statusMsg);
          }
        } else {
          await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);
        }
      } else {
        await updateRecarga(id, { 
          estado: 'rechazada', 
          procesado_por_admin_id: admin.id, 
          procesado_por_admin_name: adminName,
          procesado_at: new Date().toISOString() 
        });
        
        const statusMsg = `❌ Rechazada por ${adminName}`;
        const metadata = recarga.telegram_metadata || [];
        if (metadata.length > 0) {
          for (const item of metadata) {
            await editTelegramMessage(item.chat_id, item.message_id, message.text || message.caption, statusMsg);
          }
        } else {
          await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);
        }
        
        console.log(`[Telegram Logic] Recarga ${id} rechazada por ${adminName}`);
      }
      await answerCallback(callbackQueryId, 'Operación procesada.');
    }
  } catch (err) {
    console.error('[Telegram Logic Error]:', err);
    return answerCallback(callbackQueryId, '❌ Error interno al procesar.');
  }
}

async function handleDailySummary(message) {
  const admin = await findAdminByTelegramId(message.from.id);
  if (!admin) return;

  const token = process.env.TELEGRAM_RETIROS_TOKEN;
  if (!token) return;

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
  const summary = await getDailyWithdrawalSummary(today);

  let text = `<b>📊 RESUMEN DIARIO DE RETIROS (${today})</b>\n\n`;

  if (summary.length === 0) {
    text += "No se procesaron retiros el día de hoy.";
  } else {
    let grandTotal = 0;
    summary.forEach(s => {
      text += `👤 <b>${s.name}</b>\n`;
      text += `   - Cantidad: ${s.count} retiros\n`;
      text += `   - Total: ${s.total.toFixed(2)} BOB\n\n`;
      grandTotal += s.total;
    });
    text += `💰 <b>TOTAL GENERAL: ${grandTotal.toFixed(2)} BOB</b>`;
  }

  await safeTelegramCall(async () => {
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
}

async function editTelegramMessage(chatId, messageId, oldText, statusText, replyMarkup = { inline_keyboard: [] }) {
  const tokens = [process.env.TELEGRAM_RECARGAS_TOKEN, process.env.TELEGRAM_RETIROS_TOKEN];
  const newText = `${oldText}\n\n📢 <b>${statusText}</b>`;

  for (const token of tokens) {
    if (!token) continue;
    await safeTelegramCall(async () => {
      const urlText = `https://api.telegram.org/bot${token}/editMessageText`;
      const res = await fetch(urlText, {
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

      if (!res.ok) {
        const urlCaption = `https://api.telegram.org/bot${token}/editMessageCaption`;
        await fetch(urlCaption, {
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
      }
    }, `editTelegramMessage-${token.substring(0, 5)}`);
  }
}

async function answerCallback(callbackQueryId, text) {
  const tokens = [process.env.TELEGRAM_RECARGAS_TOKEN, process.env.TELEGRAM_RETIROS_TOKEN];
  for (const token of tokens) {
    if (!token) continue;
    const success = await safeTelegramCall(async () => {
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
