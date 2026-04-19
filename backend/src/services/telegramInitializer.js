import logger from '../lib/logger.js';
import { query } from '../config/db.js';

/**
 * Inicializador centralizado de manejadores de Telegram.
 * Diseñado para evitar dependencias circulares y asegurar resiliencia.
 */
export async function initTelegramHandlers() {
  logger.info('[TELEGRAM] Iniciando servicios de bots...');

  try {
    // 1. Validar si los bots deben iniciar (Check de base de datos opcional)
    const botsConfig = await query('SELECT clave, valor FROM configuraciones WHERE clave LIKE "TELEGRAM_BOT_%"');
    
    // 2. Importación dinámica para evitar bloqueos si un archivo está corrupto
    const { setupAdminBot } = await import('./telegramBot.js');
    
    // 3. Inicializar cada bot de forma independiente con try/catch individual
    // Bot Admin (El más crítico)
    try {
      if (!process.env.TELEGRAM_BOT_TOKEN_ADMIN) {
        logger.warn('[TELEGRAM] TELEGRAM_BOT_TOKEN_ADMIN no configurado. Saltando...');
      } else {
        await setupAdminBot();
        logger.info('[TELEGRAM] Admin Bot iniciado correctamente.');
      }
    } catch (botErr) {
      logger.error('[TELEGRAM] Error iniciando Admin Bot:', botErr.message);
    }

    // Aquí se pueden agregar más bots (Secretaria, Retiros, etc.) siguiendo el mismo patrón
    
    logger.info('[TELEGRAM] Proceso de inicialización finalizado.');
  } catch (err) {
    logger.error('[TELEGRAM] Error fatal en el inicializador:', err.message);
    // IMPORTANTE: No relanzamos el error para no tumbar el servidor Express
  }
}
