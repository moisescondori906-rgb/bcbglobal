import { Router } from 'express';
import { processTelegramUpdate } from '../lib/telegram_logic.js';
import { sendTestMessage } from '../services/telegramBot.js';

const router = Router();

// Ruta GET para verificar que el webhook es accesible desde el navegador
router.get('/', (req, res) => {
  res.send('✅ El endpoint del Webhook de Telegram está activo y listo para recibir señales.');
});

// Endpoint de prueba real de envío de mensaje
router.get('/test', async (req, res) => {
  const testChatId = req.query.chatId;
  
  if (!testChatId) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Debe proporcionar un chatId en la query (ej: ?chatId=12345678)' 
    });
  }

  try {
    const success = await sendTestMessage(testChatId);
    if (success) {
      res.json({ ok: true, message: 'Mensaje de prueba enviado correctamente a Telegram' });
    } else {
      res.status(500).json({ ok: false, error: 'No se pudo enviar el mensaje. Verifique los logs del servidor.' });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
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
