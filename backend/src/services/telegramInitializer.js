import { botAdmin, botRetiros, botSecretaria } from './telegramBot.js';
import { handleCallbackQuery } from '../handlers/telegramHandler.js';
import logger from '../lib/logger.js';

export const initTelegramHandlers = () => {
  const registerHandlers = (bot, name) => {
    if (!bot) {
      logger.warn(`[TELEGRAM] No se pueden registrar handlers para ${name} (Bot no inicializado).`);
      return;
    }
    
    bot.on('callback_query', (query) => {
      handleCallbackQuery(bot, query).catch(err => {
        logger.error(`[TELEGRAM] Error en callback_query de ${name}:`, err);
      });
    });
    
    // Manejo de errores globales por bot
    bot.on('error', (err) => logger.error(`[TELEGRAM] Bot ${name} Error: ${err.message}`));
    bot.on('polling_error', (err) => logger.debug(`[TELEGRAM] Bot ${name} Polling Error: ${err.message}`));
    
    logger.info(`[TELEGRAM] Handlers registrados para ${name}.`);
  };

  registerHandlers(botAdmin, 'ADMIN');
  registerHandlers(botRetiros, 'RETIROS');
  registerHandlers(botSecretaria, 'SECRETARIA');
};
