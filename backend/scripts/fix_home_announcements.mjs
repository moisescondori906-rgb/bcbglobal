import { query } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';

async function migrate() {
  logger.info('Iniciando migración para comunicados de inicio...');

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS comunicados_home ( 
        id VARCHAR(36) PRIMARY KEY, 
        titulo VARCHAR(150) NULL, 
        mensaje TEXT NOT NULL, 
        imagen_url TEXT NULL, 
        imagen_public_id VARCHAR(255) NULL, 
        activo TINYINT(1) DEFAULT 1, 
        orden INT DEFAULT 0, 
        created_by VARCHAR(36) NULL, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, 
        INDEX idx_comunicados_home_activo (activo), 
        INDEX idx_comunicados_home_orden (orden) 
      )
    `);
    logger.info('Tabla comunicados_home asegurada');

    logger.info('Migración de comunicados completada.');
    process.exit(0);
  } catch (err) {
    logger.error('Error en migración de comunicados: ' + err.message);
    process.exit(1);
  }
}

migrate();
