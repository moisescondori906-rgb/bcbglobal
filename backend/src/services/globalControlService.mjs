import { query, queryOne } from '../config/db.mjs';
import redis from './redisService.mjs';
import logger from '../utils/logger.mjs';

/**
 * FeatureFlagService - Control dinámico de funcionalidades en caliente.
 * Usa una estrategia de Cache-Aside con Redis y persistencia en DB.
 */
export const FeatureFlagService = {
  /**
   * Verifica si una funcionalidad está activa, considerando segmentación y tenant.
   */
  async isEnabled(flagKey, context = {}) {
    const { userId, role, region, tenantId } = context;
    const cacheKey = tenantId ? `flag:${tenantId}:${flagKey}` : `flag:${flagKey}`;

    try {
      // 1. Intentar desde Cache (Redis)
      const cached = await redis.get(cacheKey);
      let flagData = null;

      if (cached !== null) {
        flagData = JSON.parse(cached);
      } else {
        // 2. Consultar DB si no está en cache
        let sql = `SELECT is_enabled, rules FROM feature_flags WHERE flag_key=?`;
        const params = [flagKey];

        if (tenantId) {
          sql += ` AND (tenant_id = ? OR tenant_id IS NULL)`;
          params.push(tenantId);
        }

        const flag = await queryOne(sql, params);
        if (!flag) return false;

        flagData = {
          enabled: flag.is_enabled === 1,
          rules: typeof flag.rules === 'string' ? JSON.parse(flag.rules) : (flag.rules || {})
        };

        // 3. Sincronizar Cache (TTL 5 min)
        await redis.set(cacheKey, JSON.stringify(flagData), 'EX', 300);
      }

      if (!flagData.enabled) return false;

      // 4. Aplicar Segmentación (Rules)
      const { rules } = flagData;
      if (rules) {
        // Filtro por Rol
        if (rules.roles && role && !rules.roles.includes(role)) return false;
        
        // Filtro por Región
        if (rules.regions && region && !rules.regions.includes(region)) return false;

        // Filtro por Usuario (Whitelisting/Blacklisting)
        if (rules.users && userId && !rules.users.includes(userId)) return false;

        // Rollout porcentual (Canary)
        if (rules.rollout && userId) {
          const hash = [...userId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
          if ((hash % 100) > rules.rollout) return false;
        }
      }
      
      return true;
    } catch (err) {
      logger.error(`[FEATURE-FLAG] Error verificando ${flagKey}:`, err.message);
      return false; // Fail-safe
    }
  },

  /**
   * Cambia el estado de una flag en caliente para un tenant específico.
   */
  async toggle(flagKey, enabled, tenantId = null) {
    const sql = tenantId 
      ? `UPDATE feature_flags SET is_enabled=? WHERE flag_key=? AND tenant_id=?`
      : `UPDATE feature_flags SET is_enabled=? WHERE flag_key=?`;
    const params = tenantId ? [enabled ? 1 : 0, flagKey, tenantId] : [enabled ? 1 : 0, flagKey];

    await query(sql, params);
    
    const cacheKey = tenantId ? `flag:${tenantId}:${flagKey}` : `flag:${flagKey}`;
    await redis.del(cacheKey); // Invalidar para recarga
    
    logger.info(`[FEATURE-FLAG] ${flagKey} cambiado a ${enabled} (Tenant: ${tenantId || 'global'})`);
  }
};

/**
 * FraudDetectionService - Análisis de patrones anómalos y prevención de fraude interno.
 */
export const FraudDetectionService = {
  /**
   * Analiza una operación en tiempo real para detectar anomalías.
   */
  async analyzeOperation(telegramId, traceId, operationData, tenantId = null) {
    try {
      const { action, withdrawalId } = operationData;

      // Patrón 1: Aprobaciones masivas ultra-rápidas (< 5s entre casos)
      const lastOpKey = tenantId ? `last_op:${tenantId}:${telegramId}` : `last_op:${telegramId}`;
      const lastOpTime = await redis.get(lastOpKey);
      const now = Date.now();

      if (lastOpTime && (now - parseInt(lastOpTime)) < 5000 && action === 'aprobar') {
        await this.reportAnomaly(telegramId, traceId, 'rapid_approvals', {
          time_since_last_ms: now - parseInt(lastOpTime),
          withdrawal_id: withdrawalId
        }, tenantId);
      }
      await redis.set(lastOpKey, now.toString(), 'EX', 3600);

      // Patrón 2: Aprendizaje Continuo (Perfilado Histórico)
      // Si el operador aprueba algo que históricamente es 99% rechazado por otros, alertar.
      const historicPatternKey = `historic_pattern:${tenantId || 'global'}:${action}`;
      const historicAvg = await redis.get(historicPatternKey);
      // Lógica de comparación...

    } catch (err) {
      logger.error('[FRAUD-DETECTION] Error en análisis:', err.message);
    }
  },

  /**
   * Procesa el feedback humano para mejorar el motor (Aprendizaje).
   */
  async addFeedback(alertId, resolution, adminId, comments = '') {
    try {
      const alert = await queryOne(`SELECT * FROM fraud_alerts WHERE id = ?`, [alertId]);
      if (!alert) throw new Error('Alerta no encontrada');

      // 1. Actualizar estado de la alerta
      await query(
        `UPDATE fraud_alerts SET status = ?, details = JSON_MERGE_PATCH(details, ?) WHERE id = ?`,
        [resolution, JSON.stringify({ resolved_by: adminId, resolution_comments: comments }), alertId]
      );

      // 2. "Aprender": Si es Falso Positivo, ajustar umbrales en Redis
      if (resolution === 'false_positive') {
        const { pattern_type, telegram_id } = alert;
        const learningKey = `learning:fp:${pattern_type}:${telegram_id}`;
        await redis.incr(learningKey);
        await redis.expire(learningKey, 86400 * 7); // Recordar por 7 días
      }

      logger.info(`[FRAUD-FEEDBACK] Alerta ${alertId} resuelta como ${resolution} por ${adminId}`);
      return { ok: true };
    } catch (err) {
      logger.error('[FRAUD-FEEDBACK] Error:', err.message);
      throw err;
    }
  },

  async reportAnomaly(telegramId, traceId, pattern, details, tenantId = null) {
    logger.warn(`[SECURITY-FRAUD] Anomalía detectada para ${telegramId} (Tenant: ${tenantId})`, { traceId, pattern });
    
    // Insertar alerta multi-tenant
    await query(
      `INSERT INTO fraud_alerts (telegram_id, trace_id, severity, pattern_type, details, tenant_id) 
       VALUES (?, ?, 'high', ?, ?, ?)`,
      [telegramId, traceId, pattern, JSON.stringify(details), tenantId]
    );

    // Notificación inmediata
    const { sendToAdmin } = await import('./telegramBot.mjs');
    await sendToAdmin(`🚨 <b>DETECCIÓN DE FRAUDE</b>\n\nEmpresa: <code>${tenantId || 'GLOBAL'}</code>\nOperador: <code>${telegramId}</code>\nPatrón: <b>${pattern}</b>\nTrace: <code>${traceId}</code>\n\n⚠️ <i>Actividad sospechosa detectada.</i>`);
  }
};
