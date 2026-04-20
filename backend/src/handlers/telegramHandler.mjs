import { v4 as uuidv4 } from 'uuid';
import { botAdmin, botRetiros, botSecretaria } from '../services/telegramBot.mjs';
import { WithdrawalRepository, TelegramUserRepository } from '../services/repositories/telegramRepository.mjs';
import { WithdrawalService } from '../services/withdrawalService.mjs';
import { checkGlobalRateLimit, acquireLock, releaseLock, checkIdempotencyRedis } from '../services/redisService.mjs';
import { FeatureFlagService, FraudDetectionService } from '../services/globalControlService.mjs';
import { query, queryOne } from '../config/db.mjs';
import logger from '../utils/logger.mjs';

/**
 * handleCallbackQuery - Blindado para Resiliencia Global.
 */
export const handleCallbackQuery = async (bot, queryData) => {
  const { data, from, id: callbackId } = queryData;
  if (!data || !from) return;

  // 0. Global Kill-Switch (Feature Flag)
  const isSystemActive = await FeatureFlagService.isEnabled('telegram_withdrawals');
  if (!isSystemActive) {
    return bot.answerCallbackQuery(callbackId, { text: "⚠️ Sistema en mantenimiento temporal.", show_alert: true });
  }

  // 1. Trazabilidad & Idempotencia Persistente
  const traceId = uuidv4();
  const [accion, retiroId] = data.split('_');
  
  try {
    // A. Check Idempotencia (Redis + DB Persistente)
    const isProcessedRedis = await checkIdempotencyRedis(callbackId);
    if (isProcessedRedis) return bot.answerCallbackQuery(callbackId, { text: "⚠️ Acción ya procesada (Cache)." });

    const yaProcesadoDB = await queryOne(
      `SELECT id FROM idempotencia_callbacks WHERE callback_id=?`, [callbackId]
    );
    if (yaProcesadoDB) return bot.answerCallbackQuery(callbackId, { text: "⚠️ Acción ya procesada (DB)." });

    // B. Locks Seguros con Redlock (Renovación automática)
    const lock = await acquireLock(`callback:${retiroId}:${accion}`, 10000);
    if (!lock) {
      return bot.answerCallbackQuery(callbackId, { text: "⏳ Procesando en otra instancia, espera..." });
    }

    // 2. Rate Limit Global (Redis)
    const isAllowed = await checkGlobalRateLimit(from.id, traceId);
    if (!isAllowed) {
      await releaseLock(lock);
      return bot.answerCallbackQuery(callbackId, { text: "⚠️ Rate limit excedido." });
    }

    // 3. Seguridad de Operadores & Contexto de Tenant
    const user = await TelegramUserRepository.findById(from.id);
    if (!user || user.activo === 0 || user.intentos_fallidos >= 5) {
      await releaseLock(lock);
      return bot.answerCallbackQuery(callbackId, { text: "🔒 Acceso denegado." });
    }
    const tenantId = user.tenant_id;

    // 4. Lógica de Negocio (Inyectando traceId y tenantId)
    if (accion === 'tomar') {
      await WithdrawalService.takeWithdrawal(retiroId, { userId: from.id, userName: from.first_name, traceId, tenantId });
      
      // Motor de Detección de Fraude (Análisis asíncrono)
      FraudDetectionService.analyzeOperation(from.id, traceId, { action: accion, withdrawalId: retiroId }, tenantId);

      const withdrawal = await WithdrawalRepository.findByIdWithLevel(retiroId);
      const text = formatRobustMessage(withdrawal, `🔒 Tomado por: ${from.first_name}\n🆔 Trace: <code>${traceId}</code>\n🏢 Empresa: <b>${tenantId || 'Default'}</b>`);
      await syncMessageAcrossGroups(withdrawal, text, retiroId, true, traceId);
    } else if (accion === 'aprobar' || accion === 'rechazar') {
      const nuevoEstado = await WithdrawalService.processWithdrawal(retiroId, accion, { userId: from.id, userName: from.first_name, traceId, tenantId });
      
      // Análisis de anomalías
      FraudDetectionService.analyzeOperation(from.id, traceId, { action: accion, withdrawalId: retiroId }, tenantId);

      const withdrawal = await WithdrawalRepository.findByIdWithLevel(retiroId);
      const emoji = nuevoEstado === 'aprobado' ? '✅' : '❌';
      const text = formatRobustMessage(withdrawal, `${emoji} ${nuevoEstado.toUpperCase()} por: ${from.first_name}\n🆔 Trace: <code>${traceId}</code>`);
      await syncMessageAcrossGroups(withdrawal, text, retiroId, false, traceId);
    }

    // C. Registrar Idempotencia en DB tras éxito
    await query(
      `INSERT INTO idempotencia_callbacks (callback_id, trace_id, telegram_id, retiro_id, accion) 
       VALUES (?, ?, ?, ?, ?)`,
      [callbackId, traceId, from.id, retiroId, accion]
    );

    await releaseLock(lock);
    await bot.answerCallbackQuery(callbackId, { text: "✅ Operación exitosa" });

  } catch (err) {
    logger.error(`[RESILIENCIA] Error crítico en callback`, { traceId, error: err.message });
    await bot.answerCallbackQuery(callbackId, { text: `❌ ${err.message}`, show_alert: true }).catch(() => {});
  }
};

const formatRobustMessage = (withdrawal, footer = "") => {
  return `📌 <b>BCB GLOBAL - RESILIENCIA TOTAL</b>\n\n` +
    `🆔 ID: <b>${withdrawal.id}</b>\n` +
    `👤 Usuario: ${withdrawal.telefono_usuario}\n` +
    `💵 Monto: <b>${withdrawal.monto} Bs</b>\n` +
    `🕒 Solicitado: ${new Date(withdrawal.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}\n\n` +
    `${footer}`;
};

const syncMessageAcrossGroups = async (withdrawal, text, id, withButtons, traceId) => {
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

  const { enqueueTelegramMessage } = await import('../services/BullMQService.mjs');
  for (const g of groups) {
    if (g.b && g.mid) {
      await enqueueTelegramMessage(g.b.token, g.cid, text, { 
        edit_message_id: g.mid, 
        reply_markup: keyboard 
      }, traceId);
    }
  }
};
