import { query, queryOne } from '../config/db.mjs';
import logger from '../utils/logger.mjs';
import redis from './redisService.mjs';

/**
 * OperatorService - Perfilado de Operadores y Análisis de Desempeño.
 */
export const OperatorService = {
  
  /**
   * Obtiene el perfil histórico de un operador.
   */
  async getOperatorProfile(telegramId, tenantId = null) {
    try {
      const stats = await query(
        `SELECT 
          SUM(total_tomados) as total_tomados,
          SUM(total_aprobados) as total_aprobados,
          SUM(total_rechazados) as total_rechazados,
          AVG(tiempo_total_toma_seg / NULLIF(total_tomados, 0)) as avg_toma_seg,
          AVG(tiempo_total_proceso_seg / NULLIF(total_aprobados + total_rechazados, 0)) as avg_proceso_seg
         FROM estadisticas_operadores 
         WHERE telegram_id = ? AND (tenant_id = ? OR tenant_id IS NULL)`,
        [telegramId, tenantId]
      );

      return stats[0] || null;
    } catch (err) {
      logger.error(`[OPERATOR-SERVICE] Error getting profile for ${telegramId}:`, err.message);
      return null;
    }
  },

  /**
   * Detecta anomalías reales comparando la operación actual con el perfil histórico.
   */
  async detectOperatorAnomaly(telegramId, currentOp, tenantId = null) {
    const profile = await this.getOperatorProfile(telegramId, tenantId);
    if (!profile || profile.total_tomados < 50) return false; // No hay suficiente data para perfilar

    const { action, durationSeg } = currentOp;
    
    // Anomalía: Tiempo de proceso sospechosamente rápido
    // Si el promedio es 60s y procesa en < 2s
    if (action === 'aprobar' && durationSeg < 2 && profile.avg_proceso_seg > 30) {
      return {
        type: 'suspiciously_fast_approval',
        severity: 'high',
        detail: `Promedio: ${profile.avg_proceso_seg.toFixed(1)}s | Actual: ${durationSeg}s`
      };
    }

    // Anomalía: Cambio drástico en ratio de aprobación
    // Si usualmente aprueba 80% y de pronto aprueba 100% en una racha de 20
    const currentRatio = await redis.get(`op_ratio:${tenantId || 'global'}:${telegramId}`);
    // ... Lógica adicional de ratios ...

    return null;
  },

  /**
   * Registra una métrica de operación.
   */
  async recordOperation(telegramId, data, tenantId = null) {
    const { action, durationToma, durationProceso } = data;
    const today = new Date().toISOString().split('T')[0];

    try {
      await query(
        `INSERT INTO estadisticas_operadores 
          (telegram_id, fecha, total_tomados, total_aprobados, total_rechazados, tiempo_total_toma_seg, tiempo_total_proceso_seg, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
          total_tomados = total_tomados + VALUES(total_tomados),
          total_aprobados = total_aprobados + VALUES(total_aprobados),
          total_rechazados = total_rechazados + VALUES(total_rechazados),
          tiempo_total_toma_seg = tiempo_total_toma_seg + VALUES(tiempo_total_toma_seg),
          tiempo_total_proceso_seg = tiempo_total_proceso_seg + VALUES(tiempo_total_proceso_seg)`,
        [
          telegramId, 
          today, 
          action === 'tomar' ? 1 : 0,
          action === 'aprobar' ? 1 : 0,
          action === 'rechazar' ? 1 : 0,
          durationToma || 0,
          durationProceso || 0,
          tenantId
        ]
      );
    } catch (err) {
      logger.error('[OPERATOR-SERVICE] Error recording stats:', err.message);
    }
  }
};
