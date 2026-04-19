import winston from 'winston';
import 'dotenv/config';

const { combine, timestamp, printf, colorize, json } = winston.format;

const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`;
  if (Object.keys(metadata).length > 0 && level !== 'info') {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'bcb-global-fintech' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    // Log específico para transacciones financieras
    new winston.transports.File({ filename: 'logs/finance.log', level: 'info', format: combine(
      timestamp(),
      printf(({ message, timestamp, module }) => {
        return module === 'FINANCE' ? `${timestamp} : ${message}` : '';
      })
    )}),
    // Log específico para Telegram
    new winston.transports.File({ filename: 'logs/telegram.log', level: 'info', format: combine(
      timestamp(),
      printf(({ message, timestamp, module }) => {
        return (module === 'TELEGRAM' || message.includes('[TELEGRAM')) ? `${timestamp} : ${message}` : '';
      })
    )}),
    // Log específico para Base de Datos
    new winston.transports.File({ filename: 'logs/database.log', level: 'info', format: combine(
      timestamp(),
      printf(({ message, timestamp, module }) => {
        return module === 'DATABASE' ? `${timestamp} : ${message}` : '';
      })
    )}),
  ],
});

/**
 * Crea un logger específico para un módulo.
 */
export const createModuleLogger = (moduleName) => {
  return {
    info: (msg, meta = {}) => logger.info(msg, { ...meta, module: moduleName.toUpperCase() }),
    error: (msg, meta = {}) => logger.error(msg, { ...meta, module: moduleName.toUpperCase() }),
    warn: (msg, meta = {}) => logger.warn(msg, { ...meta, module: moduleName.toUpperCase() }),
    debug: (msg, meta = {}) => logger.debug(msg, { ...meta, module: moduleName.toUpperCase() }),
  };
};

// En producción también queremos ver logs en consola para PM2
logger.add(new winston.transports.Console({
  format: combine(
    colorize(),
    timestamp({ format: 'HH:mm:ss' }),
    customFormat
  ),
}));

export default logger;
