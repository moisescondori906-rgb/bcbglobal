import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import redis from '../services/redisService.js';
import { 
  getUsers, getLevels, findUserById, updateUser, 
  getPublicContent, approveLevelPurchase, rejectRetiro,
  boliviaTime, distributeInvestmentCommissions, refreshPublicContent, 
  invalidateLevelsCache, preloadLevels, syncLevels,
  getMensajesGlobales, createMensajeGlobal, deleteMensajeGlobal
} from '../lib/queries.js';
import { query, queryOne } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { uploadToCloudinary, uploadVideoBuffer, uploadImageBuffer } from '../config/cloudinary.js';
import logger from '../lib/logger.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

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

router.get('/dashboard', asyncHandler(async (req, res) => {
  const stats = await query(`
    SELECT 
      (SELECT COUNT(*) FROM usuarios WHERE rol = 'usuario') as total_usuarios,
      (SELECT COALESCE(SUM(monto), 0) FROM compras_nivel WHERE estado = 'completada') as total_ventas_nivel,
      (SELECT COALESCE(SUM(monto), 0) FROM retiros WHERE estado = 'pagado') as total_retiros,
      (SELECT COUNT(*) FROM retiros WHERE estado = 'pendiente') as pendientes_retiro,
      (SELECT COUNT(*) FROM compras_nivel WHERE estado = 'pendiente') as pendientes_compra_nivel
  `);
  res.json(stats[0]);
}));

router.get('/compras-nivel', asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT c.*, u.nombre_usuario, u.telefono, n.nombre as nivel_nombre 
    FROM compras_nivel c
    JOIN usuarios u ON c.usuario_id = u.id
    JOIN niveles n ON c.nivel_id = n.id
    ORDER BY c.created_at DESC
  `);
  res.json(rows);
}));

router.get('/usuarios', asyncHandler(async (req, res) => {
  const users = await query(`SELECT * FROM usuarios`);
  const levels = await getLevels();
  const filtered = users.map(u => {
    const sanitized = sanitizeUser(u, levels);
    return {
      ...sanitized,
      saldo_principal: Number(u.saldo_principal || 0),
      saldo_comisiones: Number(u.saldo_comisiones || 0),
      tipo_lider: u.tipo_lider
    };
  });
  res.json(filtered);
}));

router.get('/admins', asyncHandler(async (req, res) => {
  const admins = await query(`SELECT id, nombre_usuario, telefono, rol, created_at FROM usuarios WHERE rol = 'admin'`);
  res.json(admins);
}));

router.get('/recargas', asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT c.*, u.nombre_usuario, u.telefono, n.nombre as nivel_nombre 
    FROM compras_nivel c
    JOIN usuarios u ON c.usuario_id = u.id
    JOIN niveles n ON c.nivel_id = n.id
    ORDER BY c.created_at DESC
  `);
  res.json(rows);
}));

