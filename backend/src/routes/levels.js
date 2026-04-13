import { Router } from 'express';
import { getLevels } from '../lib/queries.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const levels = await getLevels();
    res.json(levels);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener niveles' });
  }
});

router.get('/ganancias', authenticate, async (req, res) => {
  try {
    const levels = await getLevels();
    res.json(levels);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ganancias' });
  }
});

export default router;
