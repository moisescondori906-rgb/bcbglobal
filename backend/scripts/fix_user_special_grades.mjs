import { query } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';

async function migrate() {
  logger.info('Iniciando migración para grados especiales de usuario...');

  try {
    const columns = await query(`SHOW COLUMNS FROM usuarios`);
    const hasGrado = columns.some(c => c.Field === 'grado_colaborador');
    const hasSalario = columns.some(c => c.Field === 'salario_colaborador');
    const hasUpdated = columns.some(c => c.Field === 'grado_colaborador_updated_at');

    if (!hasGrado) {
      await query(`ALTER TABLE usuarios ADD COLUMN grado_colaborador VARCHAR(50) DEFAULT 'ninguno'`);
      logger.info('Columna grado_colaborador agregada');
    }
    if (!hasSalario) {
      await query(`ALTER TABLE usuarios ADD COLUMN salario_colaborador DECIMAL(10,2) DEFAULT 0.00`);
      logger.info('Columna salario_colaborador agregada');
    }
    if (!hasUpdated) {
      await query(`ALTER TABLE usuarios ADD COLUMN grado_colaborador_updated_at TIMESTAMP NULL`);
      logger.info('Columna grado_colaborador_updated_at agregada');
    }

    logger.info('Migración de grados completada.');
    process.exit(0);
  } catch (err) {
    logger.error('Error en migración de grados: ' + err.message);
    process.exit(1);
  }
}

migrate();
