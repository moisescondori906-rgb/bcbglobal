import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import redis from '../../services/redisService.mjs';
import { 
  getUsers, getLevels, findUserById, updateUser, 
  getPublicContent, approveLevelPurchase, rejectRetiro, approveRetiro,
  boliviaTime, distributeInvestmentCommissions, refreshPublicContent, 
  invalidateLevelsCache, preloadLevels, syncLevels,
  getMensajesGlobales, createMensajeGlobal, deleteMensajeGlobal
} from '../../services/dbService.mjs';
import { query, queryOne } from '../../config/db.mjs';
import { authenticate, requireAdmin } from '../../utils/middleware/auth.mjs';
import { uploadVideoBuffer, uploadImageBuffer, uploadLocalVideo } from '../../utils/fileStorage.mjs';
import logger from '../../utils/logger.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

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

router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await query(`
    SELECT 
      (SELECT COUNT(*) FROM usuarios WHERE rol = 'usuario') as usuarios,
      (SELECT COALESCE(SUM(monto), 0) FROM compras_nivel WHERE estado = 'completada' AND DATE(created_at) = CURDATE()) as recargas_hoy,
      (SELECT COALESCE(SUM(monto), 0) FROM retiros WHERE estado = 'pagado' AND DATE(created_at) = CURDATE()) as retiros_hoy,
      (SELECT COALESCE(SUM(saldo_principal + saldo_comisiones), 0) FROM usuarios WHERE rol = 'usuario') as balance_total
  `);
  
  const activity = await query(`
    SELECT 
      (SELECT COUNT(*) FROM usuarios WHERE updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as usuarios_activos,
      (SELECT COUNT(*) FROM actividad_tareas WHERE fecha_dia = CURDATE()) as tareas_completadas
  `);

  res.json({
    ...stats[0],
    usuarios_activos: activity[0].usuarios_activos,
    tareas_completadas: activity[0].tareas_completadas,
    actividad_24h: 8.5
  });
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
      saldo_comisiones: Number(u.saldo_comisiones || 0)
    };
  });
  res.json(filtered);
}));

router.get('/admins', asyncHandler(async (req, res) => {
  const admins = await query(`
    SELECT id, nombre_usuario, telefono, rol, created_at, 
           bloqueado, telegram_user_id
    FROM usuarios 
    WHERE rol IN ('admin', 'global_admin')
  `);
  res.json(admins);
}));

router.post('/admins', asyncHandler(async (req, res) => {
  const { id, nombre_usuario, telefono, hora_inicio_turno, hora_fin_turno, dias_semana, activo, recibe_notificaciones, telegram_user_id } = req.body;
  
  if (id) {
    // Convertir usuario existente a admin
    await query(`
      UPDATE usuarios SET 
        rol = 'admin', 
        hora_inicio_turno = ?, 
        hora_fin_turno = ?, 
        dias_semana = ?, 
        activo = ?, 
        recibe_notificaciones = ?,
        telegram_user_id = ?
      WHERE id = ?
    `, [hora_inicio_turno, hora_fin_turno, dias_semana, activo ? 1 : 0, recibe_notificaciones ? 1 : 0, telegram_user_id, id]);
  }
  res.json({ ok: true });
}));

router.put('/admins/:id', asyncHandler(async (req, res) => {
  const { hora_inicio_turno, hora_fin_turno, dias_semana, activo, recibe_notificaciones, telegram_user_id } = req.body;
  await query(`
    UPDATE usuarios SET 
      hora_inicio_turno = ?, 
      hora_fin_turno = ?, 
      dias_semana = ?, 
      activo = ?, 
      recibe_notificaciones = ?,
      telegram_user_id = ?
    WHERE id = ?
  `, [hora_inicio_turno, hora_fin_turno, dias_semana, activo ? 1 : 0, recibe_notificaciones ? 1 : 0, telegram_user_id, req.params.id]);
  res.json({ ok: true });
}));

