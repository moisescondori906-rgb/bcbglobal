import { Router } from 'express';
import { query, queryOne } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Middleware de seguridad para todas las rutas de administración de Telegram
router.use(authenticate);
router.use(requireAdmin);

/**
 * @section GESTIÓN DE OPERADORES (usuarios_telegram)
 */

// Listar todos los operadores
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await query('SELECT * FROM usuarios_telegram ORDER BY created_at DESC');
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrocompatibilidad con /
router.get('/', async (req, res) => {
  try {
    const usuarios = await query('SELECT * FROM usuarios_telegram ORDER BY created_at DESC');
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agregar o actualizar operador (Upsert por telegram_id)
router.post('/', async (req, res) => {
  try {
    const { telegram_id, nombre, rol, activo } = req.body;
    if (!telegram_id || !nombre || !rol) {
      return res.status(400).json({ error: 'telegram_id, nombre y rol son obligatorios' });
    }

    const rolesValidos = ['admin', 'retiro', 'secretaria'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido. Use: admin, retiro o secretaria' });
    }

    await query(`
      INSERT INTO usuarios_telegram (telegram_id, nombre, rol, activo)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        nombre = VALUES(nombre), 
        rol = VALUES(rol), 
        activo = VALUES(activo),
        intentos_fallidos = 0 -- Resetear si se actualiza manualmente
    `, [telegram_id, nombre, rol, activo !== false ? 1 : 0]);

    res.json({ success: true, message: 'Operador guardado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar operador específico
router.put('/:id', async (req, res) => {
  try {
    const { nombre, rol, activo, intentos_fallidos } = req.body;
    await query(`
      UPDATE usuarios_telegram 
      SET nombre = ?, rol = ?, activo = ?, intentos_fallidos = COALESCE(?, intentos_fallidos)
      WHERE telegram_id = ?
    `, [nombre, rol, activo ? 1 : 0, intentos_fallidos, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar operador
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM usuarios_telegram WHERE telegram_id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @section GESTIÓN DE TURNOS (turnos_operadores)
 */

router.get('/turnos', async (req, res) => {
  try {
    const turnos = await query(`
      SELECT t.*, u.nombre as nombre_operador, u.rol 
      FROM turnos_operadores t
      JOIN usuarios_telegram u ON t.telegram_id = u.telegram_id
      ORDER BY t.hora_inicio ASC
    `);
    res.json(turnos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/turnos', async (req, res) => {
  try {
    const { telegram_id, hora_inicio, hora_fin, activo } = req.body;
    if (!telegram_id || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    await query(`
      INSERT INTO turnos_operadores (telegram_id, hora_inicio, hora_fin, activo)
      VALUES (?, ?, ?, ?)
    `, [telegram_id, hora_inicio, hora_fin, activo !== false ? 1 : 0]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/turnos/:id', async (req, res) => {
  try {
    await query('DELETE FROM turnos_operadores WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @section AUDITORÍA Y SEGURIDAD
 */

// Logs de seguridad (intentos fallidos, bloqueos)
router.get('/seguridad-logs', async (req, res) => {
  try {
    const logs = await query('SELECT * FROM seguridad_logs ORDER BY fecha DESC LIMIT 200');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historial completo de retiros (Auditoría operativa)
router.get('/historial', async (req, res) => {
  try {
    const historial = await query('SELECT * FROM historial_retiros ORDER BY fecha DESC LIMIT 500');
    res.json(historial);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/historial-retiros', async (req, res) => {
  try {
    const historial = await query('SELECT * FROM historial_retiros ORDER BY fecha DESC LIMIT 500');
    res.json(historial);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
