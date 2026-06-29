import { query, columnExists } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

async function upgradeRuletaSchema() {
  logger.info('INICIANDO MEJORA DE ESQUEMA RULETA V3...');
  
  try {
    // 1. Crear tabla logs_ruleta si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS logs_ruleta (
        id VARCHAR(36) PRIMARY KEY,
        usuario_id VARCHAR(36) NOT NULL,
        premio_id VARCHAR(36) NOT NULL,
        monto_ganado DECIMAL(20, 2) DEFAULT 0.00,
        tickets_antes INT NOT NULL,
        tickets_despues INT NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_logs_ruleta_usuario (usuario_id),
        INDEX idx_logs_ruleta_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Agregar nuevas columnas a premios_ruleta
    const columnsToAdd = [
      { name: 'stock', type: 'INT DEFAULT -1' },
      { name: 'rareza', type: 'ENUM("comun", "raro", "epico", "legendario") DEFAULT "comun"' },
      { name: 'cooldown_individual', type: 'INT DEFAULT 0' }
    ];

    for (const col of columnsToAdd) {
      const exists = await columnExists('premios_ruleta', col.name);
      if (!exists) {
        logger.info(`Agregando columna ${col.name} a premios_ruleta...`);
        await query(`ALTER TABLE premios_ruleta ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // 3. Asegurar que tipo sea VARCHAR para mayor flexibilidad
    await query(`ALTER TABLE premios_ruleta MODIFY COLUMN tipo VARCHAR(50) DEFAULT 'comision'`);

    logger.info('MEJORA DE ESQUEMA RULETA V3 FINALIZADA.');
  } catch (err) {
    logger.error('ERROR EN MEJORA DE ESQUEMA V3:', err);
  } finally {
    process.exit(0);
  }
}

upgradeRuletaSchema();
