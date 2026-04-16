import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';
import worker from './TelegramWorker.js';
import { handleCallbackQuery } from '../handlers/telegramHandler.js';
import { setupJobs } from '../jobs/telegramJobs.js';

// Inicialización de múltiples bots
export const botAdmin = process.env.TELEGRAM_BOT_TOKEN_ADMIN ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_ADMIN, { polling: true }) : null;
export const botRetiros = process.env.TELEGRAM_BOT_TOKEN_RETIROS ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_RETIROS, { polling: true }) : null;
export const botSecretaria = process.env.TELEGRAM_BOT_TOKEN_SECRETARIA ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_SECRETARIA, { polling: true }) : null;

console.log("Sistema Multi-Bot iniciado (Admin, Retiros, Secretaria)");

// Funciones de envío centralizadas
export const sendToAdmin = async (message, options = {}) => worker.addToQueue(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, message, options);
export const sendToRetiros = async (message, options = {}) => worker.addToQueue(botRetiros, process.env.TELEGRAM_CHAT_RETIROS, message, options);
export const sendToSecretaria = async (message, options = {}) => worker.addToQueue(botSecretaria, process.env.TELEGRAM_CHAT_SECRETARIA, message, options);

// Handlers de Callbacks
[botAdmin, botRetiros, botSecretaria].forEach(bot => {
  if (bot) bot.on('callback_query', (query) => handleCallbackQuery(bot, query));
});

// Inicializar Tareas Automáticas
setupJobs();

export const formatRetiroMessage = (data) => {
  const { telefono, nivel, monto, hora } = data;
  return `📌 <b>NUEVO RETIRO</b>\n\n👤 Usuario: ${telefono}\n🏅 Nivel: ${nivel}\n💵 Monto: ${monto} Bs\n🕒 Hora: ${hora}`;
};

export const formatRecargaMessage = (data) => {
  const { telefono, nivel, monto } = data;
  return `📌 <b>NUEVA RECARGA</b>\n\n👤 Usuario: ${telefono}\n🏅 Nivel: ${nivel}\n💵 Monto: ${monto} Bs`;
};

export default { botAdmin, botRetiros, botSecretaria, sendToAdmin, sendToRetiros, sendToSecretaria, formatRetiroMessage, formatRecargaMessage };
