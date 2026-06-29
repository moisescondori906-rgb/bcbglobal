import { default as redis } from '../src/services/redisService.mjs';
import logger from '../src/utils/logger.mjs';
import 'dotenv/config';

export const run = async () => {
  logger.info('Verificando conexión a Redis...');
  try {
    await redis.ping();
    logger.info('Conexión a Redis exitosa!');
  } catch (error) {
    logger.error(`Fallo la conexión a Redis: ${error.message}`);
    process.exit(1);
  } finally {
    await redis.quit();
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
