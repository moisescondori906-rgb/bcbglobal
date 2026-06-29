import { query } from '../src/services/dbService.mjs';
import logger from '../src/utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

export const run = async () => {
  logger.info('Verificando conexión a MySQL...');
  try {
    await query('SELECT 1 + 1 AS solution');
    logger.info('Conexión a MySQL exitosa!');
  } catch (error) {
    logger.error(`Fallo la conexión a MySQL: ${error.message}`);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
