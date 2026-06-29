const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('Running migration for qr_registros table...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS qr_registros (
        id CHAR(36) PRIMARY KEY,
        qr_original_id CHAR(36) DEFAULT NULL,
        usuario_id CHAR(36) DEFAULT NULL,
        imagen_url TEXT NOT NULL,
        estado VARCHAR(20) DEFAULT 'no_pagado',
        monto DECIMAL(12,2) DEFAULT NULL,
        numero_cuenta VARCHAR(100) DEFAULT NULL,
        observaciones TEXT,
        fecha_pagado DATETIME DEFAULT NULL,
        procesado_por CHAR(36) DEFAULT NULL,
        telegram_chat_id VARCHAR(50) DEFAULT NULL,
        telegram_message_id VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_qr_registros_estado (estado),
        INDEX idx_qr_registros_usuario (usuario_id),
        INDEX idx_qr_registros_fecha (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableQuery);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await connection.end();
  }
}

runMigration();

