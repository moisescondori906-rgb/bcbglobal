import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  getLevels, updateUser, findUserWithAuthSecrets,
  getMensajesGlobales, boliviaTime, getUserTeamReport
} from '../lib/queries.js';
import { authenticate } from '../middleware/auth.js';
import { attachRequestUser, DEMO_USER_ID } from '../middleware/requestContext.js';
import { query, queryOne } from '../config/db.js';
import logger from '../lib/logger.js';

const router = Router();

router.use(authenticate);
router.use(attachRequestUser);

function sanitizeUser(u, levels) {
  const level = levels.find(l => String(l.id) === String(u.nivel_id));
  return {
    id: u.id,
    telefono: u.telefono,
    nombre_usuario: u.nombre_usuario,
    nombre_real: u.nombre_real,
    codigo_invitacion: u.codigo_invitacion,
    nivel: level?.nombre || 'Pasante',
    nivel_id: u.nivel_id,
    nivel_codigo: level?.codigo || 'pasante',
    saldo_principal: u.saldo_principal || 0,
    saldo_comisiones: u.saldo_comisiones || 0,
    rol: u.rol,
    avatar_url: u.avatar_url,
    tickets_ruleta: u.tickets_ruleta || 0,
    tiene_password_fondo: !!u.password_fondo_hash,
  };
}

router.get('/me', async (req, res) => {
  try {
    const user = req.requestUser;
    const levels = await getLevels().catch(() => [
      { id: 'l1', codigo: 'pasante', nombre: 'Pasante' },
      { id: 'l2', codigo: 'Global 1', nombre: 'Global 1' }
    ]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(sanitizeUser(user, levels));
  } catch (err) {
    res.status(500).json({ error: 'Error al recuperar perfil' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = req.requestUser;

    // MODO DEMO: Bypass si el ID es el de demo
    if (userId === DEMO_USER_ID) {
      return res.json({
        ingresos_hoy: 50.40,
        ingresos_ayer: 45.20,
        total_completadas: 8,
        saldo_principal: user.saldo_principal,
        saldo_comisiones: user.saldo_comisiones,
      });
    }

    const today = boliviaTime.todayStr();
    const yesterday = boliviaTime.yesterdayStr();

    const stats = await queryOne(`
      SELECT 
        COALESCE(SUM(CASE WHEN fecha_dia = ? THEN monto_ganado ELSE 0 END), 0) as hoy,
        COALESCE(SUM(CASE WHEN fecha_dia = ? THEN monto_ganado ELSE 0 END), 0) as ayer,
        COUNT(CASE WHEN fecha_dia = ? THEN 1 END) as tareas_hoy
      FROM actividad_tareas 
      WHERE usuario_id = ?
    `, [today, yesterday, today, userId]);

    res.json({
      ingresos_hoy: stats.hoy,
      ingresos_ayer: stats.ayer,
      total_completadas: stats.tareas_hoy,
      saldo_principal: user.saldo_principal,
      saldo_comisiones: user.saldo_comisiones,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/earnings', async (req, res) => {
  try {
    const userId = req.user.id;

    // MODO DEMO: Bypass si el ID es el de demo
    if (userId === DEMO_USER_ID) {
      return res.json({
        history: [
          { id: '1', tipo_movimiento: 'tarea', monto: 1.80, fecha: new Date().toISOString(), descripcion: 'Tarea completada demo' },
          { id: '2', tipo_movimiento: 'tarea_red', monto: 0.50, fecha: new Date().toISOString(), descripcion: 'Comisión red demo' }
        ]
      });
    }

    const movimientos = await query(`
      SELECT * FROM movimientos_saldo 
      WHERE usuario_id = ? 
      ORDER BY fecha DESC 
      LIMIT 50
    `, [userId]);
    
    res.json({
      history: movimientos
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

router.get('/team', async (req, res) => {
  try {
    const report = await getUserTeamReport(req.user.id);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reporte de equipo' });
  }
});

router.get('/team-report', async (req, res) => {
  try {
    const report = await getUserTeamReport(req.user.id);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reporte de equipo' });
  }
});

router.get('/tarjetas', async (req, res) => {
  if (req.user.id === DEMO_USER_ID) return res.json([{ id: 'demo-card', nombre_banco: 'Banco Demo', numero_cuenta: '12345678', nombre_titular: 'Socio Demo' }]);
  const tarjetas = await query(`SELECT * FROM tarjetas_bancarias WHERE usuario_id = ?`, [req.user.id]);
  res.json(tarjetas);
});

router.post('/tarjetas', async (req, res) => {
  if (req.user.id === DEMO_USER_ID) return res.json({ id: 'demo-card', ok: true });
  const { nombre_banco, numero_cuenta, nombre_titular } = req.body;
  const id = uuidv4();
  await query(`INSERT INTO tarjetas_bancarias (id, usuario_id, nombre_banco, numero_cuenta, nombre_titular) VALUES (?, ?, ?, ?, ?)`,
    [id, req.user.id, nombre_banco, numero_cuenta, nombre_titular]);
  res.json({ id, ok: true });
});

router.get('/mensajes', async (req, res) => {
  try {
    const mensajes = await getMensajesGlobales().catch(() => [
      { id: 'm1', titulo: 'Bienvenido Socio Demo', contenido: 'Este es un mensaje de prueba para visualización.', fecha: new Date().toISOString() }
    ]);
    res.json(mensajes);
  } catch (err) {
    res.json([]);
  }
});

export default router;
