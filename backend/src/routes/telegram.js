import { Router } from 'express';
import { sendToRetiros, sendToAdmin, sendToSecretaria, bot } from '../services/telegramBot.js';

const router = Router();

/**
 * Endpoint de prueba para Telegram
 * GET /api/telegram/test
 */
router.get('/test', async (req, res) => {
  try {
    console.log("Iniciando test de Telegram...");
    
    // Test a través de las funciones del servicio
    await sendToRetiros("🚀 Test RETIROS OK");
    await sendToAdmin("🚀 Test ADMIN OK");
    await sendToSecretaria("🚀 Test SECRETARIA OK");
    
    // FORZAR ENVÍO DIRECTO (Punto 6 solicitado)
    if (bot) {
      await bot.sendMessage(-1003904814691, "🚀 TEST DIRECTO");
      console.log("Test directo enviado");
    } else {
      console.error("Bot no inicializado para test directo");
    }
    
    res.json({ success: true, message: "Mensajes enviados" });
  } catch (error) {
    console.error("Error en endpoint test:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
