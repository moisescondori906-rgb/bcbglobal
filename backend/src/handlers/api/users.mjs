import fs from 'fs';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  getLevels, updateUser, findUserWithAuthSecrets,
  getMensajesGlobales, peruTime, getUserTeamReport,
  getEquipoPatrocinador, getRetirosPendientesPatrocinador,
  aprobarRetiroPorPatrocinador, rechazarRetiroPorPatrocinador,
  getConteoRetirosPatrocinador, getPasantiaWithdrawalPolicy
} from '../../services/dbService.mjs';
import { authenticate } from '../../utils/middleware/auth.mjs';
import { attachRequestUser, DEMO_USER_ID } from '../../utils/middleware/requestContext.mjs';
import { query, queryOne, transaction } from '../../config/db.mjs';
import logger from '../../utils/logger.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();

router.use(authenticate);
router.use(attachRequestUser);

// #region debug-point A:fund-password-debug-reporter
function reportFundPasswordDebug(hypothesisId, location, msg, data = {}) {
  let debugUrl = 'http://127.0.0.1:7777/event';
  let sessionId = 'fund-password-400';
  try {
    const envFile = fs.readFileSync('.dbg/fund-password-400.env', 'utf8');
    debugUrl = envFile.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || debugUrl;
    sessionId = envFile.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || sessionId;
  } catch {}
  fetch(debugUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      runId: 'pre-fix',
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now()
    })
  }).catch(() => {});
}
// #endregion

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
    grado_colaborador: u.grado_colaborador || 'ninguno',
    salario_colaborador: Number(u.salario_colaborador || 0),
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

  // 1. Ingresos Hoy (v13.1.2) - Solo ganancias (tareas + comisiones), no recargas
  const statsHoy = await queryOne(`
    SELECT 
      COALESCE(SUM(monto), 0) as total 
    FROM movimientos_saldo 
    WHERE usuario_id = ? 
    AND DATE(fecha) = CURDATE() 
    AND monto > 0
    AND tipo_movimiento IN ('tarea_completada', 'ganancia_tarea', 'comision_subordinado', 'comision_red', 'comision_inversion', 'comision_tarea', 'recompensa_invitacion', 'bono_invitado', 'premio_ruleta')
  `, [userId]);

  // 2. Ingresos Ayer
  const statsAyer = await queryOne(`
    SELECT 
      COALESCE(SUM(monto), 0) as total 
    FROM movimientos_saldo 
    WHERE usuario_id = ? 
    AND DATE(fecha) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) 
    AND monto > 0
    AND tipo_movimiento IN ('tarea_completada', 'ganancia_tarea', 'comision_subordinado', 'comision_red', 'comision_inversion', 'comision_tarea', 'recompensa_invitacion', 'bono_invitado', 'premio_ruleta')
  `, [userId]);

  // 3. Ingresos Semana
  const statsSemana = await queryOne(`
    SELECT 
      COALESCE(SUM(monto), 0) as total 
    FROM movimientos_saldo 
    WHERE usuario_id = ? 
    AND YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1) 
    AND monto > 0
    AND tipo_movimiento IN ('tarea_completada', 'ganancia_tarea', 'comision_subordinado', 'comision_red', 'comision_inversion', 'comision_tarea', 'recompensa_invitacion', 'bono_invitado', 'premio_ruleta')
  `, [userId]);

  // 4. Ingresos Mes
  const statsMes = await queryOne(`
    SELECT 
      COALESCE(SUM(monto), 0) as total 
    FROM movimientos_saldo 
    WHERE usuario_id = ? 
    AND MONTH(fecha) = MONTH(CURDATE()) 
    AND YEAR(fecha) = YEAR(CURDATE()) 
    AND monto > 0
    AND tipo_movimiento IN ('tarea_completada', 'ganancia_tarea', 'comision_subordinado', 'comision_red', 'comision_inversion', 'comision_tarea', 'recompensa_invitacion', 'bono_invitado', 'premio_ruleta')
  `, [userId]);

  // 5. Total Acumulado (Todas las ganancias históricas - Solo ingresos por actividad)
  const statsTotal = await queryOne(`
    SELECT 
      COALESCE(SUM(monto), 0) as total,
      COUNT(CASE WHEN tipo_movimiento IN ('tarea_completada', 'ganancia_tarea') THEN 1 END) as completadas
    FROM movimientos_saldo 
    WHERE usuario_id = ? 
    AND monto > 0
    AND tipo_movimiento IN ('tarea_completada', 'ganancia_tarea', 'comision_subordinado', 'comision_red', 'comision_inversion', 'comision_tarea', 'recompensa_invitacion', 'bono_invitado', 'premio_ruleta')
  `, [userId]);

  // 6. Pie chart data (categorización de ingresos)
  const pieData = await query(`
    SELECT 
      CASE 
        WHEN tipo_movimiento IN ('tarea_completada', 'ganancia_tarea') THEN 'Tareas'
        WHEN tipo_movimiento IN ('comision_subordinado', 'comision_red', 'comision_inversion', 'comision_tarea') THEN 'Comisiones'
        WHEN tipo_movimiento IN ('recompensa_invitacion', 'bono_invitado') THEN 'Invitaciones'
        WHEN tipo_movimiento = 'premio_ruleta' THEN 'Ruleta'
        ELSE 'Otros'
      END as name,
      COALESCE(SUM(monto), 0) as value
    FROM movimientos_saldo 
    WHERE usuario_id = ? 
    AND monto > 0
    AND tipo_movimiento IN ('tarea_completada', 'ganancia_tarea', 'comision_subordinado', 'comision_red', 'comision_inversion', 'comision_tarea', 'recompensa_invitacion', 'bono_invitado', 'premio_ruleta')
    GROUP BY name
  `, [userId]);

  res.json({
    ingresos_hoy: Number(statsHoy.total),
    ingresos_ayer: Number(statsAyer.total),
    ingresos_semana: Number(statsSemana.total),
    ingresos_mes: Number(statsMes.total),
    total_acumulado: Number(statsTotal.total),
    total_completadas: statsTotal.completadas,
    saldo_total_actual: Number(user.saldo_principal) + Number(user.saldo_comisiones),
    pie_chart: pieData.map(item => ({
      name: item.name,
      value: Number(item.value)
    }))
  });
}));

