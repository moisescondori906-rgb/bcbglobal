import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  getLevels, updateUser, findUserWithAuthSecrets,
  getMensajesGlobales, boliviaTime, getUserTeamReport
} from '../../services/dbService.mjs';
import { authenticate } from '../../utils/middleware/auth.mjs';
import { attachRequestUser, DEMO_USER_ID } from '../../utils/middleware/requestContext.mjs';
import { query, queryOne } from '../../config/db.mjs';
import logger from '../../utils/logger.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();

router.use(authenticate);
router.use(attachRequestUser);

function sanitizeUser(u, levels) {
  const safeLevels = Array.isArray(levels) ? levels : [];
  const level = safeLevels.find(l => String(l.id) === String(u.nivel_id));
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
    avatar_url: u.avatar_url,
    tickets_ruleta: Number(u.tickets_ruleta) || 0,
    tiene_password_fondo: !!u.password_fondo_hash,
    last_device_id: u.last_device_id,
    security_alert: u.security_alert,
  };
}

router.get('/me', asyncHandler(async (req, res) => {
  try {
    const user = req.requestUser;
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const levels = await getLevels().catch(() => [
      { id: 'l1', codigo: 'internar', nombre: 'Internar' },
      { id: 'l2', codigo: 'global1', nombre: 'GLOBAL 1' }
    ]);
    
    res.json(sanitizeUser(user, levels));
  } catch (err) {
    logger.error('[USERS-ME-ERROR]', err.message);
    res.status(500).json({ error: 'Error interno al cargar perfil' });
  }
}));

router.post('/clear-security-alert', asyncHandler(async (req, res) => {
  await updateUser(req.user.id, { security_alert: null });
  res.json({ ok: true });
}));

