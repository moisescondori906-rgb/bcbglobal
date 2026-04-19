import TelegramBot from 'node-telegram-bot-api';
import logger from '../lib/logger.js';
import { safeAsync, safeTelegram } from '../lib/safeWrappers.js';
import { query, queryOne } from '../config/db.js';

// Instancias de bots (Singleton pattern con inicialización perezosa)
let botAdmin = null;
let botRetiros = null;
let botSecretaria = null;

/**
 * @section CONFIGURACIÓN DE BOTS
 */

export async function setupAdminBot() {
  if (botAdmin) return botAdmin;
  const token = process.env.TELEGRAM_BOT_TOKEN_ADMIN;
  if (!token || token === 'tu_token_aqui') {
    logger.warn('[TELEGRAM] Admin Bot saltado: Token no configurado.');
    return null;
  }

  try {
    botAdmin = new TelegramBot(token, { polling: true });
    botAdmin.on('error', (err) => logger.error('[TELEGRAM ADMIN] Error:', err.message));
    botAdmin.on('polling_error', (err) => logger.debug('[TELEGRAM ADMIN] Polling error:', err.message));

    const { handleCallbackQuery } = await import('../handlers/telegramHandler.js');
    botAdmin.on('callback_query', (query) => {
      handleCallbackQuery(botAdmin, query).catch(err => logger.error('[TELEGRAM ADMIN] Callback Error:', err.message));
    });

    logger.info('[TELEGRAM] Admin Bot inicializado.');
    return botAdmin;
  } catch (err) {
    logger.error('[TELEGRAM] Error setup Admin Bot:', err.message);
    return null;
  }
}

export async function setupRetirosBot() {
  if (botRetiros) return botRetiros;
  const token = process.env.TELEGRAM_BOT_TOKEN_RETIROS;
  if (!token || token === 'tu_token_aqui') return null;

  try {
    botRetiros = new TelegramBot(token, { polling: true });
    botRetiros.on('error', (err) => logger.error('[TELEGRAM RETIROS] Error:', err.message));
    logger.info('[TELEGRAM] Retiros Bot inicializado.');
    return botRetiros;
  } catch (err) {
    logger.error('[TELEGRAM] Error setup Retiros Bot:', err.message);
    return null;
  }
}

export async function setupSecretariaBot() {
  if (botSecretaria) return botSecretaria;
  const token = process.env.TELEGRAM_BOT_TOKEN_SECRETARIA;
  if (!token || token === 'tu_token_aqui') return null;

  try {
    botSecretaria = new TelegramBot(token, { polling: true });
    botSecretaria.on('error', (err) => logger.error('[TELEGRAM SECRETARIA] Error:', err.message));
    logger.info('[TELEGRAM] Secretaria Bot inicializado.');
    return botSecretaria;
  } catch (err) {
    logger.error('[TELEGRAM] Error setup Secretaria Bot:', err.message);
    return null;
  }
}

/**
 * @section FUNCIONES DE ENVÍO SEGURO (Aislamiento de fallos)
 */

export async function sendToAdmin(message, options = {}) {
  return safeTelegram(async () => {
    const bot = await setupAdminBot();
    const chatId = process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      return await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  }, 'sendToAdmin');
}

export async function sendToRetiros(message, options = {}) {
  return safeTelegram(async () => {
    const bot = await setupRetirosBot() || await setupAdminBot(); 
    const chatId = process.env.TELEGRAM_CHAT_RETIROS || process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      return await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  }, 'sendToRetiros');
}

export async function sendToSecretaria(message, options = {}) {
  return safeTelegram(async () => {
    const bot = await setupSecretariaBot() || await setupAdminBot();
    const chatId = process.env.TELEGRAM_CHAT_SECRETARIA || process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      return await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  }, 'sendToSecretaria');
}

/**
 * @section HELPERS DE FORMATEO v8.1.0
 */

export function formatRetiroMessage(data) {
  return `<b>💰 NUEVA SOLICITUD DE RETIRO</b>\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `👤 <b>Usuario:</b> <code>${data.telefono}</code>\n` +
         `🏆 <b>Nivel:</b> ${data.nivel || 'Usuario'}\n` +
         `💵 <b>Monto:</b> <code>${data.monto} BOB</code>\n` +
         `🏦 <b>Banco:</b> ${data.banco || 'N/A'}\n` +
         `💳 <b>Cuenta:</b> <code>${data.cuenta || 'N/A'}</code>\n` +
         `🕒 <b>Hora:</b> ${data.hora || new Date().toLocaleTimeString('es-BO')}\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `<i>Por favor, tome el caso para procesar.</i>`;
}

export function formatRecargaMessage(data) {
  return `<b>💳 NUEVA SOLICITUD DE RECARGA</b>\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `👤 <b>Usuario:</b> <code>${data.telefono}</code>\n` +
         `📈 <b>Nivel:</b> ${data.nivel}\n` +
         `💵 <b>Monto:</b> <code>${data.monto} BOB</code>\n` +
         `🕒 <b>Fecha:</b> ${new Date().toLocaleString('es-BO')}\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `<i>Verifique el comprobante en el panel admin.</i>`;
}
