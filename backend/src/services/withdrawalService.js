import { transaction, query } from '../config/db.js';
import { WithdrawalRepository, TelegramUserRepository } from '../repositories/telegramRepository.js';

export const WithdrawalService = {
  async takeWithdrawal(withdrawalId, { userId, userName }) {
    return transaction(async (conn) => {
      const [retiro] = await conn.query(
        `SELECT estado_operativo, created_at FROM retiros WHERE id=? FOR UPDATE`, 
        [withdrawalId]
      );

      if (!retiro || retiro.estado_operativo !== 'pendiente') {
        throw new Error("⚠️ Este retiro ya fue tomado o procesado.");
      }

      const ahora = new Date();
      const tiempoTomaSeg = Math.floor((ahora - new Date(retiro.created_at)) / 1000);

      await WithdrawalRepository.markAsTaken(conn, withdrawalId, { userId, userName, fecha_toma: ahora });

      // Métricas
      await conn.query(
        `INSERT INTO estadisticas_operadores (telegram_id, nombre_operador, fecha, total_tomados, tiempo_total_toma_seg)
         VALUES (?, ?, CURDATE(), 1, ?)
         ON DUPLICATE KEY UPDATE 
           total_tomados = total_tomados + 1,
           tiempo_total_toma_seg = tiempo_total_toma_seg + ?`,
        [userId, userName, tiempoTomaSeg, tiempoTomaSeg]
      );

      // Auditoría
      await conn.query(
        `INSERT INTO historial_retiros (retiro_id, accion, usuario_telegram_id, nombre_usuario, metadata) 
         VALUES (?, 'tomar', ?, ?, ?)`,
        [withdrawalId, userId, userName, JSON.stringify(retiro)]
      );

      return true;
    });
  },

  async processWithdrawal(withdrawalId, action, { userId, userName }) {
    return transaction(async (conn) => {
      const [retiro] = await conn.query(
        `SELECT tomado_por, estado_operativo, fecha_toma FROM retiros WHERE id=? FOR UPDATE`, 
        [withdrawalId]
      );

      if (!retiro) throw new Error("❌ Retiro no encontrado.");
      if (retiro.tomado_por != userId) {
        await TelegramUserRepository.incrementFailedAttempts(conn, userId);
        throw new Error("❌ NO AUTORIZADO: No eres el responsable de este caso.");
      }
      if (retiro.estado_operativo !== 'tomado') throw new Error("⚠️ Ya procesado.");

      const ahora = new Date();
      const tiempoProcesoSeg = Math.floor((ahora - new Date(retiro.fecha_toma)) / 1000);
      const nuevoEstado = action === 'aprobar' ? 'aprobado' : 'rechazado';
      const finalStatus = action === 'aprobar' ? 'completado' : 'rechazado';

      await conn.query(
        `UPDATE retiros SET estado_operativo=?, procesado_por=?, fecha_procesado=?, estado=? WHERE id=?`,
        [nuevoEstado, userId, ahora, finalStatus, withdrawalId]
      );

      // Métricas
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

      // Auditoría
      await conn.query(
        `INSERT INTO historial_retiros (retiro_id, accion, usuario_telegram_id, nombre_usuario, metadata) 
         VALUES (?, ?, ?, ?, ?)`,
        [withdrawalId, nuevoEstado, userId, userName, JSON.stringify(retiro)]
      );

      return nuevoEstado;
    });
  }
};
