import TelegramBot from 'node-telegram-bot-api';
import logger from '../lib/logger.js';

const token = process.env.TELEGRAM_BOT_TOKEN;

let bot = null;

/**
 * Inicializa el bot de Telegram
 */
export const initTelegramBot = () => {
  if (!token) {
    logger.warn('⚠️ TELEGRAM_BOT_TOKEN no configurado en .env. El servicio de Telegram no se iniciará.');
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    
    bot.on('polling_error', (error) => {
      logger.error(`[Telegram Polling Error]: ${error.message}`);
    });

    logger.info('✅ Telegram bot iniciado correctamente');
    return bot;
  } catch (error) {
    logger.error(`❌ Error al inicializar Telegram bot: ${error.message}`);
    return null;
  }
};

/**
 * Envía un mensaje a un chatId específico
 * @param {string|number} chatId 
 * @param {string} message 
 * @returns {Promise<boolean>}
 */
export const sendTelegramMessage = async (chatId, message) => {
  if (!bot) {
    logger.warn('⚠️ Intento de enviar mensaje de Telegram sin bot inicializado');
    return false;
  }

  if (!chatId) {
    logger.warn('⚠️ Intento de enviar mensaje de Telegram sin chatId');
    return false;
  }

  try {
    await bot.sendMessage(chatId, message);
    logger.info(`Mensaje enviado a Telegram: ${chatId}`);
    return true;
  } catch (error) {
    logger.error(`❌ Error al enviar mensaje a Telegram (${chatId}): ${error.message}`);
    return false;
  }
};

/**
 * Función para prueba real de conexión
 */
export const sendTestMessage = async (testChatId) => {
  const message = "🚀 Bot conectado correctamente al backend de BCB Global";
  return await sendTelegramMessage(testChatId, message);
};

export default {
  initTelegramBot,
  sendTelegramMessage,
  sendTestMessage
};
