import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import logger from '../lib/logger.js';

dotenv.config();

const tokens = {
  admin: process.env.TELEGRAM_BOT_TOKEN_ADMIN,
  retiros: process.env.TELEGRAM_BOT_TOKEN_RETIROS,
  secretaria: process.env.TELEGRAM_BOT_TOKEN_SECRETARIA
};

// Validación de tokens obligatorios para producción
if (process.env.NODE_ENV === 'production') {
  Object.entries(tokens).forEach(([key, token]) => {
    if (!token) logger.error(`[TELEGRAM] Falta token para bot: ${key}`);
  });
}

// Inicialización resiliente de bots
const createBot = (token, name) => {
  if (!token) return null;
  try {
    const bot = new TelegramBot(token, { polling: false }); // Usar Webhooks en producción
    logger.info(`[TELEGRAM] Bot ${name} inicializado.`);
    return bot;
  }
  catch (err) {
    logger.error(`[TELEGRAM] Error al crear bot ${name}: ${err.message}`);
    return null;
  }
};

export const botAdmin = createBot(tokens.admin, 'ADMIN');
export const botRetiros = createBot(tokens.retiros, 'RETIROS');
export const botSecretaria = createBot(tokens.secretaria, 'SECRETARIA');

/**
 * Helper para enviar mensajes con retry y log de errores
 */
async function safeSendMessage(bot, chatId, text, options = {}) {
  if (!bot || !chatId) return null;
  try {
    return await bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });
  }
  catch (err) {
    logger.error(`[TELEGRAM] Error enviando mensaje a ${chatId}: ${err.message}`);
    return null;
  }
}

export const sendToAdmin = async (text, options) => await safeSendMessage(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, text, options);
export const sendToRetiros = async (text, options) => await safeSendMessage(botRetiros, process.env.TELEGRAM_CHAT_RETIROS, text, options);
export const sendToSecretaria = async (text, options) => await safeSendMessage(botSecretaria, process.env.TELEGRAM_CHAT_SECRETARIA, text, options);

/**
 * Formateador de alertas de retiro institucional
 */
export const formatRetiroMessage = ({ telefono, nivel, monto, hora }) => {
  return `
💰 <b>SOLICITUD DE RETIRO</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Usuario:</b> <code>${telefono}</code>
🏆 <b>Nivel:</b> <code>${nivel}</code>
💵 <b>Monto:</b> <code>${monto} BOB</code>
🕒 <b>Hora:</b> <code>${hora}</code>
━━━━━━━━━━━━━━━━━━
<i>Acción requerida en panel administrativo.</i>
  `.trim();
};

/**
 * Configuración de Webhooks (Llamar al iniciar el servidor)
 */
export const setupWebhooks = async () => {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    logger.warn('[TELEGRAM] BACKEND_URL no definida. No se configurarán webhooks.');
    return;
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  
  const setup = async (bot, name, path) => {
    if (!bot) return;
    try {
      const url = `${backendUrl}/api/webhooks/telegram/${path}`;
      await bot.setWebHook(url, { 
        secret_token: secret,
        drop_pending_updates: true
      });
      logger.info(`[TELEGRAM] Webhook configurado para ${name}: ${url}`);
    } catch (err) {
      logger.error(`[TELEGRAM] Error webhook ${name}: ${err.message}`);
    }
  };

  await setup(botAdmin, 'ADMIN', 'admin');
  await setup(botRetiros, 'RETIROS', 'retiros');
  await setup(botSecretaria, 'SECRETARIA', 'secretaria');
};
