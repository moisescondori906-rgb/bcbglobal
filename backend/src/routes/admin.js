import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { 
  getUsers, getLevels, findUserById, updateUser, 
  getPublicContent, approveRecarga, rejectRetiro,
  boliviaTime, distributeInvestmentCommissions, refreshPublicContent, 
  invalidateLevelsCache, preloadLevels, syncLevels,
  getMensajesGlobales, createMensajeGlobal, deleteMensajeGlobal
} from '../lib/queries.js';
import { query, queryOne } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

function sanitizeUser(u, levels) {
  const level = levels.find(l => String(l.id) === String(u.nivel_id));
  return {
    id: u.id,
    telefono: u.telefono,
    nombre_usuario: u.nombre_usuario,
    nombre_real: u.nombre_real,
    codigo_invitacion: u.codigo_invitacion,
    nivel: level?.nombre || 'Internar',
    nivel_id: u.nivel_id,
    nivel_codigo: level?.codigo || 'internar',
    saldo_principal: u.saldo_principal || 0,
    saldo_comisiones: u.saldo_comisiones || 0,
    rol: u.rol,
    bloqueado: u.bloqueado,
    tickets_ruleta: Number(u.tickets_ruleta) || 0,
    created_at: u.created_at,
  };
}

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'usuario') as total_usuarios,
        (SELECT COALESCE(SUM(monto), 0) FROM recargas WHERE estado = 'aprobada') as total_recargas,
        (SELECT COALESCE(SUM(monto), 0) FROM retiros WHERE estado = 'pagado') as total_retiros,
        (SELECT COUNT(*) FROM retiros WHERE estado = 'pendiente') as pendientes_retiro,
        (SELECT COUNT(*) FROM recargas WHERE estado = 'pendiente') as pendientes_recarga
    `);
    res.json(stats[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/usuarios', async (req, res) => {
  try {
    const users = await query(`SELECT * FROM usuarios`);
    const levels = await getLevels();
    const filtered = users.map(u => sanitizeUser(u, levels));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recargas/:id/aprobar', async (req, res) => {
  try {
    const result = await approveRecarga(req.params.id, req.user.id);
    const recarga = await queryOne(`SELECT * FROM recargas WHERE id = ?`, [req.params.id]);
    if (recarga) {
      await distributeInvestmentCommissions(recarga.usuario_id, recarga.monto);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/retiros/:id/rechazar', async (req, res) => {
  try {
    await rejectRetiro(req.params.id, req.user.id, req.body.motivo);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/config', async (req, res) => {
  try {
    const updates = req.body;
    for (const [clave, valor] of Object.entries(updates)) {
      await query(`INSERT INTO configuraciones (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?`, 
        [clave, JSON.stringify(valor), JSON.stringify(valor)]);
    }
    await refreshPublicContent();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mensajes', async (req, res) => {
  try {
    const mensajes = await getMensajesGlobales();
    res.json(mensajes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/mensajes', async (req, res) => {
  try {
    const { titulo, contenido, imagen_url } = req.body;
    if (!titulo || !contenido) return res.status(400).json({ error: 'Título y contenido requeridos' });
    const nuevo = await createMensajeGlobal({ titulo, contenido, imagen_url });
    res.json(nuevo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/mensajes/:id', async (req, res) => {
  try {
    await deleteMensajeGlobal(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/levels/sync', async (req, res) => {
  try {
    await syncLevels();
    res.json({ ok: true, message: 'Niveles sincronizados con la tabla oficial' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/usuarios/:id/ajuste', async (req, res) => {
  try {
    const { tipo, monto, motivo } = req.body;
    const userId = req.params.id;
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const field = tipo === 'comisiones' ? 'saldo_comisiones' : 'saldo_principal';
    const oldBalance = Number(user[field]);
    const newBalance = oldBalance + Number(monto);

    await updateUser(userId, { [field]: newBalance });

    await query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, descripcion) 
      VALUES (?, ?, ?, 'ajuste_admin', ?, ?, ?, ?)`, 
      [uuidv4(), userId, tipo === 'comisiones' ? 'comisiones' : 'principal', monto, oldBalance, newBalance, motivo || 'Ajuste administrativo']);

    res.json({ ok: true, newBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// GESTIÓN DE NIVELES
// ========================

router.get('/niveles', async (req, res) => {
  try {
    const levels = await getLevels();
    res.json(levels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/niveles/:id', async (req, res) => {
  try {
    const { 
      nombre, deposito, ganancia_tarea, num_tareas_diarias, orden, activo,
      retiro_horario_habilitado, retiro_dia_inicio, retiro_dia_fin, 
      retiro_hora_inicio, retiro_hora_fin 
    } = req.body;

    await query(`
      UPDATE niveles SET 
        nombre = ?, deposito = ?, ganancia_tarea = ?, num_tareas_diarias = ?, orden = ?, activo = ?,
        retiro_horario_habilitado = ?, retiro_dia_inicio = ?, retiro_dia_fin = ?, 
        retiro_hora_inicio = ?, retiro_hora_fin = ?
      WHERE id = ?
    `, [
      nombre, deposito, ganancia_tarea, num_tareas_diarias, orden, activo,
      retiro_horario_habilitado, retiro_dia_inicio, retiro_dia_fin, 
      retiro_hora_inicio, retiro_hora_fin, 
      req.params.id
    ]);

    invalidateLevelsCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// GESTIÓN DE TAREAS (CONTENIDO GLOBAL)
// ========================

router.get('/tareas', async (req, res) => {
  try {
    const tareas = await query(`SELECT * FROM tareas ORDER BY created_at DESC`);
    res.json(tareas.map(t => ({
      ...t,
      opciones: typeof t.opciones === 'string' ? JSON.parse(t.opciones) : t.opciones
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tareas', async (req, res) => {
  try {
    const { nombre, video_url, pregunta, opciones, respuesta_correcta } = req.body;
    const id = uuidv4();
    
    await query(`
      INSERT INTO tareas (id, nombre, video_url, pregunta, opciones, respuesta_correcta, activa, orden) 
      VALUES (?, ?, ?, ?, ?, ?, 1, 0)
    `, [id, nombre, video_url, pregunta, JSON.stringify(opciones), respuesta_correcta]);

    res.json({ id, nombre, video_url, pregunta, opciones, respuesta_correcta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tareas/:id', async (req, res) => {
  try {
    const { nombre, video_url, pregunta, opciones, respuesta_correcta } = req.body;
    await query(`
      UPDATE tareas SET 
        nombre = ?, video_url = ?, pregunta = ?, opciones = ?, respuesta_correcta = ?
      WHERE id = ?
    `, [nombre, video_url, pregunta, JSON.stringify(opciones), respuesta_correcta, req.params.id]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tareas/:id', async (req, res) => {
  try {
    await query(`DELETE FROM tareas WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// CALENDARIO OPERATIVO
// ========================

router.get('/calendario', async (req, res) => {
  try {
    const list = await query(`SELECT * FROM calendario_operativo ORDER BY fecha ASC`);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/calendario', async (req, res) => {
  try {
    const { fecha, tipo_dia, es_feriado, tareas_habilitadas, retiros_habilitados, recargas_habilitadas, motivo, reglas_niveles } = req.body;
    if (!fecha) return res.status(400).json({ error: 'Fecha requerida' });

    await query(`
      INSERT INTO calendario_operativo 
      (fecha, tipo_dia, es_feriado, tareas_habilitadas, retiros_habilitados, recargas_habilitadas, motivo, reglas_niveles) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        tipo_dia = VALUES(tipo_dia),
        es_feriado = VALUES(es_feriado),
        tareas_habilitadas = VALUES(tareas_habilitadas),
        retiros_habilitados = VALUES(retiros_habilitados),
        recargas_habilitadas = VALUES(recargas_habilitadas),
        motivo = VALUES(motivo),
        reglas_niveles = VALUES(reglas_niveles)
    `, [fecha, tipo_dia, es_feriado, tareas_habilitadas, retiros_habilitados, recargas_habilitadas, motivo, JSON.stringify(reglas_niveles || {})]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/calendario/:fecha', async (req, res) => {
  try {
    await query(`DELETE FROM calendario_operativo WHERE fecha = ?`, [req.params.fecha]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// CUESTIONARIO Y ENCUESTAS (PASIVO)
// ========================

router.get('/cuestionario/respuestas', async (req, res) => {
  try {
    const list = await query(`
      SELECT r.*, u.nombre_usuario, u.telefono 
      FROM respuestas_cuestionario r
      JOIN usuarios u ON r.usuario_id = u.id
      ORDER BY r.created_at DESC 
      LIMIT 100
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cuestionario/castigar', (req, res) => {
  // Endpoint obsoleto, ahora las encuestas son pasivas
  res.json({ ok: true, message: 'La función de castigo ha sido desactivada. Las encuestas son ahora opcionales.', punished: 0 });
});

export default router;
