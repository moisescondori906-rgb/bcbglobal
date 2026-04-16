import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';
import worker from './TelegramWorker.js';
import { handleCallbackQuery } from '../handlers/telegramHandler.js';
import { setupJobs } from '../jobs/telegramJobs.js';

// Inicialización de múltiples bots con reintento de conexión
const initBot = (token, name) => {
  if (!token) return null;
  const bot = new TelegramBot(token, { polling: true });
  bot.on('polling_error', (err) => console.error(`[TELEGRAM] Error en ${name}:`, err.message));
  console.log(`[TELEGRAM] Bot ${name} iniciado.`);
  return bot;
};

export const botAdmin = initBot(process.env.TELEGRAM_BOT_TOKEN_ADMIN, 'ADMIN');
export const botRetiros = initBot(process.env.TELEGRAM_BOT_TOKEN_RETIROS, 'RETIROS');
export const botSecretaria = initBot(process.env.TELEGRAM_BOT_TOKEN_SECRETARIA, 'SECRETARIA');

// Funciones de envío centralizadas usando el Worker (Cola y Reintentos)
export const sendToAdmin = async (message, options = {}) => 
  worker.addToQueue(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, message, options);

export const sendToRetiros = async (message, options = {}) => 
  worker.addToQueue(botRetiros, process.env.TELEGRAM_CHAT_RETIROS, message, options);

export const sendToSecretaria = async (message, options = {}) => 
  worker.addToQueue(botSecretaria, process.env.TELEGRAM_CHAT_SECRETARIA, message, options);

// Registro de Handlers de Callback para los 3 bots
[botAdmin, botRetiros, botSecretaria].forEach(bot => {
  if (bot) {
    bot.on('callback_query', (query) => handleCallbackQuery(bot, query));
  }
});

// Inicializar Tareas Programadas (Jobs)
setupJobs();

/**
 * Formateo de mensajes robustos para nuevas solicitudes
 */
export const formatRetiroMessage = (withdrawal) => {
  return `📌 <b>NUEVO RETIRO FINTECH</b>\n\n` +
    `🆔 ID: <b>${withdrawal.id}</b>\n` +
    `👤 Usuario: ${withdrawal.telefono_usuario}\n` +
    `🏅 Nivel: ${withdrawal.nivel_nombre || 'N/A'}\n` +
    `💵 Monto: <b>${withdrawal.monto} Bs</b>\n` +
    `🕒 Hora (BO): ${new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}\n\n` +
    `⚡ <i>Un operador debe tomar este caso para procesarlo.</i>`;
};

export const formatRecargaMessage = (recharge) => {
  return `📌 <b>NUEVA RECARGA FINTECH</b>\n\n` +
    `👤 Usuario: ${recharge.telefono_usuario}\n` +
    `🏅 Nivel: ${recharge.nivel_nombre || 'N/A'}\n` +
    `💵 Monto: <b>${recharge.monto} Bs</b>\n` +
    `🕒 Hora (BO): ${new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}`;
};

export default { 
  botAdmin, botRetiros, botSecretaria, 
  sendToAdmin, sendToRetiros, sendToSecretaria, 
  formatRetiroMessage, formatRecargaMessage 
};
