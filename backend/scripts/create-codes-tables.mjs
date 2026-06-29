
import { query } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';

async function main() {
  try {
    logger.info('Creating codigos_canje table...');
    await query(`
      CREATE TABLE IF NOT EXISTS codigos_canje (
        id VARCHAR(36) PRIMARY KEY,
        codigo VARCHAR(255) NOT NULL UNIQUE,
        valor DECIMAL(10, 2) NOT NULL DEFAULT 0,
        max_usos INT NOT NULL DEFAULT 1,
        min_level_id VARCHAR(36) NULL,
        expires_at DATETIME NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_by VARCHAR(36) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_codigo (codigo),
        INDEX idx_activo (activo),
        FOREIGN KEY (min_level_id) REFERENCES niveles(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    logger.info('Creating codigos_canje_usos table...');
    await query(`
      CREATE TABLE IF NOT EXISTS codigos_canje_usos (
        id VARCHAR(36) PRIMARY KEY,
        codigo_id VARCHAR(36) NOT NULL,
        usuario_id VARCHAR(36) NOT NULL,
        valor DECIMAL(10, 2) NOT NULL DEFAULT 0,
        usado_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_codigo (codigo_id),
        INDEX idx_usuario (usuario_id),
        FOREIGN KEY (codigo_id) REFERENCES codigos_canje(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    logger.info('Tables created successfully!');
    process.exit(0);
  } catch (err) {
    logger.error('Error creating tables:', err);
    process.exit(1);
  }
}

main();