router.get('/retiros', asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT r.*, u.nombre_usuario, u.telefono 
    FROM retiros r
    JOIN usuarios u ON r.usuario_id = u.id
    ORDER BY r.created_at DESC
  `);
  res.json(rows);
}));

router.post('/compras-nivel/:id/aprobar', asyncHandler(async (req, res) => {
  const result = await approveLevelPurchase(req.params.id, req.user.id);
  const compra = await queryOne(`SELECT * FROM compras_nivel WHERE id = ?`, [req.params.id]);
  if (compra) {
    await distributeInvestmentCommissions(compra.usuario_id, compra.monto);
    // Invalidar caché de ranking ya que un ascenso afecta el conteo de invitados reales
    await redis.del('admin:ranking:invitados');
  }
  res.json({ ok: true, trace_id: result.traceId });
}));

router.post('/compras-nivel/:id/rechazar', asyncHandler(async (req, res) => {
  const { motivo } = req.body;
  await query(
    `UPDATE compras_nivel SET estado = 'rechazada', admin_notas = ?, procesado_por = ?, procesado_at = NOW() WHERE id = ?`,
    [motivo, req.user.id, req.params.id]
  );
  res.json({ ok: true });
}));

router.post('/retiros/:id/rechazar', asyncHandler(async (req, res) => {
  await rejectRetiro(req.params.id, req.user.id, req.body.motivo);
  res.json({ ok: true });
}));

router.put('/config', asyncHandler(async (req, res) => {
  const updates = req.body;
  for (const [clave, valor] of Object.entries(updates)) {
    await query(`INSERT INTO configuraciones (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?`, 
      [clave, JSON.stringify(valor), JSON.stringify(valor)]);
  }
  await refreshPublicContent();
  res.json({ ok: true });
}));

router.get('/mensajes', asyncHandler(async (req, res) => {
  const mensajes = await getMensajesGlobales();
  res.json(mensajes);
}));

router.post('/mensajes', asyncHandler(async (req, res) => {
  const { titulo, contenido, imagen_url } = req.body;
  if (!titulo || !contenido) return res.status(400).json({ error: 'Título y contenido requeridos' });
  const nuevo = await createMensajeGlobal({ titulo, contenido, imagen_url });
  res.json(nuevo);
}));

router.delete('/mensajes/:id', asyncHandler(async (req, res) => {
  await deleteMensajeGlobal(req.params.id);
  res.json({ ok: true });
}));

router.post('/levels/sync', asyncHandler(async (req, res) => {
  await syncLevels();
  res.json({ ok: true, message: 'Niveles sincronizados con la tabla oficial' });
}));

// ========================
// GESTIÓN DE MÉTODOS QR
// ========================

router.get('/metodos-qr', asyncHandler(async (req, res) => {
  const list = await query(`SELECT * FROM metodos_qr ORDER BY orden ASC`);
  res.json(list);
}));

router.get('/metodos-qr-all', asyncHandler(async (req, res) => {
  const list = await query(`SELECT * FROM metodos_qr ORDER BY created_at DESC`);
  res.json(list);
}));

router.post('/metodos-qr', asyncHandler(async (req, res) => {
  const { nombre_titular, imagen_qr_url, imagen_base64, admin_id, activo, orden } = req.body;
  let final_url = imagen_qr_url;

  if (imagen_base64) {
    const base64Data = imagen_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const result = await uploadImageBuffer(buffer, {
      folder: 'bcb_global/metodos_qr'
    });
    final_url = result.secure_url;
  }

  const id = uuidv4();
  await query(`INSERT INTO metodos_qr (id, nombre_titular, imagen_qr_url, admin_id, activo, orden) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, nombre_titular, final_url, admin_id, activo !== false ? 1 : 0, orden || 0]);
  res.json({ id, ok: true, imagen_qr_url: final_url });
}));

router.put('/metodos-qr/:id', asyncHandler(async (req, res) => {
  const { nombre_titular, imagen_qr_url, imagen_base64, admin_id, activo, orden, seleccionada } = req.body;
  let final_url = imagen_qr_url;

  if (imagen_base64) {
    const base64Data = imagen_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const result = await uploadImageBuffer(buffer, {
      folder: 'bcb_global/metodos_qr'
    });
    final_url = result.secure_url;
  }

  await query(`UPDATE metodos_qr SET nombre_titular = ?, imagen_qr_url = ?, admin_id = ?, activo = ?, orden = ?, seleccionada = ? WHERE id = ?`,
    [nombre_titular, final_url, admin_id, activo !== false ? 1 : 0, orden || 0, seleccionada ? 1 : 0, req.params.id]);
  res.json({ ok: true, imagen_qr_url: final_url });
}));

