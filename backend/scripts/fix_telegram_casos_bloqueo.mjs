import 'dotenv/config';
import mysql from 'mysql2/promise';
import logger from '../src/utils/logger.mjs';

async function fixTelegramTable() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306')
  });

  try {
    logger.info('🚀 Iniciando creación de tabla telegram_casos_bloqueo...');

    // Estructura compatible con backend/src/services/telegramService.mjs
    // Y mejorada con los requerimientos del usuario
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS telegram_casos_bloqueo (
        referencia_id VARCHAR(36) PRIMARY KEY,
        tipo_operacion VARCHAR(50) NOT NULL,
        estado_operativo VARCHAR(50) DEFAULT 'pendiente',
        tomado_por VARCHAR(100) NULL,
        tomado_por_nombre VARCHAR(255) NULL,
        tomado_por_username VARCHAR(100) NULL,
        telegram_message_id VARCHAR(100) NULL,
        chat_id VARCHAR(100) NULL,
        tomado_at TIMESTAMP NULL,
        resuelto_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_telegram_caso (tipo_operacion, referencia_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTableQuery);
    logger.info('✅ Tabla telegram_casos_bloqueo verificada/creada correctamente.');

    // Verificar si las columnas extra existen (por si la tabla ya existía pero era antigua)
    const [columns] = await connection.query('SHOW COLUMNS FROM telegram_casos_bloqueo');
    const columnNames = columns.map(c => c.Field);

    const neededColumns = [
      { name: 'tomado_por_nombre', type: 'VARCHAR(255) NULL AFTER tomado_por' },
      { name: 'tomado_por_username', type: 'VARCHAR(100) NULL AFTER tomado_por_nombre' },
      { name: 'chat_id', type: 'VARCHAR(100) NULL AFTER telegram_message_id' }
    ];

    for (const col of neededColumns) {
      if (!columnNames.includes(col.name)) {
        logger.info(`Adding missing column: ${col.name}`);
        await connection.query(`ALTER TABLE telegram_casos_bloqueo ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    logger.info('🎉 Migración completada con éxito.');
  } catch (error) {
    logger.error('❌ Error en la migración:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

fixTelegramTable();
