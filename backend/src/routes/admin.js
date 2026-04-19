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
        (SELECT COALESCE(SUM(monto), 0) FROM compras_nivel WHERE estado = 'completada') as total_ventas_nivel,
        (SELECT COALESCE(SUM(monto), 0) FROM retiros WHERE estado = 'pagado') as total_retiros,
        (SELECT COUNT(*) FROM retiros WHERE estado = 'pendiente') as pendientes_retiro,
        (SELECT COUNT(*) FROM compras_nivel WHERE estado = 'pendiente') as pendientes_compra_nivel
    `);
    res.json(stats[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/compras-nivel', async (req, res) => {
  try {
    const rows = await query(`
      SELECT c.*, u.nombre_usuario, u.telefono, n.nombre as nivel_nombre 
      FROM compras_nivel c
      JOIN usuarios u ON c.usuario_id = u.id
      JOIN niveles n ON c.nivel_id = n.id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/usuarios', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admins', async (req, res) => {
  try {
    const admins = await query(`SELECT id, nombre_usuario, telefono, rol, created_at FROM usuarios WHERE rol = 'admin'`);
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recargas', async (req, res) => {
  try {
    const rows = await query(`
      SELECT c.*, u.nombre_usuario, u.telefono, n.nombre as nivel_nombre 
      FROM compras_nivel c
      JOIN usuarios u ON c.usuario_id = u.id
      JOIN niveles n ON c.nivel_id = n.id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/retiros', async (req, res) => {
  try {
    const rows = await query(`
      SELECT r.*, u.nombre_usuario, u.telefono 
      FROM retiros r
      JOIN usuarios u ON r.usuario_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/compras-nivel/:id/aprobar', async (req, res) => {
  try {
    const result = await approveLevelPurchase(req.params.id, req.user.id);
    const compra = await queryOne(`SELECT * FROM compras_nivel WHERE id = ?`, [req.params.id]);
    if (compra) {
      await distributeInvestmentCommissions(compra.usuario_id, compra.monto);
      // Invalidar caché de ranking ya que un ascenso afecta el conteo de invitados reales
      await redis.del('admin:ranking:invitados');
    }
    res.json({ ok: true, trace_id: result.traceId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/compras-nivel/:id/rechazar', async (req, res) => {
  try {
    const { motivo } = req.body;
    await query(
      `UPDATE compras_nivel SET estado = 'rechazada', admin_notas = ?, procesado_por = ?, procesado_at = NOW() WHERE id = ?`,
      [motivo, req.user.id, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// ========================
// GESTIÓN DE MÉTODOS QR
// ========================

router.get('/metodos-qr', async (req, res) => {
  try {
    const list = await query(`SELECT * FROM metodos_qr ORDER BY orden ASC`);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/metodos-qr-all', async (req, res) => {
  try {
    const list = await query(`SELECT * FROM metodos_qr ORDER BY created_at DESC`);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/metodos-qr', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/metodos-qr/:id', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/metodos-qr/:id', async (req, res) => {
  try {
    await query(`DELETE FROM metodos_qr WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// GESTIÓN DE PREMIOS RULETA
// ========================

router.get('/premios-ruleta', async (req, res) => {
  try {
    const list = await query(`SELECT * FROM premios_ruleta ORDER BY orden ASC`);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/premios-ruleta', async (req, res) => {
  try {
    const { nombre, tipo, valor, probabilidad, activo, orden } = req.body;
    const id = uuidv4();
    await query(`INSERT INTO premios_ruleta (id, nombre, tipo, valor, probabilidad, activo, orden) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, nombre, tipo, valor, probabilidad, activo ? 1 : 0, orden || 0]);
    res.json({ id, ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/premios-ruleta/:id', async (req, res) => {
  try {
    const { nombre, tipo, valor, probabilidad, activo, orden } = req.body;
    await query(`UPDATE premios_ruleta SET nombre = ?, tipo = ?, valor = ?, probabilidad = ?, activo = ?, orden = ? WHERE id = ?`,
      [nombre, tipo, valor, probabilidad, activo ? 1 : 0, orden || 0, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/premios-ruleta/:id', async (req, res) => {
  try {
    await query(`DELETE FROM premios_ruleta WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// GESTIÓN DE BANNERS
// ========================

router.get('/banners', async (req, res) => {
  try {
    const list = await query(`SELECT * FROM banners_carrusel ORDER BY orden ASC`);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/banners', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/banners/:id', async (req, res) => {
  try {
    await query(`DELETE FROM banners_carrusel WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/regalar-tickets', async (req, res) => {
  try {
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
// SUBIDA DE VIDEOS A CLOUDINARY
// ========================

router.post('/tareas/video', uploadToCloudinary.single('video'), async (req, res) => {
  try {
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
  } catch (err) {
    logger.error('[Admin] Error subiendo video:', err);
    res.status(500).json({ error: err.message || 'Error al subir el video a Cloudinary.' });
  }
});

router.post('/tareas/video/base64', async (req, res) => {
  try {
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
  } catch (err) {
    logger.error('[Admin] Error subiendo video base64:', err);
    res.status(500).json({ error: err.message || 'Error al subir el video a Cloudinary.' });
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

router.get('/public-content', async (req, res) => {
  try {
    const content = await getPublicContent();
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/public-content', async (req, res) => {
  try {
    await refreshPublicContent(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ranking-invitados', async (req, res) => {
  const cacheKey = 'admin:ranking:invitados';
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/usuarios/:id/lider', async (req, res) => {
  try {
    const { tipo_lider } = req.body;
    await query(`UPDATE usuarios SET tipo_lider = ? WHERE id = ?`, [tipo_lider, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/usuarios/:id/nivel', async (req, res) => {
  try {
    const { nivel_id } = req.body;
    await query(`UPDATE usuarios SET nivel_id = ? WHERE id = ?`, [nivel_id, req.params.id]);
    await redis.del('admin:ranking:invitados');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/usuarios/:id/bloquear', async (req, res) => {
  try {
    const { bloqueado } = req.body;
    await query(`UPDATE usuarios SET bloqueado = ? WHERE id = ?`, [bloqueado ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/usuarios/:id/password', async (req, res) => {
  try {
    const { password, type } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const field = type === 'operaciones' ? 'password_operaciones' : 'password';
    await query(`UPDATE usuarios SET ${field} = ? WHERE id = ?`, [hashed, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cuestionario/castigar', (req, res) => {
  // Endpoint obsoleto, ahora las encuestas son pasivas
  res.json({ ok: true, message: 'La función de castigo ha sido desactivada. Las encuestas son ahora opcionales.', punished: 0 });
});

export default router;