router.delete('/admins/:id', asyncHandler(async (req, res) => {
  // Solo quitar el rol de admin, no borrar el usuario
  await query(`UPDATE usuarios SET rol = 'usuario' WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
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
  const compra = await queryOne(`SELECT * FROM compras_nivel WHERE id = ?`, [req.params.id]);
  if (!compra) return res.status(404).json({ error: 'Orden de compra no encontrada' });

  // VALIDACIÓN DE JERARQUÍA ANTES DE APROBAR (Doble Check)
  const levels = await getLevels();
  const targetLevel = levels.find(l => l.id === compra.nivel_id);
  const user = await findUserById(compra.usuario_id);
  const currentLevel = levels.find(l => l.id === user.nivel_id);

  if (currentLevel && targetLevel && targetLevel.orden < currentLevel.orden) {
    return res.status(400).json({ error: 'No se puede aprobar un nivel inferior al actual.' });
  }

  const result = await approveLevelPurchase(req.params.id, req.user.id);
  if (compra) {
    await distributeInvestmentCommissions(compra.usuario_id, compra.monto);
    // Invalidar caché de ranking ya que un ascenso afecta el conteo de invitados reales
    await redis.del('admin:ranking:invitados');
  }
  res.json({ ok: true, trace_id: result.traceId });
}));

// Alias para compatibilidad con el frontend
router.post('/recargas/:id/aprobar', asyncHandler(async (req, res) => {
  const compra = await queryOne(`SELECT * FROM compras_nivel WHERE id = ?`, [req.params.id]);
  if (!compra) return res.status(404).json({ error: 'Orden de compra no encontrada' });

  // VALIDACIÓN DE JERARQUÍA ANTES DE APROBAR (Doble Check)
  const levels = await getLevels();
  const targetLevel = levels.find(l => l.id === compra.nivel_id);
  const user = await findUserById(compra.usuario_id);
  const currentLevel = levels.find(l => l.id === user.nivel_id);

  if (currentLevel && targetLevel && targetLevel.orden < currentLevel.orden) {
    return res.status(400).json({ error: 'No se puede aprobar un nivel inferior al actual.' });
  }

  const result = await approveLevelPurchase(req.params.id, req.user.id);
  if (compra) {
    await distributeInvestmentCommissions(compra.usuario_id, compra.monto);
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

// Alias para compatibilidad con el frontend
router.post('/recargas/:id/rechazar', asyncHandler(async (req, res) => {
  const { motivo } = req.body;
  await query(
    `UPDATE compras_nivel SET estado = 'rechazada', admin_notas = ?, procesado_por = ?, procesado_at = NOW() WHERE id = ?`,
    [motivo, req.user.id, req.params.id]
  );
  res.json({ ok: true });
}));

router.post('/retiros/:id/aprobar', asyncHandler(async (req, res) => {
  const result = await approveRetiro(req.params.id, req.user.id);
  res.json({ ok: true, trace_id: result.traceId });
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
  const { nombre_titular, imagen_qr_url, imagen_base64, admin_id, activo, orden, dias_semana, hora_inicio, hora_fin } = req.body;
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
  await query(`INSERT INTO metodos_qr (id, nombre_titular, imagen_qr_url, admin_id, activo, orden, dias_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, nombre_titular, final_url, admin_id || null, activo !== false ? 1 : 0, orden || 0, dias_semana || '0,1,2,3,4,5,6', hora_inicio || '00:00:00', hora_fin || '23:59:59']);
  res.json({ id, ok: true, imagen_qr_url: final_url });
}));

