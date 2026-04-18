import { Router } from 'express';
import logger from '../lib/logger.js';
import { botAdmin, botRetiros, botSecretaria } from '../services/telegramBot.js';

const router = Router();

// Middleware de seguridad para validar el Secret Token de Telegram
const validateWebhookSecret = (req, res, next) => {
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];
  const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (secretToken !== expectedToken) {
    logger.warn(`[SECURITY] Intento de Webhook no autorizado.`);
    return res.sendStatus(403);
  }
  next();
};

/**
 * Endpoint unificado para recibir actualizaciones de los 3 bots
 */
router.post('/:botType', validateWebhookSecret, async (req, res) => {
  const { botType } = req.params;
  const update = req.body;

  try {
    const bot = botType === 'admin' ? botAdmin : botType === 'retiros' ? botRetiros : botSecretaria;
    
    if (bot) {
      // Procesar la actualización (incluye callbacks de botones)
      bot.processUpdate(update);
    }
    
    res.status(200).send('OK');
  } catch (err) {
    logger.error(`[TELEGRAM] Error procesando webhook para ${botType}: ${err.message}`);
    res.status(200).send('OK'); // Responder siempre 200 a Telegram
  }
});

export default router;
