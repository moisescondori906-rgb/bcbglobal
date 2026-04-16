import { transaction, query } from '../config/db.js';
import { WithdrawalRepository, TelegramUserRepository } from '../repositories/telegramRepository.js';
import logger from '../lib/logger.js';

/**
 * WithdrawalService - Lógica de Negocio Financiera.
 * Implementa concurrencia nivel banco y auditoría total.
 */
export const WithdrawalService = {
  /**
   * Toma un retiro con bloqueo de fila para evitar race conditions.
   */
  async takeWithdrawal(withdrawalId, { userId, userName }) {
    return transaction(async (conn) => {
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

      // 3. Registrar métricas de eficiencia
      await conn.query(
        `INSERT INTO estadisticas_operadores (telegram_id, nombre_operador, fecha, total_tomados, tiempo_total_toma_seg)
         VALUES (?, ?, CURDATE(), 1, ?)
         ON DUPLICATE KEY UPDATE 
           total_tomados = total_tomados + 1,
           tiempo_total_toma_seg = tiempo_total_toma_seg + ?`,
        [userId, userName, tiempoTomaSeg, tiempoTomaSeg]
      );

      // 4. Historial de Auditoría
      await conn.query(
        `INSERT INTO historial_retiros (retiro_id, accion, usuario_telegram_id, nombre_usuario, metadata) 
         VALUES (?, 'tomar', ?, ?, ?)`,
        [withdrawalId, userId, userName, snapshot]
      );

      logger.info(`[FINTECH] Retiro ${withdrawalId} tomado por ${userName} (${userId})`);
      return true;
    });
  },

  /**
   * Procesa la aprobación o rechazo de un retiro.
   */
  async processWithdrawal(withdrawalId, action, { userId, userName }) {
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
      const nuevoEstadoOp = action === 'aprobar' ? 'aprobado' : 'rechazado';
      const finalStatus = action === 'aprobar' ? 'completado' : 'rechazado';
      const snapshot = JSON.stringify(retiro);

      // 2. Actualizar estado final
      await WithdrawalRepository.updateStatus(conn, withdrawalId, { 
        estado_operativo: nuevoEstadoOp, 
        procesado_por: userId, 
        fecha_procesado: ahora, 
        estado: finalStatus,
        snapshot
      });

      // 3. Registrar métricas y resetear fallos
      const colEstado = action === 'aprobar' ? 'total_aprobados' : 'total_rechazados';
      await conn.query(
        `INSERT INTO estadisticas_operadores (telegram_id, nombre_operador, fecha, ${colEstado}, tiempo_total_proceso_seg)
         VALUES (?, ?, CURDATE(), 1, ?)
         ON DUPLICATE KEY UPDATE 
           ${colEstado} = ${colEstado} + 1,
           tiempo_total_proceso_seg = tiempo_total_proceso_seg + ?`,
        [userId, userName, tiempoProcesoSeg, tiempoProcesoSeg]
      );

      await TelegramUserRepository.resetFailedAttempts(conn, userId);

      // 4. Auditoría Final
      await conn.query(
        `INSERT INTO historial_retiros (retiro_id, accion, usuario_telegram_id, nombre_usuario, metadata) 
         VALUES (?, ?, ?, ?, ?)`,
        [withdrawalId, nuevoEstadoOp, userId, userName, snapshot]
      );

      logger.info(`[FINTECH] Retiro ${withdrawalId} ${nuevoEstadoOp} por ${userName}`);
      return nuevoEstadoOp;
    });
  }
};