router.delete('/metodos-qr/:id', asyncHandler(async (req, res) => {
  await query(`DELETE FROM metodos_qr WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
}));

// ========================
// GESTIÓN DE PREMIOS RULETA
// ========================

router.get('/premios-ruleta', asyncHandler(async (req, res) => {
  const list = await query(`SELECT * FROM premios_ruleta ORDER BY orden ASC`);
  res.json(list);
}));

router.post('/premios-ruleta', asyncHandler(async (req, res) => {
  const { nombre, tipo, valor, probabilidad, activo, orden } = req.body;
  const id = uuidv4();
  await query(`INSERT INTO premios_ruleta (id, nombre, tipo, valor, probabilidad, activo, orden) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, nombre, tipo, valor, probabilidad, activo ? 1 : 0, orden || 0]);
  res.json({ id, ok: true });
}));

router.put('/premios-ruleta/:id', asyncHandler(async (req, res) => {
  const { nombre, tipo, valor, probabilidad, activo, orden } = req.body;
  await query(`UPDATE premios_ruleta SET nombre = ?, tipo = ?, valor = ?, probabilidad = ?, activo = ?, orden = ? WHERE id = ?`,
    [nombre, tipo, valor, probabilidad, activo ? 1 : 0, orden || 0, req.params.id]);
  res.json({ ok: true });
}));

router.delete('/premios-ruleta/:id', asyncHandler(async (req, res) => {
  await query(`DELETE FROM premios_ruleta WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
}));

// ========================
// GESTIÓN DE BANNERS
// ========================

router.get('/banners', asyncHandler(async (req, res) => {
  const list = await query(`SELECT * FROM banners_carrusel ORDER BY orden ASC`);
  res.json(list);
}));

router.post('/banners', asyncHandler(async (req, res) => {
  const { imagen_url, imagen_base64, titulo, link_url, activo, orden } = req.body;
  let final_url = imagen_url;

  if (imagen_base64) {
    const base64Data = imagen_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const result = await uploadImageBuffer(buffer, {
      folder: 'bcb_global/banners'
    });
    final_url = result.secure_url;
  }

  const id = uuidv4();
  await query(`INSERT INTO banners_carrusel (id, imagen_url, titulo, link_url, activo, orden) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, final_url, titulo, link_url, activo !== false ? 1 : 0, orden || 0]);
  res.json({ id, ok: true, imagen_url: final_url });
}));

router.delete('/banners/:id', asyncHandler(async (req, res) => {
  await query(`DELETE FROM banners_carrusel WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
}));

router.post('/regalar-tickets', asyncHandler(async (req, res) => {
  const { target_type, target_value, tickets } = req.body;
  if (!tickets || isNaN(tickets)) return res.status(400).json({ error: 'Número de tickets inválido' });

  let sql = 'UPDATE usuarios SET tickets_ruleta = tickets_ruleta + ?';
  let params = [tickets];

  if (target_type === 'nivel') {
    sql += ' WHERE nivel_id = ?';
    params.push(target_value);
  } else if (target_type === 'usuario') {
    sql += ' WHERE id = ?';
    params.push(target_value);
  } else if (target_type === 'todos') {
    sql += ' WHERE rol = \'usuario\'';
  } else {
    return res.status(400).json({ error: 'Tipo de objetivo inválido' });
  }

  await query(sql, params);
  res.json({ ok: true });
}));

router.post('/usuarios/:id/ajuste', asyncHandler(async (req, res) => {
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
}));

// ========================
// GESTIÓN DE NIVELES
// ========================

router.get('/niveles', asyncHandler(async (req, res) => {
  const levels = await getLevels();
  res.json(levels);
}));

router.post('/niveles/:id', asyncHandler(async (req, res) => {
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
}));

// ========================
// GESTIÓN DE TAREAS (CONTENIDO GLOBAL)
// ========================

router.get('/tareas', asyncHandler(async (req, res) => {
  const tareas = await query(`SELECT * FROM tareas ORDER BY created_at DESC`);
  res.json(tareas.map(t => ({
    ...t,
    opciones: typeof t.opciones === 'string' ? JSON.parse(t.opciones) : t.opciones
  })));
}));

router.post('/tareas', asyncHandler(async (req, res) => {
  const { nombre, video_url, pregunta, opciones, respuesta_correcta } = req.body;
  const id = uuidv4();
  
  await query(`
    INSERT INTO tareas (id, nombre, video_url, pregunta, opciones, respuesta_correcta, activa, orden) 
    VALUES (?, ?, ?, ?, ?, ?, 1, 0)
  `, [id, nombre, video_url, pregunta, JSON.stringify(opciones), respuesta_correcta]);

  res.json({ id, nombre, video_url, pregunta, opciones, respuesta_correcta });
}));

router.put('/tareas/:id', asyncHandler(async (req, res) => {
  const { nombre, video_url, pregunta, opciones, respuesta_correcta } = req.body;
  await query(`
    UPDATE tareas SET 
      nombre = ?, video_url = ?, pregunta = ?, opciones = ?, respuesta_correcta = ?
    WHERE id = ?
  `, [nombre, video_url, pregunta, JSON.stringify(opciones), respuesta_correcta, req.params.id]);

  res.json({ ok: true });
}));

router.delete('/tareas/:id', asyncHandler(async (req, res) => {
  await query(`DELETE FROM tareas WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
}));

// ========================
// SUBIDA DE VIDEOS A CLOUDINARY
// ========================

router.post('/tareas/video', uploadToCloudinary.single('video'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo de video.' });
  }
  res.json({
    ok: true,
    video_url: req.file.secure_url || req.file.path,
    public_id: req.file.public_id,
    original_name: req.file.originalname,
    size_bytes: req.file.size
  });
}));

