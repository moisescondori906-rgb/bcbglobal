import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  getPublicContent, getLevels, boliviaTime, canRecharge 
} from '../lib/queries.js';
import { query, queryOne } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { attachRequestUser } from '../middleware/requestContext.js';
import logger from '../lib/logger.js';

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
    const list = await query(`SELECT * FROM recargas WHERE usuario_id = ? ORDER BY created_at DESC`, [req.user.id]);
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
    const countResult = await queryOne(`SELECT COUNT(*) as total FROM recargas WHERE usuario_id = ? AND DATE(created_at) = ?`, [req.user.id, todayStr]);
    if (countResult.total >= 3) {
      return res.status(429).json({ error: 'Límite de 3 recargas por día alcanzado.' });
    }

    const id = uuidv4();
    await query(`INSERT INTO recargas (id, usuario_id, monto, comprobante_url, estado) VALUES (?, ?, ?, ?, 'pendiente')`,
      [id, req.user.id, parseFloat(monto), comprobante_url]);

    res.json({ id, ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar la recarga' });
  }
});

export default router;
