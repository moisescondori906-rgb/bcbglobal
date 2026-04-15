import TelegramBot from 'node-telegram-bot-api';
import logger from '../lib/logger.js';

// Instancias de los bots
let botAdmin = null;
let botRetiros = null;
let botSecretaria = null;

/**
 * Inicializa los bots de Telegram automáticamente al arrancar el backend
 */
export const initTelegramBots = () => {
  const tokenAdmin = process.env.TELEGRAM_BOT_TOKEN_ADMIN;
  const tokenRetiros = process.env.TELEGRAM_BOT_TOKEN_RETIROS;
  const tokenSecretaria = process.env.TELEGRAM_BOT_TOKEN_SECRETARIA;

  // Inicializar Bot ADMIN
  if (tokenAdmin) {
    try {
      botAdmin = new TelegramBot(tokenAdmin, { polling: true });
      logger.info('✅ Telegram bot ADMIN iniciado correctamente');
    } catch (error) {
      logger.error(`❌ Error al inicializar bot ADMIN: ${error.message}`);
    }
  } else {
    logger.warn('⚠️ TELEGRAM_BOT_TOKEN_ADMIN no configurado');
  }

  // Inicializar Bot RETIROS
  if (tokenRetiros) {
    try {
      botRetiros = new TelegramBot(tokenRetiros, { polling: true });
      logger.info('✅ Telegram bot RETIROS iniciado correctamente');
    } catch (error) {
      logger.error(`❌ Error al inicializar bot RETIROS: ${error.message}`);
    }
  } else {
    logger.warn('⚠️ TELEGRAM_BOT_TOKEN_RETIROS no configurado');
  }

  // Inicializar Bot SECRETARIA
  if (tokenSecretaria) {
    try {
      botSecretaria = new TelegramBot(tokenSecretaria, { polling: true });
      logger.info('✅ Telegram bot SECRETARIA iniciado correctamente');
    } catch (error) {
      logger.error(`❌ Error al inicializar bot SECRETARIA: ${error.message}`);
    }
  } else {
    logger.warn('⚠️ TELEGRAM_BOT_TOKEN_SECRETARIA no configurado');
  }
};

/**
 * Función genérica para enviar mensajes HTML
 */
const sendMessage = async (bot, chatId, message) => {
  if (!bot) {
    logger.warn('⚠️ Intento de enviar mensaje sin bot inicializado');
    return false;
  }
  if (!chatId) {
    logger.warn('⚠️ Intento de enviar mensaje sin chatId configurado');
    return false;
  }

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    logger.info(`[Telegram] Mensaje enviado a chat ${chatId}`);
    return true;
  } catch (error) {
    logger.error(`❌ [Telegram] Error al enviar a ${chatId}: ${error.message}`);
    return false;
  }
};

// Funciones de envío por grupo
export const sendToAdmin = (message) => sendMessage(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, message);
export const sendToRetiros = (message) => sendMessage(botRetiros, process.env.TELEGRAM_CHAT_RETIROS, message);
export const sendToSecretaria = (message) => sendMessage(botSecretaria, process.env.TELEGRAM_CHAT_SECRETARIA, message);

export default {
  initTelegramBots,
  sendToAdmin,
  sendToRetiros,
  sendToSecretaria
};
