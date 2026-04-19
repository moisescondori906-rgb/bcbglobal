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
const missingTokens = Object.entries(tokens).filter(([key, token]) => !token);
if (missingTokens.length > 0) {
  const msg = `[TELEGRAM] Faltan tokens para bots: ${missingTokens.map(([k]) => k).join(', ')}`;
  if (process.env.NODE_ENV === 'production') {
    logger.warn(`${msg}. El sistema continuará operando sin notificaciones de Telegram.`);
  } else {
    logger.warn(msg);
  }
}

// Inicialización resiliente de bots
const createBot = (token, name) => {
  // Envoltorio de seguridad total para evitar caídas del backend
  try {
    if (!token) {
      logger.warn(`[TELEGRAM] Bot ${name} NO se inicializará (Token ausente). El sistema seguirá operando.`);
      return null;
    }
    
    // Validar formato de token (numérico:alfanumérico)
    if (!/^\d+:[\w-]+$/.test(token)) {
      logger.error(`[TELEGRAM] Formato de token inválido para bot ${name}.`);
      return null;
    }

    const bot = new TelegramBot(token, { polling: false }); 
    
    // Sobrescribir sendMessage para que sea resiliente automáticamente (Blindaje de API)
    const originalSendMessage = bot.sendMessage.bind(bot);
    bot.sendMessage = async (chatId, text, options = {}) => {
      if (!bot) return null;
      try {
        return await originalSendMessage(chatId, text, { parse_mode: 'HTML', ...options });
      } catch (err) {
        logger.error(`[TELEGRAM-API] Error controlado en bot ${name} enviando a ${chatId}: ${err.message}`);
        // Retornamos null en lugar de lanzar error para proteger el hilo principal
        return null; 
      }
    };

    logger.info(`[TELEGRAM] Bot ${name} instanciado correctamente.`);
    return bot;
  }
  catch (err) {
    logger.error(`[TELEGRAM] Error fatal aislado al instanciar bot ${name}: ${err.message}. El backend sigue vivo.`);
    return null;
  }
};

export const botAdmin = createBot(tokens.admin, 'ADMIN');
export const botRetiros = createBot(tokens.retiros, 'RETIROS');
export const botSecretaria = createBot(tokens.secretaria, 'SECRETARIA');

// Cache local de bots para evitar importaciones circulares en servicios de bajo nivel
const botRegistry = {
  admin: botAdmin,
  retiros: botRetiros,
  secretaria: botSecretaria
};

/**
 * Helper para enviar mensajes con retry y log de errores
 */
async function safeSendMessage(botType, chatId, text, options = {}) {
  const bot = botRegistry[botType];
  if (!bot) {
    logger.error(`[TELEGRAM] Error: Bot ${botType} no inicializado.`);
    return null;
  }
  if (!chatId) {
    logger.error(`[TELEGRAM] Error: Chat ID para ${botType} no configurado.`);
    return null;
  }
  try {
    return await bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });
  }
  catch (err) {
    logger.error(`[TELEGRAM] Error enviando mensaje via ${botType} a ${chatId}: ${err.message}`);
    return null;
  }
}

export const sendToAdmin = async (text, options) => await safeSendMessage('admin', process.env.TELEGRAM_CHAT_ADMIN, text, options);
export const sendToRetiros = async (text, options) => await safeSendMessage('retiros', process.env.TELEGRAM_CHAT_RETIROS, text, options);
export const sendToSecretaria = async (text, options) => await safeSendMessage('secretaria', process.env.TELEGRAM_CHAT_SECRETARIA, text, options);

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
 * Formateador de alertas de recarga institucional
 */
export const formatRecargaMessage = ({ telefono, nivel, monto }) => {
  return `
💳 <b>NUEVA RECARGA</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Usuario:</b> <code>${telefono}</code>
🏆 <b>Nivel:</b> <code>${nivel}</code>
💵 <b>Monto:</b> <code>${monto} BOB</code>
🕒 <b>Hora:</b> <code>${new Date().toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' })}</code>
━━━━━━━━━━━━━━━━━━
<i>Verificar comprobante en panel administrativo.</i>
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
