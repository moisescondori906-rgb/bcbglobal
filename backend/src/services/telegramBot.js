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
 * safeTelegramCall - Wrapper universal para evitar caídas por fallos en la API de Telegram.
 * @param {Function} call - Función asíncrona que realiza la llamada al bot.
 * @param {string} context - Contexto para el log de error.
 * @returns {Promise<any|null>} - Resultado de la llamada o null si falla.
 */
export async function safeTelegramCall(call, context = 'General') {
  try {
    return await call();
  } catch (err) {
    logger.error(`[TELEGRAM-SAFE] Fallo en ${context}: ${err.message}`);
    // Si es un error de token o conexión, no relanzamos para no tumbar el backend
    return null;
  }
}

/**
 * @section FUNCIONES DE ENVÍO SEGURO (Aislamiento de fallos)
 */

export async function sendToAdmin(message, options = {}) {
  return safeTelegramCall(async () => {
    const bot = await setupAdminBot();
    const chatId = process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      return await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  }, 'sendToAdmin');
}

export async function sendToRetiros(message, options = {}) {
  return safeTelegramCall(async () => {
    const bot = await setupRetirosBot() || await setupAdminBot(); 
    const chatId = process.env.TELEGRAM_CHAT_RETIROS || process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      return await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  }, 'sendToRetiros');
}

export async function sendToSecretaria(message, options = {}) {
  return safeTelegramCall(async () => {
    const bot = await setupSecretariaBot() || await setupAdminBot();
    const chatId = process.env.TELEGRAM_CHAT_SECRETARIA || process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      return await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  }, 'sendToSecretaria');
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
