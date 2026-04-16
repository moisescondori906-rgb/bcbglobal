import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, transaction } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

// --- EQUIPOS ---

router.get('/equipos', async (req, res) => {
  try {
    const equipos = await query('SELECT * FROM telegram_equipos ORDER BY created_at DESC');
    res.json(equipos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/equipos', async (req, res) => {
  try {
    const { nombre, tipo, chat_id, activo } = req.body;
    if (!nombre || !tipo || !chat_id) return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const id = uuidv4();
    await query(`
      INSERT INTO telegram_equipos (id, nombre, tipo, chat_id, activo)
      VALUES (?, ?, ?, ?, ?)
    `, [id, nombre, tipo, chat_id, activo ? 1 : 0]);

    res.json({ id, nombre, tipo, chat_id, activo: !!activo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/equipos/:id', async (req, res) => {
  try {
    const { nombre, tipo, chat_id, activo } = req.body;
    await query(`
      UPDATE telegram_equipos SET nombre = ?, tipo = ?, chat_id = ?, activo = ?
      WHERE id = ?
    `, [nombre, tipo, chat_id, activo ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/equipos/:id', async (req, res) => {
  try {
    await query('DELETE FROM telegram_equipos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- INTEGRANTES ---

router.get('/integrantes', async (req, res) => {
  try {
    const integrantes = await query(`
      SELECT i.*, e.nombre as equipo_nombre, e.tipo as equipo_tipo
      FROM telegram_integrantes i
      JOIN telegram_equipos e ON i.equipo_id = e.id
      ORDER BY i.created_at DESC
    `);
    res.json(integrantes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/integrantes', async (req, res) => {
  try {
    const { telegram_user_id, nombre_visible, equipo_id, activo } = req.body;
    if (!telegram_user_id || !nombre_visible || !equipo_id) return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const id = uuidv4();
    await query(`
      INSERT INTO telegram_integrantes (id, telegram_user_id, nombre_visible, equipo_id, activo)
      VALUES (?, ?, ?, ?, ?)
    `, [id, telegram_user_id, nombre_visible, equipo_id, activo ? 1 : 0]);

    res.json({ id, telegram_user_id, nombre_visible, equipo_id, activo: !!activo });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El ID de usuario Telegram ya está registrado' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/integrantes/:id', async (req, res) => {
  try {
    const { telegram_user_id, nombre_visible, equipo_id, activo } = req.body;
    await query(`
      UPDATE telegram_integrantes SET telegram_user_id = ?, nombre_visible = ?, equipo_id = ?, activo = ?
      WHERE id = ?
    `, [telegram_user_id, nombre_visible, equipo_id, activo ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/integrantes/:id', async (req, res) => {
  try {
    await query('DELETE FROM telegram_integrantes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- HORARIOS ---

router.get('/horarios', async (req, res) => {
  try {
    let config = await queryOne('SELECT * FROM telegram_config_horarios WHERE id = 1');
    if (!config) {
      await query('INSERT INTO telegram_config_horarios (id, hora_inicio, hora_fin, dias_operativos, activo, visibilidad_numero) VALUES (1, "08:00:00", "22:00:00", "[1,2,3,4,5,6,7]", 1, "parcial")');
      config = await queryOne('SELECT * FROM telegram_config_horarios WHERE id = 1');
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/horarios', async (req, res) => {
  try {
    const { hora_inicio, hora_fin, dias_operativos, activo, visibilidad_numero } = req.body;
    await query(`
      UPDATE telegram_config_horarios 
      SET hora_inicio = ?, hora_fin = ?, dias_operativos = ?, activo = ?, visibilidad_numero = ?
      WHERE id = 1
    `, [hora_inicio, hora_fin, JSON.stringify(dias_operativos), activo ? 1 : 0, visibilidad_numero || 'parcial']);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- HISTORIAL OPERATIVO ---

router.get('/historial', async (req, res) => {
  try {
    const logs = await query(`
      SELECT l.*, i.nombre_visible as operador_nombre
      FROM telegram_operaciones_log l
      LEFT JOIN telegram_integrantes i ON l.telegram_user_id = i.telegram_user_id
      ORDER BY l.fecha DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- USUARIOS TELEGRAM (ROLES DINÁMICOS) ---
// Soportar GET /api/admin/telegram-users y POST /api/admin/telegram-users

router.get(['/usuarios', '/'], async (req, res) => {
  try {
    const usuarios = await query('SELECT * FROM usuarios_telegram ORDER BY fecha_registro DESC');
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(['/usuarios', '/'], async (req, res) => {
  try {
    const { telegram_id, nombre, rol, activo } = req.body;
    if (!telegram_id || !nombre || !rol) return res.status(400).json({ error: 'Faltan campos obligatorios' });

    await query(`
      INSERT INTO usuarios_telegram (telegram_id, nombre, rol, activo)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), rol = VALUES(rol), activo = VALUES(activo)
    `, [telegram_id, nombre, rol, activo !== undefined ? (activo ? 1 : 0) : 1]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put(['/usuarios/:id', '/:id'], async (req, res) => {
  try {
    const { nombre, rol, activo } = req.body;
    await query(`
      UPDATE usuarios_telegram SET nombre = ?, rol = ?, activo = ?
      WHERE id = ?
    `, [nombre, rol, activo ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete(['/usuarios/:id', '/:id'], async (req, res) => {
  try {
    await query('DELETE FROM usuarios_telegram WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
