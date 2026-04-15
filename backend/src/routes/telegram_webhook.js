import { Router } from 'express';
import { processTelegramUpdate } from '../lib/telegram_logic.js';
import { sendToAdmin, sendToRetiros, sendToSecretaria } from '../services/telegramBot.js';

const router = Router();

// Ruta GET para verificar que el webhook es accesible desde el navegador
router.get('/', (req, res) => {
  res.send('✅ El endpoint del Webhook de Telegram está activo y listo para recibir señales.');
});

// Endpoint de prueba real de envío de mensaje a los 3 grupos
router.get('/test', async (req, res) => {
  try {
    const results = await Promise.all([
      sendToRetiros("🚀 <b>Test RETIROS OK</b>"),
      sendToAdmin("🚀 <b>Test ADMIN OK</b>"),
      sendToSecretaria("🚀 <b>Test SECRETARIA OK</b>")
    ]);

    const success = results.every(r => r === true);
    
    if (success) {
      res.json({ success: true, message: 'Mensajes de prueba enviados correctamente a los 3 grupos' });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Algunos mensajes no se pudieron enviar. Verifique los logs y la configuración de .env',
        results: {
          retiros: results[0],
          admin: results[1],
          secretaria: results[2]
        }
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para recibir webhooks de Telegram
router.post('/', async (req, res) => {
  try {
    console.log('[Telegram Webhook] Received update');
    await processTelegramUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Error in Telegram Webhook:', err);
    res.status(200).send('OK'); // Siempre responder 200 a Telegram
  }
});

export default router;
