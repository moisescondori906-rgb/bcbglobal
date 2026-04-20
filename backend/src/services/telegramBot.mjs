import TelegramBot from 'node-telegram-bot-api';
import logger from '../utils/logger.mjs';
import { safeTelegram } from '../utils/safe.mjs';
import { query, queryOne } from '../config/db.mjs';

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
  const token = process.env.TELEGRAM_BOT_TOKEN_SECRETARIA || '8252503149:AAHzPFtyO1QSpQ3VwObQ8gr1oEbXA21YkxM';
  if (!token || token === 'tu_token_aqui') return null;

  try {
    botSecretaria = new TelegramBot(token, { polling: true });
    botSecretaria.on('error', (err) => logger.error('[TELEGRAM SECRETARIA] Error:', err.message));
    
    // --- MANEJADOR DE MENSAJES DE SECRETARIA v10.7.0 ---
    botSecretaria.on('message', async (msg) => {
      const chatId = String(msg.chat.id);
      const text = msg.text;
      if (!text) return;

      // Solo responder en el chat de secretaria configurado o si es comando /start
      const targetSecretariaId = process.env.TELEGRAM_CHAT_SECRETARIA || '-1003900884989';
      
      // Permitir /start en cualquier lugar para obtener el ID si es necesario
      if (text === '/start' && chatId !== targetSecretariaId) {
        await botSecretaria.sendMessage(chatId, `🆔 Tu ID de Chat es: <code>${chatId}</code>\nConfigúralo en el .env como TELEGRAM_CHAT_SECRETARIA`, { parse_mode: 'HTML' });
      }

      if (chatId !== targetSecretariaId && text !== '/start') return;

      // 1. Comando de historial por teléfono (ej: +59174344916)
      const phoneRegex = /^\+?591\d{8,11}$/; // Ampliado para soportar diferentes formatos
      if (phoneRegex.test(text.replace(/\s/g, ''))) {
        const telefono = text.replace(/\s/g, '').replace('+', '');
        await handleSecretariaHistory(botSecretaria, chatId, telefono);
        return;
      }

      // 2. Comandos de botones rápidos
      if (text === '/menu' || text === '/start') {
        await botSecretaria.sendMessage(chatId, '<b>🏢 PANEL DE SECRETARÍA BCB GLOBAL</b>\n\n¿Qué desea consultar hoy?', {
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [
              [{ text: '📊 Resumen Diario' }, { text: '💳 Buscar Usuario' }],
              [{ text: '📈 Recargas Pendientes' }, { text: '💰 Retiros Pendientes' }]
            ],
            resize_keyboard: true
          }
        });
      }

      if (text === '📊 Resumen Diario') {
        // Lógica de resumen (reutilizar handleDailySummary si es posible)
        await botSecretaria.sendMessage(chatId, 'Generando resumen...');
      }

      if (text === '💳 Buscar Usuario') {
        await botSecretaria.sendMessage(chatId, 'Por favor, escribe el número de teléfono del usuario (ej: +59174344916)');
      }
    });

    logger.info('[TELEGRAM] Secretaria Bot inicializado.');
    return botSecretaria;
  } catch (err) {
    logger.error('[TELEGRAM] Error setup Secretaria Bot:', err.message);
    return null;
  }
}

/**
 * Lógica de Historial para Secretaria v10.7.0
 */
async function handleSecretariaHistory(bot, chatId, telefono) {
  try {
    const user = await queryOne('SELECT * FROM usuarios WHERE telefono = ?', [telefono]);
    if (!user) {
      return bot.sendMessage(chatId, `❌ Usuario <code>${telefono}</code> no encontrado.`);
    }

    const [recargas] = await query('SELECT * FROM compras_nivel WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 5', [user.id]);
    const [retiros] = await query('SELECT * FROM retiros WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 5', [user.id]);

    let msg = `<b>📋 HISTORIAL: ${user.nombre_usuario || user.telefono}</b>\n`;
    msg += `🆔 ID: <code>${user.id.substring(0, 8)}</code>\n`;
    msg += `💰 Saldo: <code>${user.saldo} BOB</code>\n\n`;

    msg += `<b>💳 ÚLTIMAS RECARGAS:</b>\n`;
    if (recargas.length === 0) msg += '<i>Sin registros</i>\n';
    recargas.forEach(r => {
      msg += `• ${new Date(r.created_at).toLocaleDateString()}: <b>${r.monto} BOB</b> (${r.estado})\n`;
    });

    msg += `\n<b>💰 ÚLTIMOS RETIROS:</b>\n`;
    if (retiros.length === 0) msg += '<i>Sin registros</i>\n';
    retiros.forEach(r => {
      msg += `• ${new Date(r.created_at).toLocaleDateString()}: <b>${r.monto} BOB</b> (${r.estado})\n`;
    });

    await bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
  } catch (err) {
    logger.error('[TELEGRAM-HISTORY] Error:', err.message);
    bot.sendMessage(chatId, '❌ Error al consultar historial.');
  }
}

/**
 * @section FUNCIONES DE ENVÍO SEGURO (Aislamiento de fallos)
 */

/**
 * Notifica a los administradores v11.0.0 (Soporte para Imagen)
 */
export async function sendToAdmin(message, options = {}) {
  return safeTelegram(async () => {
    const bot = await setupAdminBot();
    const chatId = process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      if (options.photo) {
        const { photo, ...otherOptions } = options;
        return await bot.sendPhoto(chatId, photo, { caption: message, parse_mode: 'HTML', ...otherOptions });
      }
      return await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  }, 'sendToAdmin');
}

/**
 * Notifica a retiros v11.0.0 (Soporte para Imagen)
 */
export async function sendToRetiros(message, options = {}) {
  return safeTelegram(async () => {
    const bot = await setupRetirosBot() || await setupAdminBot(); 
    const chatId = process.env.TELEGRAM_CHAT_RETIROS || process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      if (options.photo) {
        const { photo, ...otherOptions } = options;
        return await bot.sendPhoto(chatId, photo, { caption: message, parse_mode: 'HTML', ...otherOptions });
      }
      return await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  }, 'sendToRetiros');
}

/**
 * Notifica a secretaria v11.0.0 (Soporte para Imagen)
 */
export async function sendToSecretaria(message, options = {}) {
  return safeTelegram(async () => {
    const bot = await setupSecretariaBot() || await setupAdminBot();
    const chatId = process.env.TELEGRAM_CHAT_SECRETARIA || process.env.TELEGRAM_CHAT_ADMIN;
    if (bot && chatId) {
      if (options.photo) {
        const { photo, ...otherOptions } = options;
        return await bot.sendPhoto(chatId, photo, { caption: message, parse_mode: 'HTML', ...otherOptions });
      }
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
