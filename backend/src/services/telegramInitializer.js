import logger from '../lib/logger.js';

/**
 * Inicializador centralizado de manejadores de Telegram v7.0.5.
 * Diseñado para aislamiento total y resiliencia de servicios.
 */
export async function initTelegramHandlers() {
  logger.info('[TELEGRAM] Iniciando secuencia de bots...');

  try {
    const { setupAdminBot, setupRetirosBot, setupSecretariaBot } = await import('./telegramBot.js');
    
    // Inicialización en paralelo con control de errores individual
    const bots = [
      { name: 'Admin', setup: setupAdminBot },
      { name: 'Retiros', setup: setupRetirosBot },
      { name: 'Secretaria', setup: setupSecretariaBot }
    ];

    await Promise.all(bots.map(async (bot) => {
      try {
        await bot.setup();
      } catch (err) {
        logger.warn(`[TELEGRAM] No se pudo iniciar el bot ${bot.name}: ${err.message}`);
      }
    }));

    logger.info('[TELEGRAM] Secuencia de inicialización completada.');
  } catch (err) {
    logger.error('[TELEGRAM] Error fatal en el inicializador:', err.message);
  }
}
