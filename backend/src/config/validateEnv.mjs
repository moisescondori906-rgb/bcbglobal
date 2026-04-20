import logger from '../utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_VARS = [
  'JWT_SECRET',
  'MYSQL_HOST',
  'MYSQL_USER',
  'MYSQL_DATABASE'
];

/**
 * Valida que todas las variables de entorno necesarias estén presentes.
 * Si falta alguna, el proceso se detiene inmediatamente.
 */
export function validateEnv() {
  const missing = REQUIRED_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ ERROR CRÍTICO: Faltan variables de entorno esenciales: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Normalización de variables
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.PORT = process.env.PORT || '4000';

  console.log(`✅ Configuración validada correctamente (Modo: ${process.env.NODE_ENV})`);
}

export default validateEnv;
