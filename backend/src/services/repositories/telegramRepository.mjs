import { query, queryOne } from '../../config/db.mjs';

/**
 * WithdrawalRepository - Capa de acceso a datos para Retiros.
 * Usa COALESCE y validaciones para evitar valores nulos.
 */
export const WithdrawalRepository = {
  async findByIdWithLevel(id) {
    return queryOne(
      `SELECT r.*, COALESCE(n.nombre, 'Sin Nivel') as nivel_nombre 
       FROM retiros r 
       LEFT JOIN niveles n ON r.nivel_id = n.id 
       WHERE r.id=?`, 
      [id]
    );
  },

  async updateStatus(conn, id, { estado_operativo, procesado_por, fecha_procesado, estado, snapshot }) {
    return conn.query(
      `UPDATE retiros 
       SET estado_operativo=?, resuelto_por_telegram_user_id=?, resuelto_en=?, estado=?, metadata_snap=? 
       WHERE id=?`,
      [estado_operativo, procesado_por, fecha_procesado, estado, snapshot, id]
    );
  },

  async markAsTaken(conn, id, { userId, userName, fecha_toma, snapshot }) {
    return conn.query(
      `UPDATE retiros 
       SET estado_operativo='tomado', tomado_por_telegram_user_id=?, tomado_por_nombre=?, tomado_en=?, metadata_snap=? 
       WHERE id=?`,
      [userId, userName, fecha_toma, snapshot, id]
    );
  },

  async markAsAlerted(id) {
    return query(`UPDATE retiros SET alertado=1 WHERE id=?`, [id]);
  },

  async findPendingForAlert(minutes = 5) {
    return query(
      `SELECT id, monto, telefono_usuario FROM retiros 
       WHERE estado_operativo='pendiente' AND alertado=0 
       AND created_at < NOW() - INTERVAL ? MINUTE`, 
      [minutes]
    );
  }
};

/**
 * TelegramUserRepository - Capa de acceso a datos para Operadores.
 */
export const TelegramUserRepository = {
  async findById(telegramId) {
    return queryOne(
      `SELECT telegram_id, nombre, rol, activo, intentos_fallidos, tenant_id, COALESCE(ultima_actividad, created_at) as ultima_actividad 
       FROM usuarios_telegram WHERE telegram_id=?`,
      [telegramId]
    );
  },

  async incrementFailedAttempts(conn, telegramId) {
    return conn.query(
      `UPDATE usuarios_telegram SET intentos_fallidos = intentos_fallidos + 1, ultima_actividad=NOW() WHERE telegram_id=?`, 
      [telegramId]
    );
  },

  async resetFailedAttempts(conn, telegramId) {
    return conn.query(
      `UPDATE usuarios_telegram SET intentos_fallidos = 0, ultima_actividad=NOW() WHERE telegram_id=?`, 
      [telegramId]
    );
  },

  async blockUser(telegramId, reason) {
    return query(
      `UPDATE usuarios_telegram SET activo=0 WHERE telegram_id=?`, 
      [telegramId]
    );
  }
};

/**
 * CronRepository - Control de ejecución única de procesos.
 */
export const CronRepository = {
  async isExecuted(tipo, fecha) {
    return queryOne(
      `SELECT id FROM control_cron WHERE tipo=? AND fecha=? AND resultado='exito'`,
      [tipo, fecha]
    );
  },

  async registerExecution(tipo, fecha, { resultado = 'exito', detalles = '' } = {}) {
    return query(
      `INSERT INTO control_cron (tipo, fecha, resultado, detalles) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE ejecutado_en=NOW(), resultado=VALUES(resultado), detalles=VALUES(detalles)`,
      [tipo, fecha, resultado, detalles]
    );
  }
};
