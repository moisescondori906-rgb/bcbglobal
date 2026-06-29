import { Router } from 'express';
import { query, queryOne } from '../../config/db.mjs';
import { authenticate, requireAdmin } from '../../utils/middleware/auth.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();

// Middleware de seguridad para todas las rutas de administración de Telegram
router.use(authenticate);
router.use(requireAdmin);

/**
 * @section GESTIÓN DE OPERADORES (usuarios_telegram)
 */

// Listar todos los operadores
router.get('/usuarios', asyncHandler(async (req, res) => {
  const usuarios = await query('SELECT * FROM usuarios_telegram ORDER BY created_at DESC');
  res.json(usuarios);
}));

// Retrocompatibilidad con /
router.get('/', asyncHandler(async (req, res) => {
  const usuarios = await query('SELECT * FROM usuarios_telegram ORDER BY created_at DESC');
  res.json(usuarios);
}));

// Agregar o actualizar operador (Upsert por telegram_id)
router.post('/', asyncHandler(async (req, res) => {
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
}));

// Actualizar operador específico
router.put('/:id', asyncHandler(async (req, res) => {
  const { nombre, rol, activo, intentos_fallidos } = req.body;
  await query(`
    UPDATE usuarios_telegram 
    SET nombre = ?, rol = ?, activo = ?, intentos_fallidos = COALESCE(?, intentos_fallidos)
    WHERE telegram_id = ?
  `, [nombre, rol, activo ? 1 : 0, intentos_fallidos, req.params.id]);
  res.json({ ok: true });
}));

// Eliminar operador
router.delete('/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM usuarios_telegram WHERE telegram_id = ?', [req.params.id]);
  res.json({ ok: true });
}));

/**
 * @section GESTIÓN DE TURNOS (turnos_operadores)
 */

router.get('/turnos', asyncHandler(async (req, res) => {
  const turnos = await query(`
    SELECT t.*, u.nombre as nombre_operador, u.rol 
    FROM turnos_operadores t
    JOIN usuarios_telegram u ON t.telegram_id = u.telegram_id
    ORDER BY t.hora_inicio ASC
  `);
  res.json(turnos);
}));

router.post('/turnos', asyncHandler(async (req, res) => {
  const { telegram_id, hora_inicio, hora_fin, activo } = req.body;
  if (!telegram_id || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  await query(`
    INSERT INTO turnos_operadores (telegram_id, hora_inicio, hora_fin, activo)
    VALUES (?, ?, ?, ?)
  `, [telegram_id, hora_inicio, hora_fin, activo !== false ? 1 : 0]);

  res.json({ success: true });
}));

router.delete('/turnos/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM turnos_operadores WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

/**
 * @section AUDITORÍA Y SEGURIDAD
 */

// Logs de seguridad (intentos fallidos, bloqueos)
router.get('/seguridad-logs', asyncHandler(async (req, res) => {
  const logs = await query('SELECT * FROM seguridad_logs ORDER BY fecha DESC LIMIT 200');
  res.json(logs);
}));

// Historial completo de retiros (Auditoría operativa)
router.get('/historial', asyncHandler(async (req, res) => {
  const historial = await query('SELECT * FROM historial_retiros ORDER BY fecha DESC LIMIT 500');
  res.json(historial);
}));

router.get('/historial-retiros', asyncHandler(async (req, res) => {
  const historial = await query('SELECT * FROM historial_retiros ORDER BY fecha DESC LIMIT 500');
  res.json(historial);
}));

export default router;
