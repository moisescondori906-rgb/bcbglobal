import logger from '../utils/logger.js';

/**
 * Inicializador centralizado de manejadores de Telegram v7.0.5.
 * Diseñado para aislamiento total y resiliencia de servicios.
 */
export async function initTelegramHandlers() {
  // Evitar múltiples instancias de bots en modo Cluster de PM2
  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') {
    logger.info(`[TELEGRAM] Saltando inicialización en instancia ${process.env.NODE_APP_INSTANCE} (Solo instancia 0)`);
    return;
  }

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

    // Cargar lógica de eventos y callbacks
    try {
      const { setupTelegramLogic } = await import('./telegramService.js');
      await setupTelegramLogic();
      logger.info('[TELEGRAM] Lógica de eventos cargada.');
    } catch (err) {
      logger.error('[TELEGRAM] Error al cargar lógica de eventos:', err.message);
    }

    logger.info('[TELEGRAM] Secuencia de inicialización completada.');
  } catch (err) {
    logger.error('[TELEGRAM] Error fatal en el inicializador:', err.message);
  }
}
