import { query, columnExists } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

async function fixPremiosRuletaSchema() {
  logger.info('INICIANDO MIGRACION FORZADA DE premios_ruleta...');
  
  try {
    const tableInfo = await query('DESCRIBE premios_ruleta');
    logger.info('Estructura actual:', tableInfo);

    const columnsToAdd = [
      { name: 'imagen_url', type: 'VARCHAR(255) NULL' },
      { name: 'imagen_public_id', type: 'VARCHAR(100) NULL' },
      { name: 'color', type: 'VARCHAR(20) DEFAULT "#4f46e5"' },
      { name: 'tipo', type: 'VARCHAR(50) DEFAULT "comision"' },
      { name: 'activo', type: 'TINYINT(1) DEFAULT 1' },
      { name: 'orden', type: 'INT DEFAULT 0' }
    ];

    for (const col of columnsToAdd) {
      const exists = await columnExists('premios_ruleta', col.name);
      if (!exists) {
        logger.info(`Agregando columna ${col.name} a premios_ruleta...`);
        try {
          await query(`ALTER TABLE premios_ruleta ADD COLUMN ${col.name} ${col.type}`);
          logger.info(`Columna ${col.name} agregada con éxito.`);
        } catch (alterErr) {
          logger.error(`Error al agregar ${col.name}:`, alterErr.message);
        }
      } else {
        logger.info(`La columna ${col.name} ya existe.`);
      }
    }

    // Asegurar que probabilidad sea DECIMAL(12,2)
    logger.info('Actualizando tipo de columna probabilidad...');
    await query(`ALTER TABLE premios_ruleta MODIFY COLUMN probabilidad DECIMAL(12,2) NOT NULL DEFAULT 0`);
    
    logger.info('MIGRACION FINALIZADA.');
  } catch (err) {
    logger.error('ERROR CRITICO EN MIGRACION:', err);
  } finally {
    process.exit(0);
  }
}

fixPremiosRuletaSchema();
