import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';
import { enqueueTelegramMessage } from './BullMQService.js';
import { handleCallbackQuery } from '../handlers/telegramHandler.js';
import { setupJobs } from '../jobs/telegramJobs.js';
import logger from '../lib/logger.js';

// Inicialización de múltiples bots con Webhook (Alta Carga)
const initBot = (token, name) => {
  if (!token) return null;
  const bot = new TelegramBot(token, { polling: false }); // Desactivar polling
  logger.info(`[TELEGRAM] Bot ${name} iniciado en MODO WEBHOOK.`);
  return bot;
};

export const botAdmin = initBot(process.env.TELEGRAM_BOT_TOKEN_ADMIN, 'ADMIN');
export const botRetiros = initBot(process.env.TELEGRAM_BOT_TOKEN_RETIROS, 'RETIROS');
export const botSecretaria = initBot(process.env.TELEGRAM_BOT_TOKEN_SECRETARIA, 'SECRETARIA');

/**
 * Migración a WEBHOOKS: 
 * Los bots ya no escuchan activamente, Express recibe el POST de Telegram.
 */
export const setupWebhooks = async (app) => {
  const url = process.env.BACKEND_URL || 'https://tu-dominio.com';
  const tokens = {
    admin: process.env.TELEGRAM_BOT_TOKEN_ADMIN,
    retiros: process.env.TELEGRAM_BOT_TOKEN_RETIROS,
    secretaria: process.env.TELEGRAM_BOT_TOKEN_SECRETARIA
  };

  for (const [key, token] of Object.entries(tokens)) {
    if (token) {
      const webhookPath = `/api/telegram-webhook/${key}`;
      await (key === 'admin' ? botAdmin : key === 'retiros' ? botRetiros : botSecretaria)
        .setWebHook(`${url}${webhookPath}`);
      
      logger.info(`[WEBHOOK] ${key.toUpperCase()} configurado en ${webhookPath}`);
    }
  }

  // Endpoints para Webhooks
  app.post('/api/telegram-webhook/:botType', (req, res) => {
    const { botType } = req.params;
    const bot = botType === 'admin' ? botAdmin : botType === 'retiros' ? botRetiros : botSecretaria;
    
    if (bot) {
      bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  });
};

// Funciones de envío centralizadas (BullMQ Queue)
export const sendToAdmin = async (message, options = {}) => 
  enqueueTelegramMessage(process.env.TELEGRAM_BOT_TOKEN_ADMIN, process.env.TELEGRAM_CHAT_ADMIN, message, options);

export const sendToRetiros = async (message, options = {}) => 
  enqueueTelegramMessage(process.env.TELEGRAM_BOT_TOKEN_RETIROS, process.env.TELEGRAM_CHAT_RETIROS, message, options);

export const sendToSecretaria = async (message, options = {}) => 
  enqueueTelegramMessage(process.env.TELEGRAM_BOT_TOKEN_SECRETARIA, process.env.TELEGRAM_CHAT_SECRETARIA, message, options);

// Registro de Handlers de Callback para los 3 bots (Recibidos vía Webhook)
[botAdmin, botRetiros, botSecretaria].forEach(bot => {
  if (bot) {
    bot.on('callback_query', (query) => handleCallbackQuery(bot, query));
  }
});

// Inicializar Tareas Programadas (Jobs)
setupJobs();

export const formatRetiroMessage = (withdrawal) => {
  return `📌 <b>NUEVO RETIRO FINTECH</b>\n\n🆔 ID: <b>${withdrawal.id}</b>\n👤 Usuario: ${withdrawal.telefono_usuario}\n🏅 Nivel: ${withdrawal.nivel_nombre || 'N/A'}\n💵 Monto: <b>${withdrawal.monto} Bs</b>\n🕒 Hora (BO): ${new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}\n\n⚡ <i>Un operador debe tomar este caso para procesarlo.</i>`;
};

export const formatRecargaMessage = (recharge) => {
  return `📌 <b>NUEVA RECARGA FINTECH</b>\n\n👤 Usuario: ${recharge.telefono_usuario}\n🏅 Nivel: ${recharge.nivel_nombre || 'N/A'}\n💵 Monto: <b>${recharge.monto} Bs</b>\n🕒 Hora (BO): ${new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}`;
};

export default { 
  botAdmin, botRetiros, botSecretaria, 
  sendToAdmin, sendToRetiros, sendToSecretaria, 
  formatRetiroMessage, formatRecargaMessage,
  setupWebhooks
};
