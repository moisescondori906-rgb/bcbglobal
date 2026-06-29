import { transaction, query } from '../config/db.mjs';
import { WithdrawalRepository, TelegramUserRepository } from '../services/repositories/telegramRepository.mjs';
import { OperatorService } from './operatorService.mjs';
import { ResilienceService } from './resilienceService.mjs';
import { BillingService } from './billingService.mjs';
import logger from '../utils/logger.mjs';

/**
 * WithdrawalService - Lógica de Negocio Financiera.
 * Implementa concurrencia nivel banco y auditoría total.
 */
export const WithdrawalService = {
  /**
   * Toma un retiro con bloqueo de fila para evitar race conditions.
   */
  async takeWithdrawal(withdrawalId, { userId, userName, traceId, tenantId = null }) {
    const start = Date.now();
    
    // SaaS Check: Límite de retiros diarios
    if (tenantId) {
      const canProceed = await BillingService.checkLimits(tenantId, 'withdrawals_today');
      if (!canProceed) throw new Error("⚠️ Se ha alcanzado el límite diario de retiros para su plan SaaS.");
    }

    return transaction(async (conn) => {
      // Chaos Engine: Simular latencia controlada
      await ResilienceService.injectFailure('latency', { userId, tenantId });

      // 1. Bloqueo nivel fila y validación de estado
      const [retiro] = await conn.query(
        `SELECT id, estado_operativo, created_at FROM retiros WHERE id=? FOR UPDATE`, 
        [withdrawalId]
      );

      if (!retiro) throw new Error("❌ Retiro no encontrado.");
      if (retiro.estado_operativo !== 'pendiente') {
        throw new Error("⚠️ Este retiro ya no está disponible (ya fue tomado o procesado).");
      }

      const ahora = new Date();
      const tiempoTomaSeg = Math.floor((ahora - new Date(retiro.created_at)) / 1000);
      const snapshot = JSON.stringify(retiro);

      // 2. Marcar como tomado
      await WithdrawalRepository.markAsTaken(conn, withdrawalId, { 
        userId, userName, fecha_toma: ahora, snapshot 
      });

      // 3. Registrar métricas de eficiencia (SaaS Ready)
      await OperatorService.recordOperation(userId, {
        action: 'tomar',
        durationToma: tiempoTomaSeg
      }, tenantId);

      // SaaS Usage: Incrementar contador de retiros
      if (tenantId) {
        await BillingService.trackUsage(tenantId, 'withdrawals_today');
      }

      // 4. Historial de Auditoría
      await conn.query(
        `INSERT INTO historial_retiros (retiro_id, trace_id, accion, usuario_telegram_id, nombre_usuario, metadata, tenant_id) 
         VALUES (?, ?, 'tomar', ?, ?, ?, ?)`,
        [withdrawalId, traceId, userId, userName, snapshot, tenantId]
      );

      logger.info(`[FINTECH] Retiro ${withdrawalId} tomado por ${userName} (${userId})`, { traceId, tenantId });
      return true;
    });
  },

  /**
   * Procesa la aprobación o rechazo de un retiro.
   */
  async processWithdrawal(withdrawalId, action, { userId, userName, traceId, tenantId = null }) {
    return transaction(async (conn) => {
      // 1. Bloqueo y validación de operador responsable
      const [retiro] = await conn.query(
        `SELECT id, tomado_por_telegram_user_id, estado_operativo, tomado_en, monto, telefono_usuario 
         FROM retiros WHERE id=? FOR UPDATE`, 
        [withdrawalId]
      );

      if (!retiro) throw new Error("❌ Retiro no encontrado.");
      
      // Validación estricta: Solo el responsable puede procesar
      if (retiro.tomado_por_telegram_user_id != userId) {
        await TelegramUserRepository.incrementFailedAttempts(conn, userId);
        throw new Error("❌ ACCESO DENEGADO: No eres el operador responsable de este caso.");
      }

      if (retiro.estado_operativo !== 'tomado') {
        throw new Error(`⚠️ Ya procesado o en estado inválido (${retiro.estado_operativo}).`);
      }

      const ahora = new Date();
      const tiempoProcesoSeg = Math.floor((ahora - new Date(retiro.tomado_en)) / 1000);
      
      // 2. Detección de Anomalías (Perfilado de Operador)
      const anomaly = await OperatorService.detectOperatorAnomaly(userId, { action, durationSeg: tiempoProcesoSeg }, tenantId);
      if (anomaly) {
        logger.warn(`[SECURITY] Anomalía detectada en proceso: ${anomaly.type}`, { traceId, userId });
        // Podríamos bloquear el proceso aquí o solo alertar
      }

      const nuevoEstadoOp = action === 'aprobar' ? 'aprobado' : 'rechazado';
      const finalStatus = action === 'aprobar' ? 'completado' : 'rechazado';
      const snapshot = JSON.stringify(retiro);

      // 3. Actualizar estado final
      await WithdrawalRepository.updateStatus(conn, withdrawalId, { 
        estado_operativo: nuevoEstadoOp, 
        procesado_por: userId, 
        fecha_procesado: ahora, 
        estado: finalStatus,
        snapshot
      });

      // 4. Registrar métricas y resetear fallos
      await OperatorService.recordOperation(userId, {
        action,
        durationProceso: tiempoProcesoSeg
      }, tenantId);

      await TelegramUserRepository.resetFailedAttempts(conn, userId);

      // 5. Auditoría Final
      await conn.query(
        `INSERT INTO historial_retiros (retiro_id, trace_id, accion, usuario_telegram_id, nombre_usuario, metadata, tenant_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [withdrawalId, traceId, nuevoEstadoOp, userId, userName, snapshot, tenantId]
      );

      logger.info(`[FINTECH] Retiro ${withdrawalId} ${nuevoEstadoOp} por ${userName}`, { traceId, tenantId });
      return nuevoEstadoOp;
    });
  },

  /**
   * Liberación automática por timeout con Trazabilidad.
   */
  async releaseByTimeout(withdrawalId, { traceId }) {
    return transaction(async (conn) => {
      const [check] = await conn.query(`SELECT estado_operativo, tomado_por_nombre FROM retiros WHERE id=? FOR UPDATE`, [withdrawalId]);
      if (!check || check.estado_operativo !== 'tomado') return;

      await conn.query(
        `UPDATE retiros SET estado_operativo='pendiente', tomado_por_telegram_user_id=NULL, tomado_por_nombre=NULL, tomado_en=NULL WHERE id=?`, 
        [withdrawalId]
      );
      
      await conn.query(
        `INSERT INTO historial_retiros (retiro_id, trace_id, accion, detalles) 
         VALUES (?, ?, 'liberado_timeout', ?)`, 
        [withdrawalId, traceId, `Excedió 10 min (Operador: ${check.tomado_por_nombre})`]
      );

      logger.warn(`[FINTECH] Retiro ${withdrawalId} liberado por timeout`, { traceId });
    });
  }
};
