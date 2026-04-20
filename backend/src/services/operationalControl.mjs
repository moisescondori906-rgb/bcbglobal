import redis from '../services/redisService.mjs';
import { query } from '../config/db.mjs';
import logger from '../utils/logger.mjs';
import { boliviaTime } from './dbService.mjs';

const CACHE_TTL = 60; // 60 segundos de caché dinámica

/**
 * OperationalControlService: Cerebro de Control Dinámico por Región, Horario y Flags.
 */
class OperationalControlService {
  
  /**
   * Obtiene la configuración de una funcionalidad (Feature Flag)
   * Prioridad: Región específica > GLOBAL.
   */
  async getFeatureFlag(featureName, region = 'GLOBAL') {
    const cacheKey = `ff:${featureName}:${region}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      // Consulta DB: Intentar región, sino fallback a GLOBAL
      const flags = await query(
        `SELECT * FROM feature_flags 
         WHERE feature_name = ? AND region IN (?, 'GLOBAL') 
         ORDER BY FIELD(region, ?, 'GLOBAL') LIMIT 1`,
        [featureName, region, region]
      );

      const flag = flags[0] || { enabled: 1, rollout_percentage: 100 };
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(flag));
      return flag;
    } catch (err) {
      logger.error(`[FF-ERROR]: ${err.message}`);
      return { enabled: 1, rollout_percentage: 100 }; // Fail-safe: habilitado por defecto
    }
  }

  /**
   * Valida si una operación está dentro del horario permitido por región.
   */
  async checkSchedule(operationType, region = 'GLOBAL') {
    const cacheKey = `schedule:${operationType}:${region}`;
    try {
      const cached = await redis.get(cacheKey);
      let schedule = cached ? JSON.parse(cached) : null;

      if (!schedule) {
        const rows = await query(
          `SELECT * FROM horarios_operacion 
           WHERE operacion_tipo = ? AND region IN (?, 'GLOBAL') AND habilitado = 1
           ORDER BY FIELD(region, ?, 'GLOBAL') LIMIT 1`,
          [operationType, region, region]
        );
        schedule = rows[0];
        if (schedule) await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(schedule));
      }

      if (!schedule) return { allowed: true }; // Si no hay config, se permite

      // Validación de Timezone y Rango
      const now = boliviaTime.now(); // Centralizado en America/La_Paz
      const currentDay = now.getDay(); // 0=Dom, 1=Lun
      const currentTime = now.toTimeString().split(' ')[0]; // HH:mm:ss

      const allowedDays = schedule.dias_permitidos.split(',').map(Number);
      if (!allowedDays.includes(currentDay)) {
        return { allowed: false, reason: `Operación no permitida en ${boliviaTime.getDayName()}` };
      }

      if (currentTime < schedule.hora_inicio || currentTime > schedule.hora_fin) {
        return { allowed: false, reason: `Fuera de horario: ${schedule.hora_inicio} a ${schedule.hora_fin}` };
      }

      return { allowed: true };
    } catch (err) {
      logger.error(`[SCHEDULE-ERROR]: ${err.message}`);
      return { allowed: true };
    }
  }

  /**
   * Verifica si existe una ventana de mantenimiento activa.
   */
  async checkMaintenance(region = 'GLOBAL') {
    const cacheKey = `maintenance:${region}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const rows = await query(
        `SELECT * FROM ventanas_mantenimiento 
         WHERE region IN (?, 'GLOBAL') AND activo = 1 
         AND NOW() BETWEEN inicio_at AND fin_at 
         LIMIT 1`,
        [region]
      );

      const maintenance = rows[0] || null;
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(maintenance));
      return maintenance;
    } catch (err) {
      logger.error(`[MAINTENANCE-ERROR]: ${err.message}`);
      return null;
    }
  }

  /**
   * Auditoría de Control Operacional (Atómica)
   */
  async logControlAction({ traceId, userId, operation, region, result, reason, metadata }) {
    try {
      await query(
        `INSERT INTO auditoria_operacional 
         (trace_id, usuario_id, operacion, region, resultado, motivo_bloqueo, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [traceId, userId, operation, region, result, reason, JSON.stringify(metadata || {})]
      );
    } catch (err) {
      logger.error(`[AUDIT-OP-ERROR]: ${err.message}`);
    }
  }
}

export default new OperationalControlService();
