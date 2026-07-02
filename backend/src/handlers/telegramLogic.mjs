import { 
  getRecargaById, updateRecarga, 
  getRetiroById, updateRetiro, 
  findUserById, updateUser,
  getLevels, handleLevelUpRewards,
  createMovimiento, peruTime,
  findAdminByTelegramId, getDailyWithdrawalSummary,
  distributeInvestmentCommissions,
  rejectRetiro, approveRetiro
} from '../services/dbService.mjs';
import { query, queryOne } from '../config/db.mjs';
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

    // FLEXIBLE PARSING v12.5.3: Soporta type_action_id y action_type_id con '_' o ':'
    let type, action, id;
    const rawParts = data.includes('_') ? data.split('_') : data.split(':');
    
    if (['retiro', 'recarga'].includes(rawParts[0])) {
      type = rawParts[0];
      action = rawParts[1];
      id = rawParts.slice(2).join(data.includes('_') ? '_' : ':');
    } else if (['tomar', 'aprobar', 'rechazar', 'pagar'].includes(rawParts[0])) {
      action = rawParts[0];
      type = rawParts[1];
      id = rawParts.slice(2).join(data.includes('_') ? '_' : ':');
    } else {
      return safeTelegram(() => answerCallback(callbackQueryId, '❌ Formato de datos inválido.'), 'answerCallback-InvalidFormat');
    }

    // 2. VALIDACIÓN DE ADMINISTRADOR
    const admin = await findAdminByTelegramId(telegramUser.id);
    
    if (!admin) {
      logger.warn(`[TELEGRAM-LOGIC] ACCESO DENEGADO: ${telegramUser.id}`);
      return safeTelegram(() => answerCallback(callbackQueryId, '❌ No tienes permisos de operador.'), 'answerCallback-Denied');
    }

    const adminName = admin.nombre || admin.nombre_usuario || admin.nombre_real;
    const adminUsername = telegramUser.username || adminName;
    logger.info(`[Telegram Logic] Admin identificado: ${adminName} (ID DB: ${admin.id})`);

    // --- MÓDULO DE RETIROS ---
    if (type === 'retiro') {
      logger.info(`[Telegram Logic] Acción de Retiro: ${action} para ID: ${id}`);
      const retiro = await getRetiroById(id);
      if (!retiro) {
        logger.error(`[Telegram Logic] Retiro no encontrado: ${id}`);
        return answerCallback(callbackQueryId, 'Retiro no encontrado.');
      }

      // ACCIÓN: TOMAR RETIRO v14.0.1 (Blindado con WHERE)
      if (action === 'tomar') {
        const result = await query(
          `UPDATE retiros 
           SET estado_operativo = 'tomado',
               operador_telegram_id = ?,
               operador_nombre = ?,
               operador_username = ?,
               tomado_en = ?
           WHERE id = ?
             AND (
               estado_operativo IS NULL
               OR estado_operativo IN ('Verificando', 'pendiente', 'Pendiente')
             )
             AND estado = 'Verificando'`,
          [String(telegramUser.id), adminName, adminUsername, peruTime.getISOString(), id]
        );

        if (result.affectedRows === 0) {
          const currentRetiro = await getRetiroById(id);
          const taker = currentRetiro?.operador_nombre || 'otro administrador';
          return safeTelegram(() => answerCallback(callbackQueryId, `⚠️ No se pudo tomar: Ya está siendo ejecutado por ${taker} o ya fue procesado.`), 'answerCallback-Taken-Atomic');
        }

        const statusMsg = `⏳ EN PROCESO\n👤 Tomado por: ${adminName}\n🕒 Hora: ${peruTime.getTimeString()}`;
        const buttons = {
          inline_keyboard: [[
            { text: '✅ Marcar como Pagado', callback_data: `retiro_pagar_${id}` },
            { text: '❌ Rechazar', callback_data: `retiro_rechazar_${id}` }
          ]]
        };
        
        await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg, buttons);
        
        logger.info(`[TELEGRAM-LOGIC] Retiro ${id} tomado por ${adminName}`);
        return safeTelegram(() => answerCallback(callbackQueryId, '✅ Retiro asignado. Procede con el pago.'), 'answerCallback-Success');
      }

      // ACCIÓN: PAGAR O RECHAZAR
      if (action === 'pagar' || action === 'rechazar') {
        // VALIDACIÓN: Solo el admin que tomó el retiro
        if (retiro.operador_telegram_id && String(retiro.operador_telegram_id) !== String(telegramUser.id)) {
          return safeTelegram(() => answerCallback(callbackQueryId, `⚠️ Solo ${retiro.operador_nombre} puede finalizar este retiro.`), 'answerCallback-WrongAdmin');
        }

        if (action === 'pagar') {
          try {
            await approveRetiro(id, admin.id);
            
            const statusMsg = `✅ PAGADO por ${adminName}`;
            
            // Notificar a Secretaria
            const user = await findUserById(retiro.usuario_id);
            sendToSecretaria(`<b>✅ RETIRO PAGADO</b>\n👤 Usuario: <code>${user.telefono}</code>\n💵 Monto: <code>${retiro.monto} Bs</code>\n👨‍💼 Admin: ${adminName}`);

            await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);
            
            logger.info(`[Telegram Logic] Retiro ${id} pagado por ${adminName}`);
          } catch (error) {
            return answerCallback(callbackQueryId, `⚠️ Error al aprobar: ${error.message}`);
          }
        } else {
          // RECHAZAR RETIRO: Usar la función rejectRetiro para reembolso atómico
          try {
            await rejectRetiro(id, admin.id, 'Rechazado vía Telegram');

            const statusMsg = `❌ RECHAZADO por ${adminName} (Saldo devuelto)`;

            // Notificar a Secretaria
            const userObj = await findUserById(retiro.usuario_id);
            sendToSecretaria(`<b>❌ RETIRO RECHAZADO</b>\n👤 Usuario: <code>${userObj.telefono}</code>\n💵 Monto: <code>${retiro.monto} Bs</code>\n👨‍💼 Admin: ${adminName}`);

            await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);
            logger.info(`[TELEGRAM-LOGIC] Retiro ${id} rechazado por ${adminName}`);
          } catch (error) {
            return answerCallback(callbackQueryId, `⚠️ Error al rechazar: ${error.message}`);
          }
        }
        return safeTelegram(() => answerCallback(callbackQueryId, 'Operación finalizada.'), 'answerCallback-Done');
      }
    }

    // --- MÓDULO DE RECARGAS ---
    if (type === 'recarga') {
      logger.info(`[TELEGRAM-LOGIC] Acción de Recarga: ${action} para ID: ${id}`);
      const recarga = await getRecargaById(id);
      if (!recarga || (recarga.estado !== 'Verificando' && recarga.estado !== 'pendiente_ascenso')) {
        logger.error(`[TELEGRAM-LOGIC] Recarga no encontrada o no en Verificando: ${id}`);
        return safeTelegram(() => answerCallback(callbackQueryId, 'Esta solicitud ya no está en Verificando.'), 'answerCallback-RecargaDone');
      }

      // ACCIÓN: TOMAR RECARGA v14.0.1 (Blindado con WHERE)
      if (action === 'tomar') {
        const result = await query(
          `UPDATE compras_nivel 
           SET estado_operativo = 'tomado',
               operador_telegram_id = ?,
               operador_nombre = ?,
               operador_username = ?,
               tomado_en = ?
           WHERE id = ?
             AND (
               estado_operativo IS NULL
               OR estado_operativo IN ('Verificando', 'pendiente', 'Pendiente')
             )
             AND estado IN ('Verificando', 'pendiente_ascenso')`,
          [String(telegramUser.id), adminName, adminUsername, peruTime.getISOString(), id]
        );

        if (result.affectedRows === 0) {
          const currentRecarga = await getRecargaById(id);
          const taker = currentRecarga?.operador_nombre || 'otro administrador';
          return safeTelegram(() => answerCallback(callbackQueryId, `⚠️ No se pudo tomar: Ya está siendo revisada por ${taker}.`), 'answerCallback-RecargaTaken');
        }

        const statusMsg = `⏳ REVISANDO\n👤 Tomado por: ${adminName}\n🕒 Hora: ${peruTime.getTimeString()}`;
        const buttons = {
          inline_keyboard: [[
            { text: '✅ Aprobar', callback_data: `recarga_aprobar_${id}` },
            { text: '❌ Rechazar', callback_data: `recarga_rechazar_${id}` }
          ]]
        };
        
        await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg, buttons);
        
        logger.info(`[TELEGRAM-LOGIC] Recarga ${id} tomada por ${adminName}`);
        return safeTelegram(() => answerCallback(callbackQueryId, '✅ Recarga asignada. Verifica el comprobante.'), 'answerCallback-RecargaSuccess');
      }

      // ACCIÓN: APROBAR O RECHAZAR
      if (action === 'aprobar' || action === 'rechazar') {
        // VALIDACIÓN: Solo el admin que tomó la recarga (Opcional, pero recomendado por seguridad)
        if (recarga.operador_telegram_id && String(recarga.operador_telegram_id) !== String(telegramUser.id)) {
          return safeTelegram(() => answerCallback(callbackQueryId, `⚠️ Solo ${recarga.operador_nombre} puede finalizar esta recarga.`), 'answerCallback-WrongAdminRecarga');
        }

        if (action === 'aprobar') {
          // LOCK de recarga para evitar doble proceso (Atómico, usando 'completada' según schema)
          const approveResult = await query(
            `UPDATE compras_nivel SET estado = 'completada', estado_operativo = 'aceptado', procesado_por = ?, procesado_at = ? 
             WHERE id = ? AND estado IN ('Verificando', 'pendiente_ascenso')`,
            [admin.id, peruTime.getISOString(), id]
          );

          if (approveResult.affectedRows === 0) {
            return answerCallback(callbackQueryId, '⚠️ Error: Esta recarga ya no se puede aprobar.');
          }

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
                fecha: peruTime.now().toISOString()
              });
            }
            await updateUser(user.id, updates);
            await handleLevelUpRewards(user.id, user.nivel_id, nivelDestino.id, id);
            // Distribuir comisiones por ascenso (Inversión)
            await distributeInvestmentCommissions(user.id, recarga.monto, id);
            statusMsg = `✅ Ascenso Aprobado por ${adminName} a ${nivelDestino.nombre}`;
            logger.info(`[Telegram Logic] Recarga (VIP) ${id} completada por ${adminName}`);
          } else {
            await createMovimiento({
              usuario_id: user.id,
              tipo_movimiento: 'ajuste_admin',
              monto: recarga.monto,
              descripcion: `Recarga de saldo aprobada`,
              referencia: `REC-${id.substring(0,8)}`,
              fecha: peruTime.getISOString()
            });
            const nuevoSaldo = Number((Number(user.saldo_principal || 0) + recarga.monto).toFixed(2));
            await updateUser(user.id, { saldo_principal: nuevoSaldo });
            
            // Distribuir comisiones por recarga de saldo (Inversión)
            await distributeInvestmentCommissions(user.id, recarga.monto, id);
            statusMsg = `✅ Recarga Aprobada por ${adminName}`;
            
            // Notificar a Secretaria
            sendToSecretaria(`<b>✅ RECARGA APROBADA</b>\n👤 Usuario: <code>${user.telefono}</code>\n💵 Monto: <code>${recarga.monto} Bs</code>\n👨‍💼 Admin: ${adminName}\n🕒 Fecha: ${peruTime.getISOString()}`);
            
            logger.info(`[TELEGRAM-LOGIC] Recarga (Saldo) ${id} completada por ${adminName}`);
          }

          await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);
          return safeTelegram(() => answerCallback(callbackQueryId, '✅ Operación exitosa.'), 'answerCallback-AprobarSuccess');
        } else {
          // RECHAZAR RECARGA (Atómico)
          const rejectResult = await query(
            `UPDATE compras_nivel SET estado = 'rechazada', estado_operativo = 'rechazado', admin_notas = 'Rechazado vía Telegram', procesado_por = ?, procesado_at = ? 
             WHERE id = ? AND estado IN ('Verificando', 'pendiente_ascenso')`,
            [admin.id, peruTime.getISOString(), id]
          );

          if (rejectResult.affectedRows === 0) {
            return answerCallback(callbackQueryId, '⚠️ Error: Esta recarga ya no se puede rechazar.');
          }

          const statusMsg = `❌ RECHAZADA por ${adminName}`;

          // Notificar a Secretaria
          const userRec = await findUserById(recarga.usuario_id);
          sendToSecretaria(`<b>❌ RECARGA RECHAZADA</b>\n👤 Usuario: <code>${userRec.telefono}</code>\n💵 Monto: <code>${recarga.monto} Bs</code>\n👨‍💼 Admin: ${adminName}`);

          await editTelegramMessage(chatId, messageId, message.text || message.caption, statusMsg);

          logger.info(`[TELEGRAM-LOGIC] Recarga ${id} rechazada por ${adminName}`);
          return safeTelegram(() => answerCallback(callbackQueryId, 'Recarga rechazada.'), 'answerCallback-RechazarSuccess');
        }
      }
    }
  }, 'processTelegramUpdate');
}

async function handleDailySummary(message) {
  return await safeAsync(async () => {
    const admin = await findAdminByTelegramId(message.from.id);
    if (!admin) return;

    const token = process.env.TELEGRAM_BOT_TOKEN_ADMIN || process.env.TELEGRAM_RETIROS_TOKEN;
    if (!token) return;

    const today = peruTime.todayStr();
    const summary = await getDailyWithdrawalSummary(today);

    let text = `<b>📊 RESUMEN DIARIO DE RETIROS (${today})</b>\n\n`;

    if (!summary || summary.total === 0) {
      text += "No se procesaron retiros el día de hoy.";
    } else {
      text += `   - Cantidad: ${summary.total} retiros\n`;
      text += `   - Total: ${Number(summary.monto || 0).toFixed(2)} Bs\n\n`;
      text += `💰 <b>TOTAL GENERAL: ${Number(summary.monto || 0).toFixed(2)} Bs</b>`;
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
