import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';
import logger from '../lib/logger.js';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN no definido");
}

const token = process.env.TELEGRAM_BOT_TOKEN;
export let bot = null;

/**
 * Inicializa el bot de Telegram (Un solo bot para todos los grupos)
 */
export const initTelegramBot = () => {
  if (!token) {
    return null;
  }

  try {
    if (!bot) {
      bot = new TelegramBot(token, { polling: true });
      console.log("Telegram bot iniciado correctamente");
    }
    return bot;
  } catch (error) {
    console.error(`❌ Error al inicializar Telegram bot: ${error.message}`);
    return null;
  }
};

// Auto-inicializar al importar
initTelegramBot();

/**
 * Función genérica para enviar mensajes HTML
 */
export const sendMessage = async (chatId, message) => {
  if (!bot) {
    // Intentar re-inicializar si bot es null
    initTelegramBot();
    if (!bot) return false;
  }

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    console.log("Telegram enviado correctamente:", chatId);
    return true;
  } catch (error) {
    console.error("Error Telegram:", error.message);
    return false;
  }
};

// Funciones de envío por grupo (Usando Chat IDs de .env)
export const sendToAdmin = (message) => sendMessage(process.env.TELEGRAM_CHAT_ADMIN, message);
export const sendToRetiros = (message) => sendMessage(process.env.TELEGRAM_CHAT_RETIROS, message);
export const sendToSecretaria = (message) => sendMessage(process.env.TELEGRAM_CHAT_SECRETARIA, message);

/**
 * Formateador de mensajes para RETIROS
 */
export const formatRetiroMessage = (data) => {
  const { telefono, nivel, monto, hora } = data;
  return `
📌 <b>NUEVO RETIRO</b>

👤 Usuario: ${telefono}
🏅 Nivel: ${nivel}
💵 Monto: ${monto} Bs
🕒 Hora: ${hora}
`.trim();
};

/**
 * Formateador de mensajes para RECARGAS
 */
export const formatRecargaMessage = (data) => {
  const { telefono, nivel, monto } = data;
  return `
📌 <b>NUEVA RECARGA</b>

👤 Usuario: ${telefono}
🏅 Nivel: ${nivel}
💵 Monto: ${monto} Bs
`.trim();
};

export default {
  initTelegramBot,
  sendMessage,
  sendToAdmin,
  sendToRetiros,
  sendToSecretaria,
  formatRetiroMessage,
  formatRecargaMessage
};
