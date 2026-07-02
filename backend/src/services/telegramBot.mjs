import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import logger from '../utils/logger.mjs';
import { safeTelegram } from '../utils/safe.mjs';
import { query, queryOne } from '../config/db.mjs';

// Instancias de bots (Singleton pattern con inicialización perezosa)
let botAdmin = null;
let botRetiros = null;
let botSecretaria = null;

// Solo el primer worker de PM2 (instancia 0) o si no estamos en PM2 debe hacer polling
const SHOULD_POLL = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

const reportWithdrawalQrDebug = (hypothesisId, location, msg, data = {}) => {
  let debugServerUrl = 'http://127.0.0.1:7777/event';
  let sessionId = 'withdrawal-qr-telegram';
  try {
    const env = fs.readFileSync(`${process.cwd()}\\.dbg\\withdrawal-qr-telegram.env`, 'utf8');
    debugServerUrl = env.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || debugServerUrl;
    sessionId = env.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || sessionId;
  } catch {}
  fetch(debugServerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, runId: 'pre-fix', hypothesisId, location, msg, data, ts: Date.now() })
  }).catch(() => {});
};

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
    botAdmin = new TelegramBot(token, { polling: SHOULD_POLL });
    botAdmin.on('error', (err) => logger.error('[TELEGRAM ADMIN] Error:', err.message));
    
    if (SHOULD_POLL) {
      botAdmin.on('polling_error', (err) => logger.debug('[TELEGRAM ADMIN] Polling error:', err.message));
      logger.info('[TELEGRAM] Admin Bot inicializado con Polling.');
    } else {
      logger.info('[TELEGRAM] Admin Bot inicializado (Solo Envío).');
    }

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
    botRetiros = new TelegramBot(token, { polling: SHOULD_POLL });
    botRetiros.on('error', (err) => logger.error('[TELEGRAM RETIROS] Error:', err.message));
    if (SHOULD_POLL) {
      logger.info('[TELEGRAM] Retiros Bot inicializado con Polling.');
    } else {
      logger.info('[TELEGRAM] Retiros Bot inicializado (Solo Envío).');
    }
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
    botSecretaria = new TelegramBot(token, { polling: SHOULD_POLL });
    botSecretaria.on('error', (err) => logger.error('[TELEGRAM SECRETARIA] Error:', err.message));
    
    if (SHOULD_POLL) {
      // --- MANEJADOR DE MENSAJES DE SECRETARIA v10.7.0 ---
      botSecretaria.on('message', async (msg) => {
        const chatId = String(msg.chat.id);
        const text = msg.text;
        if (!text) return;

        // Solo responder en el chat de secretaria configurado o si es comando /start
        const targetSecretariaId = process.env.TELEGRAM_CHAT_SECRETARIA;
        
        // Permitir /start en cualquier lugar para obtener el ID si es necesario
        if (text === '/start' && chatId !== targetSecretariaId) {
          await botSecretaria.sendMessage(chatId, `🆔 Tu ID de Chat es: <code>${chatId}</code>\nConfigúralo en el .env como TELEGRAM_CHAT_SECRETARIA`, { parse_mode: 'HTML' });
        }

        if (chatId !== targetSecretariaId && text !== '/start') return;

        // 1. Comando de historial por teléfono (ej: +591...)
        const phoneRegex = /^\+?(51|591)\d{8,11}$/; // Soporte para Bolivia y Perú
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

      logger.info('[TELEGRAM] Secretaria Bot inicializado con Polling.');
    } else {
      logger.info('[TELEGRAM] Secretaria Bot inicializado (Solo Envío).');
    }

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

    const recargas = await query('SELECT * FROM compras_nivel WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 5', [user.id]);
    const retiros = await query('SELECT * FROM retiros WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 5', [user.id]);

    let msg = `<b>📋 HISTORIAL: ${user.nombre_usuario || user.telefono}</b>\n`;
    msg += `🆔 ID: <code>${user.id.substring(0, 8)}</code>\n`;
    msg += `💰 Saldo: <code>${user.saldo} Bs</code>\n\n`;

    msg += `<b>💳 ÚLTIMAS RECARGAS:</b>\n`;
    if (recargas.length === 0) msg += '<i>Sin registros</i>\n';
    recargas.forEach(r => {
      msg += `• ${new Date(r.created_at).toLocaleDateString()}: <b>${r.monto} Bs</b> (${r.estado})\n`;
    });

    msg += `\n<b>💰 ÚLTIMOS RETIROS:</b>\n`;
    if (retiros.length === 0) msg += '<i>Sin registros</i>\n';
    retiros.forEach(r => {
      msg += `• ${new Date(r.created_at).toLocaleDateString()}: <b>${r.monto} Bs</b> (${r.estado})\n`;
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
        // #region debug-point C:send-admin-photo-attempt
        reportWithdrawalQrDebug('C', 'telegramBot.mjs:197', '[DEBUG] sendToAdmin photo attempt', {
          chatId,
          photoType: options.photo?.constructor?.name || typeof options.photo,
          photoBytes: Buffer.isBuffer(options.photo) ? options.photo.length : null
        });
        // #endregion
        const { photo, ...otherOptions } = options;
        try {
          const sent = await bot.sendPhoto(chatId, photo, { caption: message, parse_mode: 'HTML', ...otherOptions });
          // #region debug-point C:send-admin-photo-success
          reportWithdrawalQrDebug('C', 'telegramBot.mjs:205', '[DEBUG] sendToAdmin photo success', {
            chatId,
            messageId: sent?.message_id || null
          });
          // #endregion
          return sent;
        } catch (err) {
          // #region debug-point C:send-admin-photo-error
          reportWithdrawalQrDebug('C', 'telegramBot.mjs:213', '[DEBUG] sendToAdmin photo error', {
            chatId,
            error: err?.message || String(err),
            code: err?.code || null,
            responseBody: err?.response?.body || null
          });
          // #endregion
          throw err;
        }
      }
      // #region debug-point E:send-admin-text-fallback
      reportWithdrawalQrDebug('E', 'telegramBot.mjs:223', '[DEBUG] sendToAdmin text fallback', {
        chatId,
        hasPhoto: !!options.photo
      });
      // #endregion
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
        // #region debug-point C:send-retiros-photo-attempt
        reportWithdrawalQrDebug('C', 'telegramBot.mjs:240', '[DEBUG] sendToRetiros photo attempt', {
          chatId,
          photoType: options.photo?.constructor?.name || typeof options.photo,
          photoBytes: Buffer.isBuffer(options.photo) ? options.photo.length : null
        });
        // #endregion
        const { photo, ...otherOptions } = options;
        try {
          const sent = await bot.sendPhoto(chatId, photo, { caption: message, parse_mode: 'HTML', ...otherOptions });
          // #region debug-point C:send-retiros-photo-success
          reportWithdrawalQrDebug('C', 'telegramBot.mjs:248', '[DEBUG] sendToRetiros photo success', {
            chatId,
            messageId: sent?.message_id || null
          });
          // #endregion
          return sent;
        } catch (err) {
          // #region debug-point C:send-retiros-photo-error
          reportWithdrawalQrDebug('C', 'telegramBot.mjs:256', '[DEBUG] sendToRetiros photo error', {
            chatId,
            error: err?.message || String(err),
            code: err?.code || null,
            responseBody: err?.response?.body || null
          });
          // #endregion
          throw err;
        }
      }
      // #region debug-point E:send-retiros-text-fallback
      reportWithdrawalQrDebug('E', 'telegramBot.mjs:266', '[DEBUG] sendToRetiros text fallback', {
        chatId,
        hasPhoto: !!options.photo
      });
      // #endregion
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
 * Envía un mensaje a un usuario específico de Telegram
 */
export async function sendToTelegramUser(chatId, message, options = {}) {
  return safeTelegram(async () => {
    const bot = await setupAdminBot();
    if (bot && chatId) {
      if (options.photo) {
        // #region debug-point D:send-user-photo-attempt
        reportWithdrawalQrDebug('D', 'telegramBot.mjs:285', '[DEBUG] sendToTelegramUser photo attempt', {
          chatId,
          photoType: options.photo?.constructor?.name || typeof options.photo,
          photoBytes: Buffer.isBuffer(options.photo) ? options.photo.length : null
        });
        // #endregion
        const { photo, ...otherOptions } = options;
        try {
          const sent = await bot.sendPhoto(chatId, photo, { caption: message, parse_mode: 'HTML', ...otherOptions });
          // #region debug-point D:send-user-photo-success
          reportWithdrawalQrDebug('D', 'telegramBot.mjs:293', '[DEBUG] sendToTelegramUser photo success', {
            chatId,
            messageId: sent?.message_id || null
          });
          // #endregion
          return sent;
        } catch (err) {
          // #region debug-point D:send-user-photo-error
          reportWithdrawalQrDebug('D', 'telegramBot.mjs:301', '[DEBUG] sendToTelegramUser photo error', {
            chatId,
            error: err?.message || String(err),
            code: err?.code || null,
            responseBody: err?.response?.body || null
          });
          // #endregion
          throw err;
        }
      }
      // #region debug-point E:send-user-text-fallback
      reportWithdrawalQrDebug('E', 'telegramBot.mjs:311', '[DEBUG] sendToTelegramUser text fallback', {
        chatId,
        hasPhoto: !!options.photo
      });
      // #endregion
      return await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...options });
    }
  }, 'sendToTelegramUser');
}

