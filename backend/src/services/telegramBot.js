import TelegramBot from 'node-telegram-bot-api';
import logger from '../lib/logger.js';
import { query, queryOne } from '../config/db.js';

// Instancias de bots (Singleton pattern con inicialización perezosa)
let botAdmin = null;

/**
 * @section CONFIGURACIÓN DE BOTS
 */

export async function setupAdminBot() {
  if (botAdmin) return botAdmin;

  const token = process.env.TELEGRAM_BOT_TOKEN_ADMIN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN_ADMIN no definido');

  try {
    botAdmin = new TelegramBot(token, { polling: true });

    // Manejo de errores para evitar crash
    botAdmin.on('error', (err) => logger.error('[TELEGRAM ADMIN] Error:', err.message));
    botAdmin.on('polling_error', (err) => logger.debug('[TELEGRAM ADMIN] Polling error:', err.message));

    // Handler de mensajes básicos
    botAdmin.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      botAdmin.sendMessage(chatId, `🚀 BCB Global Admin Bot Activo\nSu ID: ${chatId}`);
    });

    // Registrar handlers complejos vía importación dinámica para evitar ciclos
    const { handleCallbackQuery } = await import('../handlers/telegramHandler.js');
    botAdmin.on('callback_query', (query) => {
      handleCallbackQuery(botAdmin, query).catch(err => {
        logger.error('[TELEGRAM ADMIN] Callback Error:', err.message);
      });
    });

    logger.info('[TELEGRAM] Admin Bot configurado con éxito.');
    return botAdmin;
  } catch (err) {
    logger.error('[TELEGRAM] Error configurando Admin Bot:', err.message);
    botAdmin = null;
    throw err;
  }
}

/**
 * @section FUNCIONES DE ENVÍO SEGURO
 */

export async function sendToAdmin(message) {
  try {
    const adminId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!adminId || !botAdmin) return;
    await botAdmin.sendMessage(adminId, message, { parse_mode: 'HTML' });
  } catch (err) {
    logger.error('[TELEGRAM] Error enviando a Admin:', err.message);
  }
}

export async function sendToSecretaria(message) {
  // Implementación simplificada para resiliencia
  try {
    const secId = process.env.TELEGRAM_SECRETARIA_CHAT_ID;
    if (!secId || !botAdmin) return;
    await botAdmin.sendMessage(secId, message, { parse_mode: 'HTML' });
  } catch (err) {
    logger.error('[TELEGRAM] Error enviando a Secretaria:', err.message);
  }
}

/**
 * @section FORMATEO DE MENSAJES
 */

export function formatRecargaMessage(data) {
  return `
💰 <b>NUEVA SOLICITUD DE RECARGA</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Usuario:</b> ${data.telefono}
📈 <b>Nivel:</b> ${data.nivel}
💵 <b>Monto:</b> ${data.monto} BOB
🕒 <b>Fecha:</b> ${new Date().toLocaleString('es-BO')}
━━━━━━━━━━━━━━━━━━
<i>Pendiente de aprobación en el panel administrativo.</i>`;
}

export function formatRetiroMessage(data) {
  return `
💸 <b>NUEVA SOLICITUD DE RETIRO</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Usuario:</b> ${data.telefono}
💵 <b>Monto:</b> ${data.monto} BOB
🏦 <b>Banco:</b> ${data.banco}
💳 <b>Cuenta:</b> ${data.cuenta}
👤 <b>Titular:</b> ${data.titular}
━━━━━━━━━━━━━━━━━━
<i>Procesar según turno de retiro habilitado.</i>`;
}