router.get('/stats', asyncHandler(async (req, res) => {
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
      COALESCE(SUM(monto_ganado), 0) as total_acumulado,
      COUNT(CASE WHEN fecha_dia = ? THEN 1 END) as tareas_hoy
    FROM actividad_tareas 
    WHERE usuario_id = ?
  `, [today, yesterday, today, userId]);

  res.json({
    ingresos_hoy: stats.hoy,
    ingresos_ayer: stats.ayer,
    total_acumulado: stats.total_acumulado,
    total_completadas: stats.tareas_hoy,
    saldo_principal: user.saldo_principal,
    saldo_comisiones: user.saldo_comisiones,
  });
}));

router.get('/earnings', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = req.requestUser;

  // MODO DEMO: Bypass si el ID es el de demo
  if (userId === DEMO_USER_ID) {
    return res.json({
      summary: { total: user.saldo_principal, hoy: 50.40 },
      history: [
        { id: '1', tipo_movimiento: 'tarea', monto: 1.80, created_at: new Date().toISOString(), descripcion: 'Tarea completada demo' },
        { id: '2', tipo_movimiento: 'tarea_red', monto: 0.50, created_at: new Date().toISOString(), descripcion: 'Comisión red demo' }
      ]
    });
  }

  const today = boliviaTime.todayStr();

  // 1. Obtener historial (v11.3.6)
  const movimientos = await query(`
    SELECT * FROM movimientos_saldo 
    WHERE usuario_id = ? 
    ORDER BY fecha DESC 
    LIMIT 50
  `, [userId]);

  // 2. Obtener resumen de hoy y total acumulado (Ganancias Reales)
  const stats = await queryOne(`
    SELECT 
      COALESCE(SUM(CASE WHEN fecha_dia = ? THEN monto_ganado ELSE 0 END), 0) as hoy
    FROM actividad_tareas 
    WHERE usuario_id = ?
  `, [today, userId]);
  
  res.json({
    summary: {
      total: user.saldo_principal, // Balance actual real
      hoy: stats.hoy              // Ganancia de hoy por tareas
    },
    history: movimientos
  });
}));

router.get('/team', asyncHandler(async (req, res) => {
  const report = await getUserTeamReport(req.user.id);
  res.json(report);
}));

router.get('/team-report', asyncHandler(async (req, res) => {
  const report = await getUserTeamReport(req.user.id);
  res.json(report);
}));

router.get('/tarjetas', asyncHandler(async (req, res) => {
  if (req.user.id === DEMO_USER_ID) return res.json([{ id: 'demo-card', nombre_banco: 'Banco Demo', numero_cuenta: '12345678', nombre_titular: 'Socio Demo' }]);
  const tarjetas = await query(`SELECT * FROM tarjetas_bancarias WHERE usuario_id = ?`, [req.user.id]);
  res.json(tarjetas);
}));

router.post('/tarjetas', asyncHandler(async (req, res) => {
  if (req.user.id === DEMO_USER_ID) return res.json({ id: 'demo-card', ok: true });
  const { nombre_banco, numero_cuenta, nombre_titular } = req.body;
  const id = uuidv4();
  await query(`INSERT INTO tarjetas_bancarias (id, usuario_id, nombre_banco, numero_cuenta, nombre_titular) VALUES (?, ?, ?, ?, ?)`,
    [id, req.user.id, nombre_banco, numero_cuenta, nombre_titular]);
  res.json({ id, ok: true });
}));

router.get('/mensajes', asyncHandler(async (req, res) => {
  const mensajes = await getMensajesGlobales().catch(() => [
    { id: 'm1', titulo: 'Bienvenido Socio Demo', contenido: 'Este es un mensaje de prueba para visualización.', fecha: new Date().toISOString() }
  ]);
  res.json(mensajes);
}));

// ========================
// CUESTIONARIO (PASIVO)
// ========================

router.get('/cuestionario', asyncHandler(async (req, res) => {
  const config = await queryOne(`SELECT valor FROM configuraciones WHERE clave = 'cuestionario'`);
  if (!config) return res.json({ activo: false });
  
  const datos = JSON.parse(config.valor);
  if (!datos.activo) return res.json({ activo: false });

  // Verificar si el usuario ya respondió hoy
  const today = boliviaTime.todayStr();
  const yaRespondio = await queryOne(`SELECT id FROM respuestas_cuestionario WHERE usuario_id = ? AND fecha_dia = ?`, [req.user.id, today]);

  res.json({
    activo: true,
    ya_respondio: !!yaRespondio,
    datos: {
      id: datos.id,
      titulo: datos.titulo,
      preguntas: datos.preguntas
    }
  });
}));

router.post('/cuestionario/responder', asyncHandler(async (req, res) => {
  const { respuestas } = req.body;
  const today = boliviaTime.todayStr();
  
  // Guardar respuestas de forma pasiva
  await query(`INSERT INTO respuestas_cuestionario (id, usuario_id, fecha_dia, respuestas) VALUES (?, ?, ?, ?) 
    ON DUPLICATE KEY UPDATE respuestas = VALUES(respuestas)`, 
    [uuidv4(), req.user.id, today, JSON.stringify(respuestas)]);

  res.json({ ok: true, message: 'Gracias por participar en nuestra encuesta diaria.' });
}));

router.get('/my-referrals', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const referrals = await query(`
    SELECT 
      u.id, 
      u.telefono, 
      u.nombre_usuario, 
      u.created_at, 
      COALESCE(n.nombre, 'Internar') AS nivel, 
      COALESCE(n.codigo, 'internar') AS nivel_codigo 
    FROM usuarios u 
    LEFT JOIN niveles n ON n.id = u.nivel_id 
    WHERE u.invitado_por = ? 
    ORDER BY u.created_at DESC
  `, [userId]);

  const maskPhoneLast5 = (phone) => {
    const raw = String(phone || '');
    const digits = raw.replace(/\D/g, '');
    const last5 = digits.slice(-5);
    if (!last5) return 'Sin número';
    return `******${last5}`;
  };

  const maskedReferrals = referrals.map(ref => ({
    id: ref.id,
    nombre_usuario: ref.nombre_usuario,
    telefono_masked: maskPhoneLast5(ref.telefono),
    nivel: ref.nivel,
    nivel_codigo: ref.nivel_codigo,
    created_at: ref.created_at
  }));

  res.json({
    items: maskedReferrals,
    total: maskedReferrals.length
  });
}));

export default router;