/**
 * @section HELPERS DE FORMATEO v8.1.0
 */

export function calculateWithdrawalCommissions(monto, comisionRetiroPct = 10) {
  const montoSolicitado = Number(monto || 0);
  const pctRetiro = Number(comisionRetiroPct) / 100;
  const comisionRetiro = +(montoSolicitado * pctRetiro).toFixed(2);
  const comisionOperador = 0; // Since dbService.mjs sets comisionOperador to 0
  const descuentoTotal = +(comisionOperador + comisionRetiro).toFixed(2);
  const montoNeto = +(montoSolicitado - descuentoTotal).toFixed(2);
  return { montoSolicitado, comisionOperador, comisionRetiro, descuentoTotal, montoNeto, comisionRetiroPct };
}

export function formatRetiroMessage(data, comisionRetiroPct = 10) {
  const comm = calculateWithdrawalCommissions(data.monto, comisionRetiroPct);
  
  return `<b>💰 NUEVA SOLICITUD DE RETIRO</b>\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `🆔 <b>ID:</b> <code>${data.id || 'N/A'}</code>\n` +
         `👤 <b>Nombre:</b> <code>${data.nombre_usuario || 'N/A'}</code>\n` +
         `📞 <b>Número registrado:</b> <code>${data.telefono || 'N/A'}</code>\n` +
         `🏆 <b>Nivel:</b> ${data.nivel || 'Usuario'}\n` +
         `💵 <b>Monto solicitado:</b> <code>${comm.montoSolicitado} Bs</code>\n` +
         `📉 <b>Descuento:</b> <code>${comm.descuentoTotal} Bs</code>\n` +
         `🏦 <b>Comisión:</b> <code>${comm.comisionRetiro} Bs</code>\n` +
         `✅ <b>Neto:</b> <code>${comm.montoNeto} Bs</code>\n` +
         `🏦 <b>Banco:</b> ${data.banco || 'N/A'}\n` +
         `👤 <b>Titular de la cuenta bancaria:</b> <code>${data.nombre_titular || 'N/A'}</code>\n` +
         `💳 <b>Número completo de la cuenta:</b> <code>${data.cuenta || 'N/A'}</code>\n` +
         `🕒 <b>Hora:</b> ${data.hora || new Date().toLocaleTimeString('es-BO')}\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `<i>Por favor tome el caso.</i>`;
}

