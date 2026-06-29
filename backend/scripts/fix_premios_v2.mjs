import { query, columnExists } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

async function fixPremiosRuletaSchema() {
  logger.info('INICIANDO MIGRACION V2 DE premios_ruleta...');
  
  try {
    const columnsToAdd = [
      { name: 'imagen_url', type: 'TEXT NULL' },
      { name: 'imagen_public_id', type: 'VARCHAR(100) NULL' },
      { name: 'color', type: 'VARCHAR(20) DEFAULT "#4f46e5"' }
    ];

    for (const col of columnsToAdd) {
      const exists = await columnExists('premios_ruleta', col.name);
      if (!exists) {
        logger.info(`Agregando columna ${col.name} a premios_ruleta...`);
        await query(`ALTER TABLE premios_ruleta ADD COLUMN ${col.name} ${col.type}`);
        logger.info(`Columna ${col.name} agregada con éxito.`);
      } else {
        logger.info(`La columna ${col.name} ya existe.`);
      }
    }

    // Asegurar que probabilidad sea DECIMAL(12,2)
    logger.info('Actualizando tipo de columna probabilidad...');
    await query(`ALTER TABLE premios_ruleta MODIFY COLUMN probabilidad DECIMAL(12,2) NOT NULL DEFAULT 0.00`);
    
    // Asegurar que tipo sea VARCHAR en lugar de ENUM para mayor flexibilidad si es necesario
    const [tipoCol] = await query(`SHOW COLUMNS FROM premios_ruleta LIKE 'tipo'`);
    if (tipoCol && tipoCol.Type.includes('enum')) {
      logger.info('Convertiendo columna tipo de ENUM a VARCHAR...');
      await query(`ALTER TABLE premios_ruleta MODIFY COLUMN tipo VARCHAR(50) DEFAULT 'comision'`);
    }

    logger.info('MIGRACION V2 FINALIZADA.');
  } catch (err) {
    logger.error('ERROR EN MIGRACION V2:', err);
  } finally {
    process.exit(0);
  }
}

fixPremiosRuletaSchema();