router.get('/earnings', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = req.requestUser;

  // MODO DEMO
  if (userId === DEMO_USER_ID) {
    return res.json({
      summary: { total: user.saldo_principal + user.saldo_comisiones, hoy: 50.40, tareas: 30, comisiones: 20.40 },
      history: [
        { id: '1', tipo_movimiento: 'tarea', monto: 1.80, created_at: peruTime.getISOString(), descripcion: 'Tarea completada demo' },
        { id: '2', tipo_movimiento: 'tarea_red', monto: 0.50, created_at: peruTime.getISOString(), descripcion: 'Comisión red demo' }
      ]
    });
  }

  // 1. Obtener historial
  const movimientos = await query(`
    SELECT * FROM movimientos_saldo 
    WHERE usuario_id = ? 
    ORDER BY fecha DESC 
    LIMIT 50
  `, [userId]);

  // 2. Obtener resumen de HOY (v13.1.0)
  // Sumamos tareas + comisiones del día actual
  const statsHoy = await queryOne(`
    SELECT 
      COALESCE(SUM(CASE WHEN tipo_movimiento IN ('tarea_completada', 'ganancia_tarea') THEN monto ELSE 0 END), 0) as tareas_hoy,
      COALESCE(SUM(CASE WHEN tipo_movimiento IN ('comision_subordinado', 'comision_red', 'comision_inversion', 'comision_tarea') THEN monto ELSE 0 END), 0) as comisiones_hoy
    FROM movimientos_saldo 
    WHERE usuario_id = ? AND DATE(fecha) = CURDATE() AND monto > 0
  `, [userId]);

  // 3. Obtener resumen TOTAL (v13.1.0)
  const statsTotal = await queryOne(`
    SELECT 
      COALESCE(SUM(CASE WHEN tipo_movimiento IN ('tarea_completada', 'ganancia_tarea') THEN monto ELSE 0 END), 0) as tareas_total,
      COALESCE(SUM(CASE WHEN tipo_movimiento IN ('comision_subordinado', 'comision_red', 'comision_inversion', 'comision_tarea') THEN monto ELSE 0 END), 0) as comisiones_total
    FROM movimientos_saldo 
    WHERE usuario_id = ? AND monto > 0
  `, [userId]);
  
  res.json({
    summary: {
      total: Number(user.saldo_principal) + Number(user.saldo_comisiones),
      hoy: Number(statsHoy.tareas_hoy) + Number(statsHoy.comisiones_hoy),
      tareas_hoy: Number(statsHoy.tareas_hoy),
      comisiones_hoy: Number(statsHoy.comisiones_hoy),
      tareas_total: Number(statsTotal.tareas_total),
      comisiones_total: Number(statsTotal.comisiones_total)
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
  const tarjetas = await query(`SELECT * FROM tarjetas_bancarias WHERE usuario_id = ? AND activa = 1`, [req.user.id]);
  res.json(tarjetas);
}));

router.get('/bank-accounts', asyncHandler(async (req, res) => {
  if (req.user.id === DEMO_USER_ID) return res.json([{ id: 'demo-card', banco: 'Banco Demo', numero_cuenta: '12345678', titular: 'Socio Demo' }]);
  const tarjetas = await query(`SELECT id, nombre_banco as banco, nombre_titular as titular, numero_cuenta, tipo_cuenta, ci_nit, principal FROM tarjetas_bancarias WHERE usuario_id = ? AND activa = 1`, [req.user.id]);
  res.json(tarjetas);
}));

const ALLOWED_BANKS = ['Yape', 'Yasta', 'Yo Lo Pago', 'Banco Union', 'Mercantil'];

router.post('/tarjetas', asyncHandler(async (req, res) => {
  if (req.user.id === DEMO_USER_ID) return res.json({ id: 'demo-card', ok: true });
  const { nombre_banco, numero_cuenta, nombre_titular } = req.body;
  
  if (!ALLOWED_BANKS.includes(nombre_banco)) {
    return res.status(400).json({ error: `Solo se permiten los siguientes bancos: ${ALLOWED_BANKS.join(', ')}` });
  }
  
  // Verificar que el número de cuenta no esté registrado
  const existingAccount = await queryOne(`SELECT id FROM tarjetas_bancarias WHERE numero_cuenta = ?`, [numero_cuenta]);
  if (existingAccount) {
    return res.status(400).json({ 
      error: 'Esta cuenta bancaria ya está registrada.',
      code: 'DUPLICATE_BANK_ACCOUNT'
    });
  }
  
  const id = uuidv4();
  await query(`INSERT INTO tarjetas_bancarias (id, usuario_id, nombre_banco, numero_cuenta, nombre_titular, activa) VALUES (?, ?, ?, ?, ?, 1)`,
    [id, req.user.id, nombre_banco, numero_cuenta, nombre_titular]);
  res.json({ 
    id, 
    ok: true, 
    message: 'Cuenta bancaria registrada correctamente. IMPORTANTE: La cuenta bancaria debe coincidir con el número de registro, ya que se verificará el número de registro, número de cuenta y el nombre del usuario que está solicitando el retiro con la cuenta bancaria. Si no coincide, se le negará el retiro.' 
  });
}));

router.post('/bank-account', asyncHandler(async (req, res) => {
  if (req.user.id === DEMO_USER_ID) return res.json({ id: 'demo-card', success: true });
  const { banco, titular, numero_cuenta, tipo_cuenta, ci_nit } = req.body;
  
  if (!banco || !titular || !numero_cuenta) {
    return res.status(400).json({ error: 'Banco, titular y número de cuenta son obligatorios.' });
  }
  
  if (!ALLOWED_BANKS.includes(banco)) {
    return res.status(400).json({ error: `Solo se permiten los siguientes bancos: ${ALLOWED_BANKS.join(', ')}` });
  }

  // Verificar que el número de cuenta no esté registrado
  const existingAccount = await queryOne(`SELECT id FROM tarjetas_bancarias WHERE numero_cuenta = ?`, [numero_cuenta]);
  if (existingAccount) {
    return res.status(400).json({ 
      error: 'Esta cuenta bancaria ya está registrada.',
      code: 'DUPLICATE_BANK_ACCOUNT'
    });
  }

  const id = uuidv4();
  
  // Verificar si es la primera cuenta para marcarla como principal
  const existingCount = await queryOne(`SELECT COUNT(*) as total FROM tarjetas_bancarias WHERE usuario_id = ?`, [req.user.id]);
  const isPrincipal = existingCount.total === 0 ? 1 : 0;

  await query(`
    INSERT INTO tarjetas_bancarias (id, usuario_id, nombre_banco, nombre_titular, numero_cuenta, tipo_cuenta, ci_nit, principal, activa) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, req.user.id, banco, titular, numero_cuenta, tipo_cuenta, ci_nit, isPrincipal]);

  res.json({ 
    success: true, 
    id, 
    message: 'Cuenta bancaria registrada correctamente. IMPORTANTE: La cuenta bancaria debe coincidir con el número de registro, ya que se verificará el número de registro, número de cuenta y el nombre del usuario que está solicitando el retiro con la cuenta bancaria. Si no coincide, se le negará el retiro.' 
  });
}));

const upsertFundPasswordHandler = asyncHandler(async (req, res) => {
  const { password_fondo, confirm_password_fondo, password_nueva, password_actual } = req.body;
  
  // Handle both naming conventions
  const newPassword = password_fondo || password_nueva;
  const confirmPassword = confirm_password_fondo || password_nueva; // Frontend confirms with the same field twice

  // #region debug-point B:change-fund-password-entry
  reportFundPasswordDebug('B', 'users.mjs:/change-fund-password:entry', 'payload recibido en change-fund-password', {
    userId: req.user?.id || null,
    hasPasswordFondo: !!password_fondo,
    hasConfirmPasswordFondo: !!confirm_password_fondo,
    hasPasswordNueva: !!password_nueva,
    hasPasswordActual: !!password_actual,
    newPasswordLength: newPassword?.length || 0,
    confirmPasswordLength: confirmPassword?.length || 0
  });
  // #endregion

  if (!newPassword || newPassword.length < 6) {
    // #region debug-point B:change-fund-password-short-password
    reportFundPasswordDebug('B', 'users.mjs:/change-fund-password:short-password', 'rechazo por contraseña nueva inválida', {
      userId: req.user?.id || null,
      newPasswordLength: newPassword?.length || 0
    });
    // #endregion
    return res.status(400).json({ error: 'La contraseña de fondos debe tener al menos 6 caracteres.' });
  }

  // Get current user's fund password hash
  const currentUser = await queryOne(`SELECT password_fondo_hash FROM usuarios WHERE id = ?`, [req.user.id]);

  // #region debug-point C:change-fund-password-user-state
  reportFundPasswordDebug('C', 'users.mjs:/change-fund-password:user-state', 'estado actual de contraseña de fondos del usuario', {
    userId: req.user?.id || null,
    hasStoredFundPassword: !!currentUser?.password_fondo_hash,
    hasPasswordActual: !!password_actual
  });
  // #endregion
  
  // If user already has a fund password, verify the current one
  if (currentUser?.password_fondo_hash) {
    if (!password_actual) {
      // #region debug-point A:change-fund-password-missing-current
      reportFundPasswordDebug('A', 'users.mjs:/change-fund-password:missing-current', 'rechazo por falta de contraseña actual', {
        userId: req.user?.id || null
      });
      // #endregion
      return res.status(400).json({ error: 'Debes ingresar la contraseña de fondos actual.' });
    }
    const isMatch = await bcrypt.compare(password_actual, currentUser.password_fondo_hash);
    if (!isMatch) {
      // #region debug-point A:change-fund-password-current-mismatch
      reportFundPasswordDebug('A', 'users.mjs:/change-fund-password:current-mismatch', 'rechazo por contraseña actual incorrecta', {
        userId: req.user?.id || null
      });
      // #endregion
      return res.status(400).json({ error: 'La contraseña de fondos actual es incorrecta.' });
    }
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);

  await query(`UPDATE usuarios SET password_fondo_hash = ? WHERE id = ?`, [hash, req.user.id]);

  // #region debug-point D:change-fund-password-success
  reportFundPasswordDebug('D', 'users.mjs:/change-fund-password:success', 'contraseña de fondos actualizada correctamente', {
    userId: req.user?.id || null
  });
  // #endregion

  res.json({ success: true, message: 'Contraseña de fondos configurada correctamente.' });
});

router.post('/change-fund-password', upsertFundPasswordHandler);
router.post('/fund-password', upsertFundPasswordHandler);

router.get('/security-status', asyncHandler(async (req, res) => {
  const user = await queryOne(`SELECT password_fondo_hash FROM usuarios WHERE id = ?`, [req.user.id]);
  const bankAccount = await queryOne(`SELECT id FROM tarjetas_bancarias WHERE usuario_id = ? AND activa = 1 LIMIT 1`, [req.user.id]);

  res.json({
    tiene_password_fondo: !!user?.password_fondo_hash,
    tiene_cuenta_bancaria: !!bankAccount
  });
}));

router.get('/mensajes', asyncHandler(async (req, res) => {
  const mensajes = await getMensajesGlobales().catch(() => [
    { id: 'm1', titulo: 'Bienvenido Socio Demo', contenido: 'Este es un mensaje de prueba para visualización.', fecha: peruTime.getISOString() }
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
  const today = peruTime.todayStr();
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
  const today = peruTime.todayStr();
  
  // Guardar respuestas de forma pasiva
  await query(`INSERT INTO respuestas_cuestionario (id, usuario_id, fecha_dia, respuestas) VALUES (?, ?, ?, ?) 
    ON DUPLICATE KEY UPDATE respuestas = VALUES(respuestas)`, 
    [uuidv4(), req.user.id, today, JSON.stringify(respuestas)]);

  res.json({ ok: true, message: 'Gracias por participar en nuestra encuesta diaria.' });
}));

router.get('/my-referrals', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { nivel = 'A' } = req.query;

  let querySql = '';
  let params = [];

  if (nivel === 'A') {
    // Nivel A: Directos
    querySql = `
      SELECT u.id, u.telefono, u.nombre_usuario, u.created_at, n.nombre AS nivel, n.codigo AS nivel_codigo 
      FROM usuarios u 
      LEFT JOIN niveles n ON n.id = u.nivel_id 
      WHERE u.invitado_por = ? 
      ORDER BY u.created_at DESC
    `;
    params = [userId];
  } else if (nivel === 'B') {
    // Nivel B: Invitados por mis directos
    querySql = `
      SELECT u.id, u.telefono, u.nombre_usuario, u.created_at, n.nombre AS nivel, n.codigo AS nivel_codigo 
      FROM usuarios u 
      LEFT JOIN niveles n ON n.id = u.nivel_id 
      WHERE u.invitado_por IN (SELECT id FROM usuarios WHERE invitado_por = ?) 
      ORDER BY u.created_at DESC
    `;
    params = [userId];
  } else if (nivel === 'C') {
    // Nivel C: Invitados por el Nivel B
    querySql = `
      SELECT u.id, u.telefono, u.nombre_usuario, u.created_at, n.nombre AS nivel, n.codigo AS nivel_codigo 
      FROM usuarios u 
      LEFT JOIN niveles n ON n.id = u.nivel_id 
      WHERE u.invitado_por IN (
        SELECT id FROM usuarios WHERE invitado_por IN (
          SELECT id FROM usuarios WHERE invitado_por = ?
        )
      ) 
      ORDER BY u.created_at DESC
    `;
    params = [userId];
  }

  const referrals = await query(querySql, params);

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
    telefono: ref.telefono, // Show full phone number now!
    nivel: ref.nivel,
    nivel_codigo: ref.nivel_codigo,
    created_at: ref.created_at
  }));

  res.json({
    items: maskedReferrals,
    total: maskedReferrals.length
  });
}));

// ========================
// MI EQUIPO - PARA PATROCINADORES
// ========================

router.get('/my-team', asyncHandler(async (req, res) => {
  const team = await getEquipoPatrocinador(req.user.id);
  const conteo = await getConteoRetirosPatrocinador(req.user.id);
  const policy = await getPasantiaWithdrawalPolicy();
  res.json({
    team,
    limite_pasantia: {
      total_aprobados: conteo,
      maximo: policy.maxApprovals,
      disponibles: Math.max(0, policy.maxApprovals - conteo)
    },
    politica_pasantia: policy
  });
}));

router.get('/my-team/pending-withdrawals', asyncHandler(async (req, res) => {
  const retiros = await getRetirosPendientesPatrocinador(req.user.id);
  res.json(retiros);
}));

router.post('/my-team/withdrawals/:retiroId/approve', asyncHandler(async (req, res) => {
  const result = await aprobarRetiroPorPatrocinador(req.params.retiroId, req.user.id);
  res.json(result);
}));

router.post('/my-team/withdrawals/:retiroId/reject', asyncHandler(async (req, res) => {
  const { motivo } = req.body;
  const result = await rechazarRetiroPorPatrocinador(req.params.retiroId, req.user.id, motivo);
  res.json(result);
}));

// Eliminado según Módulo 10: no hay botón eliminar

// ========================
// CÓDIGOS DE CANJE
// ========================

router.post('/canjear-codigo', asyncHandler(async (req, res) => {
  const { codigo } = req.body;
  const userId = req.user.id;
  const user = req.requestUser;
  
  if (!codigo) {
    return res.status(400).json({ error: 'Código es requerido' });
  }
  
  const normalizedCodigo = codigo.trim().toUpperCase();
  
  // Find the code
  const code = await queryOne(`
    SELECT cc.*, n.orden as min_level_orden
    FROM codigos_canje cc
    LEFT JOIN niveles n ON cc.min_level_id = n.id
    WHERE cc.codigo = ?
  `, [normalizedCodigo]);
  
  if (!code) {
    return res.status(404).json({ error: 'Código inválido' });
  }
  
  // Validate code is active
  if (!code.activo) {
    return res.status(400).json({ error: 'Código no está activo' });
  }
  
  // Validate expiration
  if (code.expires_at && new Date() > new Date(code.expires_at)) {
    return res.status(400).json({ error: 'Código expirado' });
  }
  
  // Validate user level
  if (code.min_level_id) {
    const userLevel = await queryOne(`SELECT orden FROM niveles WHERE id = ?`, [user.nivel_id]);
    if (!userLevel || (userLevel.orden < code.min_level_orden)) {
      const minLevelName = await queryOne(`SELECT nombre FROM niveles WHERE id = ?`, [code.min_level_id]);
      return res.status(400).json({ 
        error: `Nivel insuficiente. Necesitas ser nivel ${minLevelName?.nombre || 'mínimo'}` 
      });
    }
  }
  
  // Validate max uses
  const currentUses = await queryOne(`
    SELECT COUNT(*) as total 
    FROM codigos_canje_usos 
    WHERE codigo_id = ?
  `, [code.id]);
  
  if (currentUses.total >= code.max_usos) {
    return res.status(400).json({ error: 'Código ya no disponible (usos máximos alcanzados)' });
  }
  
  // Validate user hasn't used this code before
  const userUsed = await queryOne(`
    SELECT id 
    FROM codigos_canje_usos 
    WHERE codigo_id = ? AND usuario_id = ?
  `, [code.id, userId]);
  
  if (userUsed) {
    if (code.max_usos === 1) {
      return res.status(400).json({ error: 'Ya canjeaste este código' });
    }
    if (code.un_solo_uso_por_usuario) {
      return res.status(400).json({ error: 'Ya canjeaste este código (solo un uso por cuenta)' });
    }
  }
  
  // All good! Redeem the code!
  const usageId = uuidv4();
  const transactionId = uuidv4();
  
  await transaction(async (conn) => {
    // 1. Record the usage
    await conn.query(`
      INSERT INTO codigos_canje_usos (id, codigo_id, usuario_id, valor) VALUES (?, ?, ?, ?)
    `, [usageId, code.id, userId, code.valor]);
    
    // 2. Add to user's balance (principal)
    await conn.query(`
      UPDATE usuarios 
      SET saldo_principal = saldo_principal + ? 
      WHERE id = ?
    `, [code.valor, userId]);
    
    // 3. Record the transaction
    await conn.query(`
      INSERT INTO movimientos_saldo 
      (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion)
      VALUES (?, ?, 'principal', 'canje_codigo', ?, 
              (SELECT saldo_principal FROM usuarios WHERE id = ?) - ?, 
              (SELECT saldo_principal FROM usuarios WHERE id = ?), 
              ?, ?)
    `, [transactionId, userId, code.valor, userId, code.valor, userId, usageId, `Canje de código: ${code.codigo}`]);
  });
  
  res.json({ 
    ok: true, 
    valor: code.valor, 
    message: `Has canjeado exitosamente ${code.valor} Bs!` 
  });
}));

// Get user's redemption history
router.get('/historial-codigos', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const list = await query(`
    SELECT cu.*, cc.codigo
    FROM codigos_canje_usos cu
    JOIN codigos_canje cc ON cu.codigo_id = cc.id
    WHERE cu.usuario_id = ?
    ORDER BY cu.usado_at DESC
  `, [userId]);
  
  res.json(list);
}));

export default router;
