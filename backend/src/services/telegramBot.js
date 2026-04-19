import TelegramBot from 'node-telegram-bot-api';
import logger from '../lib/logger.js';
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
  if (!token) return null;

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
  if (!token) return null;

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
  if (!token) return null;

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
  try {
    const bot = await setupAdminBot();
    const chatId = process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  } catch (err) {
    logger.error('[TELEGRAM] Fail sendToAdmin:', err.message);
  }
}

export async function sendToRetiros(message, options = {}) {
  try {
    const bot = await setupRetirosBot() || await setupAdminBot(); // Fallback a Admin si Retiros falla
    const chatId = process.env.TELEGRAM_CHAT_RETIROS || process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  } catch (err) {
    logger.error('[TELEGRAM] Fail sendToRetiros:', err.message);
  }
}

export async function sendToSecretaria(message, options = {}) {
  try {
    const bot = await setupSecretariaBot() || await setupAdminBot();
    const chatId = process.env.TELEGRAM_CHAT_SECRETARIA || process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  } catch (err) {
    logger.error('[TELEGRAM] Fail sendToSecretaria:', err.message);
  }
}

/**
 * @section FORMATEO DE MENSAJES v7.0.5
 */

export function formatRecargaMessage(data) {
  return `
💰 <b>NUEVA SOLICITUD DE RECARGA</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Usuario:</b> <code>${data.telefono}</code>
📈 <b>Nivel:</b> ${data.nivel}
💵 <b>Monto:</b> <code>${data.monto} BOB</code>
🕒 <b>Fecha:</b> ${new Date().toLocaleString('es-BO')}
━━━━━━━━━━━━━━━━━━
<i>Acción requerida en Panel Administrativo.</i>`;
}

export function formatRetiroMessage(data) {
  return `
💸 <b>NUEVA SOLICITUD DE RETIRO</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Usuario:</b> <code>${data.telefono}</code>
💵 <b>Monto:</b> <code>${data.monto} BOB</code>
🏦 <b>Banco:</b> ${data.banco || 'N/A'}
💳 <b>Cuenta:</b> <code>${data.cuenta || 'N/A'}</code>
👤 <b>Titular:</b> ${data.titular || 'N/A'}
━━━━━━━━━━━━━━━━━━
<i>Procesar según turno habilitado.</i>`;
}
