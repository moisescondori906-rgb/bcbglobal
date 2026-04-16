import { query, queryOne } from '../config/db.js';
import redis from './redisService.js';
import logger from '../lib/logger.js';

/**
 * FeatureFlagService - Control dinámico de funcionalidades en caliente.
 * Usa una estrategia de Cache-Aside con Redis y persistencia en DB.
 */
export const FeatureFlagService = {
  /**
   * Verifica si una funcionalidad está activa.
   */
  async isEnabled(flagKey, context = {}) {
    try {
      // 1. Intentar desde Cache (Redis)
      const cached = await redis.get(`flag:${flagKey}`);
      if (cached !== null) return cached === '1';

      // 2. Consultar DB si no está en cache
      const flag = await queryOne(`SELECT is_enabled FROM feature_flags WHERE flag_key=?`, [flagKey]);
      const enabled = flag ? flag.is_enabled === 1 : false;

      // 3. Sincronizar Cache (TTL 5 min para refresco automático)
      await redis.set(`flag:${flagKey}`, enabled ? '1' : '0', 'EX', 300);
      
      return enabled;
    } catch (err) {
      logger.error(`[FEATURE-FLAG] Error verificando ${flagKey}:`, err.message);
      return false; // Fail-safe: desactivado por defecto
    }
  },

  /**
   * Cambia el estado de una flag en caliente.
   */
  async toggle(flagKey, enabled) {
    await query(`UPDATE feature_flags SET is_enabled=? WHERE flag_key=?`, [enabled ? 1 : 0, flagKey]);
    await redis.set(`flag:${flagKey}`, enabled ? '1' : '0', 'EX', 300);
    logger.info(`[FEATURE-FLAG] ${flagKey} cambiado a ${enabled}`);
  }
};

/**
 * FraudDetectionService - Análisis de patrones anómalos y prevención de fraude interno.
 */
export const FraudDetectionService = {
  /**
   * Analiza una operación en tiempo real para detectar anomalías.
   */
  async analyzeOperation(telegramId, traceId, operationData) {
    try {
      const { action, withdrawalId } = operationData;

      // Patrón 1: Aprobaciones masivas ultra-rápidas (< 5s entre casos)
      const lastOpKey = `last_op:${telegramId}`;
      const lastOpTime = await redis.get(lastOpKey);
      const now = Date.now();

      if (lastOpTime && (now - parseInt(lastOpTime)) < 5000 && action === 'aprobar') {
        await this.reportAnomaly(telegramId, traceId, 'rapid_approvals', {
          time_since_last_ms: now - parseInt(lastOpTime),
          withdrawal_id: withdrawalId
        });
      }
      await redis.set(lastOpKey, now.toString(), 'EX', 3600);

      // Patrón 2: Actividad fuera de horario de turno (Ya validado en Handler, pero aquí auditamos severidad)
      // Se pueden agregar más patrones complejos aquí...

    } catch (err) {
      logger.error('[FRAUD-DETECTION] Error en análisis:', err.message);
    }
  },

  async reportAnomaly(telegramId, traceId, pattern, details) {
    logger.warn(`[SECURITY-FRAUD] Anomalía detectada para ${telegramId}`, { traceId, pattern });
    await query(
      `INSERT INTO fraud_alerts (telegram_id, trace_id, severity, pattern_type, details) 
       VALUES (?, ?, 'high', ?, ?)`,
      [telegramId, traceId, pattern, JSON.stringify(details)]
    );
    // Notificación inmediata al administrador si es crítico
    const { sendToAdmin } = await import('./telegramBot.js');
    await sendToAdmin(`🚨 <b>DETECCIÓN DE FRAUDE</b>\n\nOperador: <code>${telegramId}</code>\nPatrón: <b>${pattern}</b>\nTrace: <code>${traceId}</code>\n\n⚠️ <i>Actividad sospechosa detectada por el motor global.</i>`);
  }
};
