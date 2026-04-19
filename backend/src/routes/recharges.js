import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  getPublicContent, getLevels, boliviaTime, canRecharge 
} from '../lib/queries.js';
import { query, queryOne } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { attachRequestUser } from '../middleware/requestContext.js';
import { 
  sendToAdmin, 
  sendToSecretaria, 
  formatRecargaMessage 
} from '../services/telegramBot.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import logger from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

router.use(authenticate);
router.use(attachRequestUser);

router.get('/metodos', async (req, res) => {
  try {
    const metodos = await query(`SELECT id, nombre_titular, imagen_qr_url FROM metodos_qr WHERE activo = 1 ORDER BY orden ASC`);
    res.json(metodos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener métodos de pago' });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await query(`SELECT * FROM compras_nivel WHERE usuario_id = ? ORDER BY created_at DESC`, [req.user.id]);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tus recargas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { monto, metodo_qr_id, comprobante_url } = req.body;
    if (!monto || isNaN(parseFloat(monto))) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    // 1. VALIDACIÓN CENTRALIZADA (CALENDARIO)
    const opStatus = await canRecharge(req.user.id);
    if (!opStatus.ok) {
      return res.status(403).json({ error: opStatus.message });
    }

    const todayStr = boliviaTime.todayStr();
    const countResult = await queryOne(`SELECT COUNT(*) as total FROM compras_nivel WHERE usuario_id = ? AND DATE(created_at) = ?`, [req.user.id, todayStr]);
    if (countResult.total >= 3) {
      return res.status(429).json({ error: 'Límite de 3 solicitudes por día alcanzado.' });
    }

    // 2. Procesar Comprobante (Cloudinary con Fallback Local)
    let final_comprobante_url = comprobante_url;
    if (comprobante_url && comprobante_url.startsWith('data:image')) {
      try {
        // Intentar Cloudinary
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          const base64Data = comprobante_url.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const uploadResult = await uploadImageBuffer(buffer, {
            folder: 'bcb_global/comprobantes_recarga'
          });
          final_comprobante_url = uploadResult.secure_url;
        } else {
          throw new Error('Cloudinary not configured');
        }
      } catch (cloudErr) {
        // Fallback: Guardar Localmente
        logger.warn(`[RECHARGE] Cloudinary falló o no configurado, usando storage local: ${cloudErr.message}`);
        const base64Data = comprobante_url.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `voucher_${Date.now()}_${uuidv4().substring(0, 8)}.jpg`;
        const uploadDir = path.join(__dirname, '../../public/uploads');
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(uploadDir, filename), buffer);
        final_comprobante_url = `${process.env.BACKEND_URL || ''}/uploads/${filename}`;
      }
    }

    // 3. Encontrar nivel_id correspondiente al monto
    const levels = await getLevels();
    const matchingLevel = levels.find(l => Math.abs(Number(l.deposito) - Number(monto)) < 0.01);
    
    if (!matchingLevel) {
      return res.status(400).json({ error: 'El monto no coincide con ningún nivel VIP disponible.' });
    }

    const id = uuidv4();
    logger.info(`[RECHARGE] Insertando compra_nivel: ${id} para usuario ${req.user.id}, monto ${monto}, nivel ${matchingLevel.id}`);
    
    await query(`INSERT INTO compras_nivel (id, usuario_id, nivel_id, monto, comprobante_url, estado) VALUES (?, ?, ?, ?, ?, 'pendiente')`,
      [id, req.user.id, matchingLevel.id, parseFloat(monto), final_comprobante_url]);

    // 4. Alerta de Telegram
    if (!req.requestUser) {
      logger.error(`[RECHARGE] req.requestUser es null para el usuario ${req.user.id}`);
      return res.json({ id: id, ok: true, warn: 'Solicitud guardada pero alerta de telegram falló' });
    }
    
    const userLevel = levels.find(l => String(l.id) === String(req.requestUser.nivel_id));
    
    const telegramData = {
      telefono: req.requestUser.nombre_usuario,
      nivel: userLevel?.nombre || 'Pasante',
      monto: parseFloat(monto),
      nuevo_nivel: matchingLevel.nombre,
      comprobante_url: final_comprobante_url
    };

    const message = formatRecargaMessage(telegramData);

    // Enviar a Admin y Secretaria
    Promise.all([
      sendToAdmin(message),
      sendToSecretaria(message)
    ]).catch(e => logger.error(`[Telegram Alert Error]: ${e.message}`));

    res.json({ id: id, ok: true });
  } catch (err) {
    logger.error(`[Recharge Error]: ${err.message}`);
    res.status(500).json({ error: 'Error al procesar la recarga' });
  }
});

export default router;
