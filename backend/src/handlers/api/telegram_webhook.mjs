import { Router } from 'express';
import logger from '../../utils/logger.mjs';
import { setupAdminBot } from '../../services/telegramBot.mjs';
import { safeTelegram } from '../../utils/safe.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();

// Middleware de seguridad para validar el Secret Token de Telegram
const validateWebhookSecret = (req, res, next) => {
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];
  const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedToken && secretToken !== expectedToken) {
    logger.warn(`[SECURITY] Intento de Webhook no autorizado.`);
    return res.sendStatus(403);
  }
  next();
};

/**
 * Endpoint unificado para recibir actualizaciones de los bots
 */
router.post('/:botType', validateWebhookSecret, asyncHandler(async (req, res) => {
  const { botType } = req.params;
  const update = req.body;

  if (botType === 'admin') {
    const bot = await setupAdminBot();
    if (bot) {
      await safeTelegram(() => bot.processUpdate(update), 'webhook-processUpdate');
    }
  }
  
  res.status(200).send('OK');
}));

export default router;
