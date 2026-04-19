import logger from '../lib/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_VARS = [
  'PORT',
  'JWT_SECRET',
  'MYSQL_HOST',
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'MYSQL_DATABASE',
  'REDIS_HOST',
  'TELEGRAM_BOT_TOKEN_ADMIN',
  'TELEGRAM_CHAT_ADMIN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

/**
 * Valida que todas las variables de entorno necesarias estén presentes.
 * Si falta alguna, el proceso se detiene inmediatamente.
 */
export function validateEnv() {
  const missing = REQUIRED_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`[FATAL] Faltan variables de entorno críticas: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Normalización de variables
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.PORT = process.env.PORT || '4000';

  logger.info(`[ENV] Configuración validada correctamente (Modo: ${process.env.NODE_ENV})`);
}

export default validateEnv;
