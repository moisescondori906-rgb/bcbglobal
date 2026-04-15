import { Router } from 'express';
import { sendToRetiros, sendToAdmin, sendToSecretaria } from '../services/telegramBot.js';

const router = Router();

/**
 * Endpoint de prueba para Telegram
 * GET /api/telegram/test
 */
router.get('/test', async (req, res) => {
  try {
    await sendToRetiros("🚀 Test RETIROS OK");
    await sendToAdmin("🚀 Test ADMIN OK");
    await sendToSecretaria("🚀 Test SECRETARIA OK");
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