router.post('/tareas/video/base64', asyncHandler(async (req, res) => {
  const { video_base64, nombre } = req.body;
  if (!video_base64) {
    return res.status(400).json({ error: 'Se requiere el video en base64.' });
  }

  const base64Data = video_base64.replace(/^data:video\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const result = await uploadVideoBuffer(buffer, {
    public_id: nombre ? `tarea_${nombre.replace(/\s+/g, '_')}_${Date.now()}` : undefined
  });

  res.json({
    ok: true,
    video_url: result.secure_url,
    public_id: result.public_id
  });
}));

// ========================
// CALENDARIO OPERATIVO
// ========================

router.get('/calendario', asyncHandler(async (req, res) => {
  const list = await query(`SELECT * FROM calendario_operativo ORDER BY fecha ASC`);
  res.json(list);
}));

router.post('/calendario', asyncHandler(async (req, res) => {
  const { 
    fecha, 
    tipo_dia, 
    es_feriado, 
    tareas_habilitadas, 
    retiros_habilitados, 
    recargas_habilitadas, 
    motivo, 
    reglas_niveles 
  } = req.body;

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
  `, [
    fecha, 
    tipo_dia || 'laboral', 
    es_feriado ? 1 : 0, 
    tareas_habilitadas ? 1 : 0, 
    retiros_habilitados ? 1 : 0, 
    recargas_habilitadas ? 1 : 0, 
    motivo || '', 
    JSON.stringify(reglas_niveles || {})
  ]);

  res.json({ ok: true });
}));

router.delete('/calendario/:fecha', asyncHandler(async (req, res) => {
  await query(`DELETE FROM calendario_operativo WHERE fecha = ?`, [req.params.fecha]);
  res.json({ ok: true });
}));

// ========================
// CUESTIONARIO Y ENCUESTAS (PASIVO)
// ========================

router.get('/cuestionario/respuestas', asyncHandler(async (req, res) => {
  const list = await query(`
    SELECT r.*, u.nombre_usuario, u.telefono 
    FROM respuestas_cuestionario r
    JOIN usuarios u ON r.usuario_id = u.id
    ORDER BY r.created_at DESC 
    LIMIT 100
  `);
  res.json(list);
}));

router.get('/public-content', asyncHandler(async (req, res) => {
  const content = await getPublicContent();
  res.json(content);
}));

router.put('/public-content', asyncHandler(async (req, res) => {
  await refreshPublicContent(req.body);
  res.json({ ok: true });
}));

router.get('/ranking-invitados', asyncHandler(async (req, res) => {
  const cacheKey = 'admin:ranking:invitados';
  // 1. Intentar obtener de Redis (Caché de 5 minutos para reportes pesados)
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const levels = await getLevels();
  const internarLevel = levels.find(l => l.codigo === 'internar');
  const internarId = internarLevel?.id || '';

  // Query para obtener el ranking base
  const ranking = await query(`
    SELECT 
      u.id, 
      u.nombre_usuario, 
      u.telefono, 
      u.codigo_invitacion,
      u.tipo_lider,
      n.nombre as nivel,
      (
        SELECT COUNT(*) FROM usuarios u1 
        WHERE u1.invitado_por = u.id 
        AND u1.nivel_id != ?
      ) as count_a,
      (
        SELECT COUNT(*) FROM usuarios u1
        JOIN usuarios u2 ON u2.invitado_por = u1.id
        WHERE u1.invitado_por = u.id
        AND u2.nivel_id != ?
      ) as count_b,
      (
        SELECT COUNT(*) FROM usuarios u1
        JOIN usuarios u2 ON u2.invitado_por = u1.id
        JOIN usuarios u3 ON u3.invitado_por = u2.id
        WHERE u1.invitado_por = u.id
        AND u3.nivel_id != ?
      ) as count_c
    FROM usuarios u
    LEFT JOIN niveles n ON u.nivel_id = n.id
    WHERE u.rol = 'usuario'
    ORDER BY (count_a + count_b + count_c) DESC
    LIMIT 100
  `, [internarId, internarId, internarId]);

  // Formatear para el frontend
  const formatted = ranking.map(u => ({
    ...u,
    invitados_count: u.count_a + u.count_b + u.count_c,
    network_stats: {
      A: u.count_a,
      B: u.count_b,
      C: u.count_c
    },
    level_stats: {} 
  }));

  // 2. Guardar en Redis por 300 segundos (5 min)
  await redis.setex(cacheKey, 300, JSON.stringify(formatted));

  res.json(formatted);
}));

router.post('/usuarios/:id/lider', asyncHandler(async (req, res) => {
  const { tipo_lider } = req.body;
  await query(`UPDATE usuarios SET tipo_lider = ? WHERE id = ?`, [tipo_lider, req.params.id]);
  res.json({ ok: true });
}));

router.post('/usuarios/:id/nivel', asyncHandler(async (req, res) => {
  const { nivel_id } = req.body;
  await query(`UPDATE usuarios SET nivel_id = ? WHERE id = ?`, [nivel_id, req.params.id]);
  await redis.del('admin:ranking:invitados');
  res.json({ ok: true });
}));

router.post('/usuarios/:id/bloquear', asyncHandler(async (req, res) => {
  const { bloqueado } = req.body;
  await query(`UPDATE usuarios SET bloqueado = ? WHERE id = ?`, [bloqueado ? 1 : 0, req.params.id]);
  res.json({ ok: true });
}));

router.post('/usuarios/:id/password', asyncHandler(async (req, res) => {
  const { password, type } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const field = type === 'operaciones' ? 'password_operaciones' : 'password';
  await query(`UPDATE usuarios SET ${field} = ? WHERE id = ?`, [hashed, req.params.id]);
  res.json({ ok: true });
}));

router.post('/cuestionario/castigar', (req, res) => {
  // Endpoint obsoleto, ahora las encuestas son pasivas
  res.json({ ok: true, message: 'La función de castigo ha sido desactivada. Las encuestas son ahora opcionales.', punished: 0 });
});

router.post('/cuestionario/castigar', (req, res) => {
  // Endpoint obsoleto, ahora las encuestas son pasivas
  res.json({ ok: true, message: 'La función de castigo ha sido desactivada. Las encuestas son ahora opcionales.', punished: 0 });
});

export default router;
