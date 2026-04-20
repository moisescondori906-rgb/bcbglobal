import logger from '../utils/logger.mjs';
import { query, queryOne } from '../config/db.mjs';
import redis from './redisService.mjs';
import { FeatureFlagService } from './globalControlService.mjs';

/**
 * ResilienceService - Sistema de Autocorrección, SLA y Chaos Engine.
 */
export const ResilienceService = {
  
  /**
   * Monitoreo y Ajuste Automático de SLA.
   * Se ejecuta periódicamente para detectar degradación.
   */
  async checkSLAStatus(tenantId = null) {
    try {
      // 1. Obtener métricas recientes
      const metrics = await queryOne(
        `SELECT avg_latency_ms, failed_requests, total_requests 
         FROM sla_metrics 
         WHERE timestamp = CURRENT_DATE AND (tenant_id = ? OR tenant_id IS NULL)
         ORDER BY id DESC LIMIT 1`,
        [tenantId]
      );

      if (!metrics) return;

      const errorRate = (metrics.failed_requests / metrics.total_requests) * 100;
      const avgLatency = metrics.avg_latency_ms;

      // 2. Triggers Automáticos ante Degradación
      if (avgLatency > 2000 || errorRate > 5) {
        logger.warn(`[SLA-AUTO] Degradación detectada. Latencia: ${avgLatency}ms, Errores: ${errorRate}%`);
        
        // Activar Modo de Supervivencia (Feature Flag)
        await FeatureFlagService.toggle('performance_mode', true, tenantId);
        
        // Notificar a Ingeniería
        const { sendToAdmin } = await import('./telegramBot.mjs');
        await sendToAdmin(`⚠️ <b>ALERTA DE SLA - AUTO-CORRECCIÓN</b>\n\nTenant: <code>${tenantId || 'GLOBAL'}</code>\nLatencia: <code>${avgLatency}ms</code>\nError Rate: <code>${errorRate.toFixed(2)}%</code>\n\n🛠 <i>Acción: Modo Performance activado automáticamente.</i>`);
      }
    } catch (err) {
      logger.error('[SLA-CHECK] Error:', err.message);
    }
  },

  /**
   * Chaos Engine - Inyección de fallos controlados.
   * Solo disponible si la flag 'chaos_testing' está activa.
   */
  async injectFailure(type, context = {}) {
    const isChaosEnabled = await FeatureFlagService.isEnabled('chaos_testing', context);
    if (!isChaosEnabled) return;

    logger.warn(`[CHAOS-ENGINE] Inyectando fallo: ${type}`);

    switch (type) {
      case 'latency':
        // Simular latencia de DB o API
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000));
        break;
      
      case 'redis_failure':
        // Simular error de conexión a cache
        throw new Error('Chaos: Simulated Redis Connection Timeout');
      
      case 'db_readonly':
        // Simular base de datos en modo lectura
        throw new Error('Chaos: Database is currently in Read-Only mode (Simulated)');

      case 'telegram_throttling':
        // Simular error 429 Too Many Requests
        throw new Error('Chaos: Telegram API Error 429 (Too Many Requests)');
    }
  },

  /**
   * Failover Automático Multi-región.
   * Si la región actual detecta fallos masivos, marca el estado en Redis
   * para que el Balanceador o los Clientes cambien de endpoint.
   */
  async triggerFailover() {
    const currentRegion = process.env.REGION || 'LATAM-BO-1';
    const failoverKey = `failover:status:${currentRegion}`;
    
    logger.error(`[FAILOVER] Iniciando protocolo de emergencia para ${currentRegion}`);
    
    // 1. Marcar región como "Degradada" en Redis Global
    await redis.set(failoverKey, 'unhealthy', 'EX', 600);
    
    // 2. Notificar a Nivel Global (Slack/Telegram/OpsGenie)
    const { sendToAdmin } = await import('./telegramBot.mjs');
    await sendToAdmin(`🚨 <b>CRITICAL FAILOVER</b>\n\nRegión: <code>${currentRegion}</code>\nEstado: <b>UNHEALTHY</b>\n\n⚠️ <i>El tráfico está siendo redirigido a la región secundaria.</i>`);

    // 3. (Opcional) Cambiar DB a modo lectura para evitar inconsistencias durante el split-brain
    // await query('SET GLOBAL read_only = 1'); 
  }
};

/**
 * Job para reportar métricas de SLA periódicamente.
 */
export const recordSLADatum = async (serviceName, region, latency, success, tenantId = null) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await query(
      `INSERT INTO sla_metrics (service_name, region, availability_pct, avg_latency_ms, total_requests, failed_requests, timestamp, tenant_id)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         avg_latency_ms = (avg_latency_ms + VALUES(avg_latency_ms)) / 2,
         total_requests = total_requests + 1,
         failed_requests = failed_requests + VALUES(failed_requests),
         availability_pct = ((total_requests - failed_requests) / total_requests) * 100`,
      [serviceName, region, success ? 100 : 0, latency, success ? 0 : 1, today, tenantId]
    );
  } catch (err) {
    logger.error('[SLA-METRIC] Error recording:', err.message);
  }
};
