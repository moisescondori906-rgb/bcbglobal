import { query, queryOne } from '../config/db.js';

export const WithdrawalRepository = {
  async findByIdWithLevel(id) {
    return queryOne(
      `SELECT r.*, n.nombre as nivel_nombre FROM retiros r 
       JOIN niveles n ON r.nivel_id = n.id WHERE r.id=?`, 
      [id]
    );
  },

  async updateStatus(id, { estado_operativo, procesado_por, fecha_procesado, estado }) {
    return query(
      `UPDATE retiros 
       SET estado_operativo=?, procesado_por=?, fecha_procesado=?, estado=? 
       WHERE id=?`,
      [estado_operativo, procesado_por, fecha_procesado, estado, id]
    );
  },

  async markAsTaken(conn, id, { userId, userName, fecha_toma }) {
    return conn.query(
      `UPDATE retiros 
       SET estado_operativo='tomado', tomado_por=?, tomado_por_nombre=?, fecha_toma=? 
       WHERE id=?`,
      [userId, userName, fecha_toma, id]
    );
  }
};

export const TelegramUserRepository = {
  async findById(telegramId) {
    return queryOne(
      `SELECT rol, activo, intentos_fallidos FROM usuarios_telegram WHERE telegram_id=?`,
      [telegramId]
    );
  },

  async incrementFailedAttempts(conn, telegramId) {
    return conn.query(
      `UPDATE usuarios_telegram SET intentos_fallidos = intentos_fallidos + 1 WHERE telegram_id=?`, 
      [telegramId]
    );
  },

  async resetFailedAttempts(conn, telegramId) {
    return conn.query(
      `UPDATE usuarios_telegram SET intentos_fallidos = 0 WHERE telegram_id=?`, 
      [telegramId]
    );
  }
};
