import { Router } from 'express';
import { sendToAdmin, sendToRetiros, sendToSecretaria } from '../../services/telegramBot.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';
import logger from '../../utils/logger.mjs';

const router = Router();

/**
 * Endpoint de prueba para Telegram Multi-Bot
 * GET /api/telegram/test
 */
router.get('/test', asyncHandler(async (req, res) => {
    logger.info("Iniciando test Multi-Bot...");

    // Enviar mensajes usando los 3 bots diferentes
    const results = await Promise.allSettled([
      sendToRetiros("🚀 TEST BOT RETIROS OK"),
      sendToAdmin("🚀 TEST BOT ADMIN OK"),
      sendToSecretaria("🚀 TEST BOT SECRETARIA OK")
    ]);

    const status = {
      retiros: results[0].status === 'fulfilled',
      admin: results[1].status === 'fulfilled',
      secretaria: results[2].status === 'fulfilled'
    };

    res.json({ ok: true, status });
}));

export default router;
