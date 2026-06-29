import { query } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

async function upgradeRuletaV4() {
  logger.info('INICIANDO MIGRACION RULETA V4 (SISTEMA DE PRIVILEGIOS)...');
  
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ruleta_forzada (
        id VARCHAR(36) PRIMARY KEY,
        usuario_id VARCHAR(36) NOT NULL,
        premio_id VARCHAR(36) NOT NULL,
        activo TINYINT(1) DEFAULT 1,
        usado TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ruleta_forzada_usuario (usuario_id),
        INDEX idx_ruleta_forzada_activo (activo, usado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    logger.info('MIGRACION RULETA V4 FINALIZADA.');
  } catch (err) {
    logger.error('ERROR EN MIGRACION RULETA V4:', err);
  } finally {
    process.exit(0);
  }
}

upgradeRuletaV4();