export function formatRecargaMessage(data) {
  return `<b>💳 NUEVA SOLICITUD DE RECARGA</b>\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `👤 <b>Nombre:</b> <code>${data.nombre_usuario || 'N/A'}</code>\n` +
         `📞 <b>Teléfono:</b> <code>${data.telefono || 'N/A'}</code>\n` +
         `📈 <b>Nivel:</b> ${data.nivel || 'N/A'}\n` +
         `💵 <b>Monto:</b> <code>${data.monto || 'N/A'} Bs</code>\n` +
         `🕒 <b>Fecha:</b> ${data.fecha || new Date().toLocaleString('es-BO')}\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `<i>Por favor, tome el caso para procesar.</i>`;
}

export function formatRetiroMessageAprobado(data) {
  return `✅ <b>PAGADO</b>\n` +
         `🤝 <b>Procesado por:</b> ${data.procesado_por || 'Administrador'}\n` +
         `🕒 <b>Hora:</b> ${data.hora || new Date().toLocaleTimeString('es-BO')}`;
}

export function formatRetiroMessageRechazado(data) {
  return `❌ <b>RETIRO RECHAZADO</b>\n` +
         `🤝 <b>Procesado por:</b> ${data.procesado_por || 'Administrador'}\n` +
         `🕒 <b>Hora:</b> ${data.hora || new Date().toLocaleTimeString('es-BO')}\n` +
         `📝 <b>Motivo:</b> ${data.motivo || 'No especificado'}`;
}

export function formatReporteFinancieroMessage(data) {
  return `📊 <b>REPORTE FINANCIERO</b>\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `💰 <b>Ingresos:</b> <code>${data.total_ingresos} Bs</code>\n` +
         `💸 <b>Salidas:</b> <code>${data.total_salidas} Bs</code>\n` +
         `📈 <b>Balance:</b> <code>${data.balance} Bs</code>\n` +
         `📥 <b>Recargas:</b> <code>${data.cantidad_recargas}</code>\n` +
         `📤 <b>Retiros:</b> <code>${data.cantidad_retiros}</code>\n` +
         `📅 <b>Fecha:</b> ${data.fecha}\n` +
         `━━━━━━━━━━━━━━━━━━`;
}

export function formatRecargaMessageAprobada(data) {
  return `✅ <b>RECARGA APROBADA</b>\n` +
         `🤝 <b>Administrador:</b> ${data.procesado_por || 'Administrador'}\n` +
         `🕒 <b>Hora:</b> ${data.hora || new Date().toLocaleTimeString('es-BO')}`;
}

export function formatRecargaMessageRechazada(data) {
  return `❌ <b>RECARGA RECHAZADA</b>\n` +
         `🤝 <b>Administrador:</b> ${data.procesado_por || 'Administrador'}\n` +
         `🕒 <b>Hora:</b> ${data.hora || new Date().toLocaleTimeString('es-BO')}\n` +
         `📝 <b>Motivo:</b> ${data.motivo || 'No especificado'}`;
}
