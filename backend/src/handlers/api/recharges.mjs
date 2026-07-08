import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  getGlobalContent, getLevels, peruTime, canRecharge 
} from '../../services/dbService.mjs';
import { query, queryOne } from '../../config/db.mjs';
import { authenticate } from '../../utils/middleware/auth.mjs';
import { attachRequestUser } from '../../utils/middleware/requestContext.mjs';
import { 
  sendToAdmin, 
  sendToSecretaria, 
  formatRecargaMessage 
} from '../../services/telegramBot.mjs';
import { uploadImageBuffer } from '../../utils/fileStorage.mjs';
import logger from '../../utils/logger.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

router.use(authenticate);
router.use(attachRequestUser);

router.get('/metodos', asyncHandler(async (req, res) => {
  const metodos = await query(`SELECT id, nombre_titular, imagen_qr_url, dias_semana, hora_inicio, hora_fin FROM metodos_qr WHERE activo = 1 ORDER BY orden ASC`);
  res.json(metodos);
}));

router.get('/', asyncHandler(async (req, res) => {
  const list = await query(`SELECT * FROM compras_nivel WHERE usuario_id = ? ORDER BY created_at DESC`, [req.user.id]);
  res.json(list);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { monto, metodo_qr_id, comprobante_url } = req.body;
  if (!monto || isNaN(parseFloat(monto))) {
    return res.status(400).json({ error: 'Monto inválido' });
  }

  // 0. Validar horario del QR seleccionado
  if (metodo_qr_id) {
    const qr = await queryOne(`SELECT dias_semana, hora_inicio, hora_fin FROM metodos_qr WHERE id = ? AND activo = 1`, [metodo_qr_id]);
    if (qr) {
      const now = peruTime.now();
      const currentDay = now.getDay();
      const currentTime = now.toTimeString().split(' ')[0];

      const days = String(qr.dias_semana || '0,1,2,3,4,5,6')
        .split(',')
        .map((value) => Number(String(value).trim()))
        .filter((value) => Number.isInteger(value));

      const isAllowedDay = days.length === 0 || days.includes(currentDay);
      const isAllowedTime = peruTime.isTimeInWindow(
        currentTime,
        qr.hora_inicio || '00:00:00',
        qr.hora_fin || '23:59:59'
      );

      if (!isAllowedDay || !isAllowedTime) {
        return res.status(403).json({ error: 'El punto de pago seleccionado no está disponible en este horario.' });
      }
    }
  }

  // 1. VALIDACIÓN CENTRALIZADA (CALENDARIO) 
  const opStatus = await canRecharge(req.user.id);
  if (!opStatus.ok) {
    return res.status(403).json({ error: opStatus.message });
  }

  const todayStr = peruTime.todayStr();
  const countResult = await queryOne(`SELECT COUNT(*) as total FROM compras_nivel WHERE usuario_id = ? AND fecha_dia = ? AND estado != 'rechazada'`, [req.user.id, todayStr]);
  if (countResult && Number(countResult.total) >= 3) {
    return res.status(429).json({ error: 'Límite de 3 solicitudes por día alcanzado (Hora Perú).' });
  }

  // 2. Procesar Comprobante (SOPORTE LOCAL v11.5.0)
  let final_comprobante_url = 'telegram_stored';
  let imageBuffer = null;

  if (comprobante_url) {
    // Handle data URLs para SOLO imágenes
    const dataUrlMatch = comprobante_url.match(/^data:(image\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
    if (dataUrlMatch) {
      const mimeType = dataUrlMatch[1];
      const base64Data = dataUrlMatch[2];
      imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Get file extension from mime type
      const ext = `.${mimeType.split('/')[1]}` || '.jpg';
      
      try {
        const result = await uploadImageBuffer(imageBuffer, { folder: 'comprobantes', ext });
        final_comprobante_url = result.secure_url;
      } catch (err) {
        logger.error('Error guardando comprobante local:', err);
      }
    } else {
      return res.status(400).json({ error: 'El comprobante debe ser una imagen válida.' });
    }
  }

  // 3. Encontrar nivel_id correspondiente al monto y validar jerarquía
  const levels = await getLevels();
  const mValue = parseFloat(monto);
  const matchingLevel = levels.find(l => Math.abs(Number(l.deposito) - mValue) < 0.01);
  
  if (!matchingLevel) {
    return res.status(400).json({ error: `El monto de ${mValue} no coincide con ningún nivel VIP disponible.` });
  }

  // VALIDACIÓN DE JERARQUÍA: No permitir bajar de nivel
  const user = req.requestUser;
  const currentLevel = levels.find(l => l.id === user.nivel_id);
  if (currentLevel && matchingLevel.orden < currentLevel.orden) {
    return res.status(400).json({ 
      error: `No puedes adquirir el nivel ${matchingLevel.nombre} porque ya posees un nivel superior (${currentLevel.nombre}). La meta es subir.` 
    });
  }

  const id = uuidv4();
  await query(`
    INSERT INTO compras_nivel (id, usuario_id, nivel_id, monto, metodo_qr_id, comprobante_url, estado, fecha_dia) 
    VALUES (?, ?, ?, ?, ?, ?, 'Verificando', ?)`,
    [id, req.user.id, matchingLevel.id, monto, metodo_qr_id, final_comprobante_url, todayStr]
  );

  // 4. Notificar vía Telegram (Resiliente con safeTelegram)
  const msg = formatRecargaMessage({
    nombre_usuario: user.nombre_usuario, // <-- Añadido
    telefono: user.telefono,
    nivel: matchingLevel.nombre,
    monto: monto,
    fecha: peruTime.todayStr() // <-- Añadido para el formato
  });
  
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📝 Tomar Caso", callback_data: `recarga_tomar_${id}` }
        ]
      ]
    }
  };

  // Enviar imagen directamente a Telegram si existe
  if (imageBuffer) {
    // Notificar con imagen
     sendToAdmin(msg, { ...options, photo: imageBuffer });
     // sendToSecretaria(msg, { photo: imageBuffer }); // ELIMINADO: No notificar a secretaria al inicio
   } else {
     // Notificar solo texto
     sendToAdmin(msg, options);
     // sendToSecretaria(msg); // ELIMINADO: No notificar a secretaria al inicio
   }

  res.json({ success: true, message: 'Solicitud enviada correctamente. En espera de aprobación.' });
}));

export default router;