router.put('/metodos-qr/:id', asyncHandler(async (req, res) => {
  const { nombre_titular, imagen_qr_url, imagen_base64, admin_id, activo, orden, seleccionada, dias_semana, hora_inicio, hora_fin } = req.body;
  let final_url = imagen_qr_url;

  if (imagen_base64) {
    const base64Data = imagen_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const result = await uploadImageBuffer(buffer, {
      folder: 'bcb_global/metodos_qr'
    });
    final_url = result.secure_url;
  }

  await query(`UPDATE metodos_qr SET nombre_titular = ?, imagen_qr_url = ?, admin_id = ?, activo = ?, orden = ?, seleccionada = ?, dias_semana = ?, hora_inicio = ?, hora_fin = ? WHERE id = ?`,
    [nombre_titular, final_url, admin_id || null, activo !== false ? 1 : 0, orden || 0, seleccionada ? 1 : 0, dias_semana, hora_inicio, hora_fin, req.params.id]);
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
// SUBIDA DE VIDEOS LOCAL
// ========================

router.post('/tareas/video', uploadLocalVideo.single('video'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo de video.' });
  }

  // La URL será relativa al servidor, e.g., /uploads/tareas/uuid.mp4
  const videoUrl = `/uploads/tareas/${req.file.filename}`;

  res.json({
    ok: true,
    video_url: videoUrl,
    public_id: req.file.filename,
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
  const { fecha, tareas_habilitadas, retiros_habilitados, recargas_habilitadas, motivo, reglas_niveles } = req.body;
  
  await query(`
    INSERT INTO calendario_operativo 
    (fecha, tareas_habilitadas, retiros_habilitados, recargas_habilitadas, motivo, reglas_niveles) 
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
    tareas_habilitadas = VALUES(tareas_habilitadas),
    retiros_habilitados = VALUES(retiros_habilitados),
    recargas_habilitadas = VALUES(recargas_habilitadas),
    motivo = VALUES(motivo),
    reglas_niveles = VALUES(reglas_niveles)
  `, [
    fecha, 
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

router.get('/cuestionarios', asyncHandler(async (req, res) => {
  const list = await query(`SELECT * FROM cuestionarios ORDER BY created_at DESC`);
  res.json(list);
}));

router.post('/cuestionarios', asyncHandler(async (req, res) => {
  const { titulo, descripcion, preguntas, activo } = req.body;
  const id = uuidv4();
  await query(`INSERT INTO cuestionarios (id, titulo, descripcion, preguntas, activo) VALUES (?, ?, ?, ?, ?)`,
    [id, titulo, descripcion, JSON.stringify(preguntas), activo ? 1 : 0]);
  res.json({ id, ok: true });
}));

router.delete('/cuestionarios/:id', asyncHandler(async (req, res) => {
  await query(`DELETE FROM cuestionarios WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
}));

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
  const { soporte_canal_url, soporte_gerente_url, soporte_bot_url, marquee_text, comision_retiro, ruleta_activa, recompensas_visibles } = req.body;
  
  const content = await getPublicContent();
  const newContent = { 
    ...content,
    soporte_canal_url: soporte_canal_url !== undefined ? soporte_canal_url : content.soporte_canal_url,
    soporte_gerente_url: soporte_gerente_url !== undefined ? soporte_gerente_url : content.soporte_gerente_url,
    soporte_bot_url: soporte_bot_url !== undefined ? soporte_bot_url : content.soporte_bot_url,
    marquee_text: marquee_text !== undefined ? marquee_text : content.marquee_text,
    comision_retiro: comision_retiro !== undefined ? Number(comision_retiro) : content.comision_retiro,
    ruleta_activa: ruleta_activa !== undefined ? !!ruleta_activa : content.ruleta_activa,
    recompensas_visibles: recompensas_visibles !== undefined ? !!recompensas_visibles : content.recompensas_visibles
  };

  await refreshPublicContent(newContent);
  res.json({ ok: true, content: newContent });
}));

router.post('/usuarios/:id/toggle-block', asyncHandler(async (req, res) => {
  const user = await findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  
  const newStatus = user.bloqueado ? 0 : 1;
  await updateUser(req.params.id, { bloqueado: newStatus });
  res.json({ ok: true, bloqueado: !!newStatus });
}));

router.post('/usuarios/:id/reset-password', asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password requerido' });
  
  const hashedPassword = await bcrypt.hash(password, 10);
  await updateUser(req.params.id, { password_hash: hashedPassword });
  res.json({ ok: true });
}));

router.get('/ranking-invitados', asyncHandler(async (req, res) => {
  const cacheKey = 'admin:ranking:invitados';
  // 1. Intentar obtener de Redis (Caché de 5 minutos para reportes pesados)
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const levels = await getLevels().catch(() => []);
  const internarLevel = levels.find(l => l.codigo === 'internar');
  const internarId = internarLevel?.id || 'NO_LEVEL';

  // Query para obtener el ranking base
  const ranking = await query(`
    SELECT 
      u.id, 
      u.nombre_usuario, 
      u.nombre_real,
      u.telefono, 
      u.codigo_invitacion,
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
  `, [internarId, internarId, internarId]).catch(err => {
    logger.error(`[RANKING-ERROR]: ${err.message}`);
    return [];
  });

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

router.post('/usuarios/:id/reset-device', asyncHandler(async (req, res) => {
  await query(`UPDATE usuarios SET last_device_id = NULL WHERE id = ?`, [req.params.id]);
  logger.info(`[ADMIN-ACTION] Dispositivo reseteado para usuario ${req.params.id} por admin ${req.user.id}`);
  res.json({ ok: true, message: 'Sesión de dispositivo cerrada. El usuario podrá loguearse normalmente.' });
}));

router.post('/usuarios/:id/password', asyncHandler(async (req, res) => {
  const { password, type } = req.body;
  if (!password) return res.status(400).json({ error: 'Contraseña requerida' });
  
  const hashed = await bcrypt.hash(password, 10);
  const field = type === 'fondos' ? 'password_fondo_hash' : 'password_hash';
  
  await query(`UPDATE usuarios SET ${field} = ? WHERE id = ?`, [hashed, req.params.id]);
  
  logger.info(`[ADMIN-ACTION] Password ${type} actualizado para usuario ${req.params.id} por admin ${req.user.id}`);
  res.json({ ok: true, message: `Contraseña de ${type} actualizada con éxito` });
}));

router.get('/usuarios/:id/financial', asyncHandler(async (req, res) => {
  const user = await queryOne(`
    SELECT id, nombre_usuario, saldo_principal, saldo_comisiones, nivel_id, bloqueado, created_at
    FROM usuarios WHERE id = ?
  `, [req.params.id]);
  
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const stats = await queryOne(`
    SELECT 
      (SELECT SUM(monto) FROM compras_nivel WHERE usuario_id = ? AND estado = 'completada') as total_recargado,
      (SELECT SUM(monto) FROM retiros WHERE usuario_id = ? AND estado = 'pagado') as total_retirado,
      (SELECT SUM(monto_ganado) FROM actividad_tareas WHERE usuario_id = ?) as total_tareas,
      (SELECT COUNT(*) FROM usuarios WHERE invitado_por = ?) as referidos_directos
  `, [user.id, user.id, user.id, user.id]);

  res.json({
    ...user,
    financial_stats: {
      total_recargado: Number(stats.total_recargado || 0),
      total_retirado: Number(stats.total_retirado || 0),
      total_tareas: Number(stats.total_tareas || 0),
      referidos_directos: Number(stats.referidos_directos || 0)
    }
  });
}));

router.post('/cuestionario/castigar', (req, res) => {
  // Endpoint obsoleto, ahora las encuestas son pasivas
  res.json({ ok: true, message: 'La función de castigo ha sido desactivada. Las encuestas son ahora opcionales.', punished: 0 });
});

// ========================
// GESTIÓN DE TELEGRAM (v8.3.0)
// ========================

router.get('/telegram/equipos', asyncHandler(async (req, res) => {
  const list = await query('SELECT * FROM telegram_equipos ORDER BY created_at DESC');
  res.json(list);
}));

router.post('/telegram/equipos', asyncHandler(async (req, res) => {
  const { nombre_equipo, tipo_equipo, telegram_chat_id, activo } = req.body;
  const result = await query(
    'INSERT INTO telegram_equipos (nombre_equipo, tipo_equipo, telegram_chat_id, activo) VALUES (?, ?, ?, ?)',
    [nombre_equipo, tipo_equipo, telegram_chat_id, activo ? 1 : 0]
  );
  res.json({ id: result.insertId, ok: true });
}));

router.put('/telegram/equipos/:id', asyncHandler(async (req, res) => {
  const { nombre_equipo, tipo_equipo, telegram_chat_id, activo } = req.body;
  await query(
    'UPDATE telegram_equipos SET nombre_equipo = ?, tipo_equipo = ?, telegram_chat_id = ?, activo = ? WHERE id = ?',
    [nombre_equipo, tipo_equipo, telegram_chat_id, activo ? 1 : 0, req.params.id]
  );
  res.json({ ok: true });
}));

router.delete('/telegram/equipos/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM telegram_equipos WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

router.get('/telegram/integrantes', asyncHandler(async (req, res) => {
  const list = await query(`
    SELECT * FROM usuarios_telegram 
    ORDER BY created_at DESC
  `);
  res.json(list);
}));

router.post('/telegram/integrantes', asyncHandler(async (req, res) => {
  const { telegram_id, nombre, telegram_username, activo } = req.body;
  await query(
    'INSERT INTO usuarios_telegram (telegram_id, nombre, telegram_username, activo) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nombre = ?, telegram_username = ?, activo = ?',
    [telegram_id, nombre, telegram_username, activo ? 1 : 0, nombre, telegram_username, activo ? 1 : 0]
  );
  res.json({ ok: true });
}));

router.put('/telegram/integrantes/:id', asyncHandler(async (req, res) => {
  const { equipo_id, telegram_user_id, nombre_visible, activo } = req.body;
  await query(
    'UPDATE telegram_integrantes SET equipo_id = ?, telegram_user_id = ?, nombre_visible = ?, activo = ? WHERE id = ?',
    [equipo_id, telegram_user_id, nombre_visible, activo ? 1 : 0, req.params.id]
  );
  res.json({ ok: true });
}));

router.delete('/telegram/integrantes/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM telegram_integrantes WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

router.get('/telegram/horarios', asyncHandler(async (req, res) => {
  let row = await queryOne('SELECT * FROM telegram_config_horarios WHERE id = 1');
  if (!row) {
    await query('INSERT INTO telegram_config_horarios (id, dias_operativos) VALUES (1, ?)', [JSON.stringify([1,2,3,4,5,6,7])]);
    row = await queryOne('SELECT * FROM telegram_config_horarios WHERE id = 1');
  }
  res.json(row);
}));

router.put('/telegram/horarios', asyncHandler(async (req, res) => {
  const { hora_inicio, hora_fin, dias_operativos, activo, visibilidad_numero } = req.body;
  await query(
    'UPDATE telegram_config_horarios SET hora_inicio = ?, hora_fin = ?, dias_operativos = ?, activo = ?, visibilidad_numero = ? WHERE id = 1',
    [hora_inicio, hora_fin, JSON.stringify(dias_operativos), activo ? 1 : 0, visibilidad_numero]
  );
  res.json({ ok: true });
}));

router.get('/telegram/historial', asyncHandler(async (req, res) => {
  const list = await query('SELECT * FROM telegram_operaciones_log ORDER BY created_at DESC LIMIT 100');
  res.json(list);
}));

export default router;
