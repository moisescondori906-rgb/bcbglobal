const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  console.log('[MIGRATION] Iniciando migración de Tickets de Sorteo...');
  
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: true
  });

  try {
    console.log('[MIGRATION] Conexión a la base de datos establecida.');

    // Ejecutar la migración
    const sql = `
      SET FOREIGN_KEY_CHECKS = 0;

      -- 1. Tabla de Tickets de Sorteo
      CREATE TABLE IF NOT EXISTS tickets_sorteo (
        id VARCHAR(36) PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        usuario_id VARCHAR(36) NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        estado ENUM('Activo', 'Utilizado', 'Anulado') DEFAULT 'Activo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_tickets_usuario (usuario_id),
        INDEX idx_tickets_estado (estado),
        INDEX idx_tickets_codigo (codigo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 2. Tabla de Historial de Recompensas
      CREATE TABLE IF NOT EXISTS historial_recompensas (
        id VARCHAR(36) PRIMARY KEY,
        usuario_receptor VARCHAR(36) NOT NULL,
        usuario_generador VARCHAR(36) NULL,
        nivel_alcanzado VARCHAR(50) NULL,
        cantidad_tickets INT NOT NULL DEFAULT 0,
        motivo VARCHAR(255) NOT NULL,
        estado ENUM('Completado', 'Anulado') DEFAULT 'Completado',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_receptor) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_generador) REFERENCES usuarios(id) ON DELETE SET NULL,
        INDEX idx_recompensas_receptor (usuario_receptor),
        INDEX idx_recompensas_generador (usuario_generador),
        INDEX idx_recompensas_estado (estado),
        UNIQUE KEY idx_recompensa_unica (usuario_generador, nivel_alcanzado, motivo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      SET FOREIGN_KEY_CHECKS = 1;
    `;

    await connection.query(sql);

    console.log('✅ Migración completada exitosamente!');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION-ERROR] Fallo en la migración:', err);
    await connection.end();
    process.exit(1);
  }
}

runMigration();
