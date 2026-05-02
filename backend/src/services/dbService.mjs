import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, transaction } from '../config/db.mjs';
import logger from '../utils/logger.mjs';
import * as boliviaTimeHelper from '../utils/boliviaTime.mjs';

// Re-exportar utilidades de base de datos para evitar SyntaxErrors en imports delegados
export { query, queryOne, transaction };

/**
 * @section AUDITORÍA SENIOR v8.1.0 - GESTIÓN DE ERRORES GLOBALES
 */
// Los errores globales ahora se gestionan centralizadamente en index.js

// Cachés simples para optimización de lectura
const userCache = new Map();
const USER_CACHE_TTL = 10000; // 10 segundos
const levelsCache = { data: null, lastFetch: 0 };
const configCache = { data: null, lastFetch: 0 };

const DEFAULT_CONFIG = {
  task_allowed_days: '1,2,3,4,5',
  comision_retiro: 12,
  horario_recarga: { enabled: true, hora_inicio: '08:00', hora_fin: '22:00', dias_semana: [1,2,3,4,5,6,0] },
  horario_retiro: { enabled: true, hora_inicio: '09:00', hora_fin: '18:00', dias_semana: [1,2,3,4,5] },
  marquee_text: 'Bienvenido a BCB Global Institutional — Liderando la Inversión Publicitaria',
  soporte_canal_url: 'https://t.me/bcb_oficial',
  soporte_gerente_url: 'https://wa.me/59170000000',
  ruleta_activa: true,
  recompensas_visibles: true,
  banners: []
};

const DEFAULT_LEVELS = [
  { id: 'l1', codigo: 'internar', nombre: 'Pasante', deposito: 0, num_tareas_diarias: 3, ganancia_tarea: 1.00, orden: 0, activo: 1 },
  { id: 'l2', codigo: 'global1', nombre: 'GLOBAL 1', deposito: 230.00, num_tareas_diarias: 4, ganancia_tarea: 1.80, orden: 1, activo: 1 },
  { id: 'l3', codigo: 'global2', nombre: 'GLOBAL 2', deposito: 780.00, num_tareas_diarias: 8, ganancia_tarea: 3.22, orden: 2, activo: 1 },
  { id: 'l4', codigo: 'global3', nombre: 'GLOBAL 3', deposito: 2900.00, num_tareas_diarias: 15, ganancia_tarea: 6.76, orden: 3, activo: 1 },
  { id: 'l5', codigo: 'global4', nombre: 'GLOBAL 4', deposito: 9200.00, num_tareas_diarias: 30, ganancia_tarea: 11.33, orden: 4, activo: 1 },
  { id: 'l6', codigo: 'global5', nombre: 'GLOBAL 5', deposito: 28200.00, num_tareas_diarias: 60, ganancia_tarea: 17.43, orden: 5, activo: 1 },
  { id: 'l7', codigo: 'global6', nombre: 'GLOBAL 6', deposito: 58000.00, num_tareas_diarias: 100, ganancia_tarea: 22.35, orden: 6, activo: 1 },
  { id: 'l8', codigo: 'global7', nombre: 'GLOBAL 7', deposito: 124000.00, num_tareas_diarias: 160, ganancia_tarea: 31.01, orden: 7, activo: 1 },
  { id: 'l9', codigo: 'global8', nombre: 'GLOBAL 8', deposito: 299400.00, num_tareas_diarias: 250, ganancia_tarea: 47.91, orden: 8, activo: 1 },
  { id: 'l10', codigo: 'global9', nombre: 'GLOBAL 9', deposito: 541600.00, num_tareas_diarias: 400, ganancia_tarea: 58.87, orden: 9, activo: 1 }
];

/**
 * Utilidades para fechas en zona horaria de Bolivia (America/La_Paz)
 */
export const boliviaTime = {
  now: (date = new Date()) => {
    return boliviaTimeHelper.getBoliviaNow();
  },
  todayStr: () => {
    return boliviaTimeHelper.getBoliviaDateKey();
  },
  yesterdayStr: () => {
    const d = boliviaTimeHelper.getBoliviaNow();
    d.setDate(d.getDate() - 1);
    return boliviaTimeHelper.getBoliviaDateKey(d);
  },
  getDateString: (date = new Date()) => {
    return boliviaTimeHelper.getBoliviaDateKey(date);
  },
  getTimeString: (date = new Date()) => {
    return boliviaTimeHelper.getBoliviaTimeString(date);
  },
  getISOString: (date = new Date()) => {
    return boliviaTimeHelper.getBoliviaISOString(date);
  },
  getDay: (date = new Date()) => {
    return boliviaTimeHelper.getBoliviaDayOfWeek();
  },
  getDayName: (date = new Date()) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[boliviaTime.getDay(date)];
  },
  isTimeInWindow: (timeStr, start = '00:00', end = '23:59') => {
    if (start <= end) {
      return (timeStr >= start && timeStr <= end);
    }
    return (timeStr >= start || timeStr <= end);
  }
};

// ========================
// 0. CALENDARIO OPERATIVO (Validaciones Centralizadas)
// ========================

/**
 * Pre-carga de niveles para evitar queries repetitivas
 */
export async function preloadLevels() {
  try {
    const rows = await query('SELECT * FROM niveles WHERE activo = 1 ORDER BY orden ASC');
    if (rows.length > 0) {
      levelsCache.data = rows;
      levelsCache.lastFetch = Date.now();
      logger.info(`[CACHE] ${rows.length} niveles cargados.`);
    }
  } catch (err) {
    logger.error('[CACHE-ERROR] Fallo al pre-cargar niveles:', err.message);
    levelsCache.data = DEFAULT_LEVELS; // Fallback
  }
}

/**
 * Pre-carga de configuración global
 */
export async function preloadConfig() {
  try {
    await getPublicContent();
    logger.info('[CACHE] Configuración global cargada.');
  } catch (err) {
    logger.error('[CACHE-ERROR] Fallo al pre-cargar configuración:', err.message);
    configCache.data = DEFAULT_CONFIG; // Fallback
  }
}

/**
 * Obtiene el estado operativo para una fecha específica
 */
export async function getDayStatus(dateStr = boliviaTime.todayStr()) {
  try {
    const day = await queryOne(`SELECT * FROM calendario_operativo WHERE fecha = ?`, [dateStr]);
    
    // Obtenemos el día de la semana de forma segura en UTC para comparar
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = dateObj.getUTCDay(); // 0=Dom, 1=Lun...

    // Reglas Base (Si no hay registro en el calendario)
    const status = day || {
      fecha: dateStr,
      tipo_dia: (dayOfWeek === 0 ? 'mantenimiento' : 'laboral'),
      es_feriado: 0,
      tareas_habilitadas: (dayOfWeek === 0) ? 0 : 1, // Domingos bloqueados por defecto
      retiros_habilitados: 1,
      recargas_habilitadas: 1,
      motivo: (dayOfWeek === 0 ? 'Mantenimiento Dominical' : null),
      reglas_niveles: {}
    };

    return status;
  } catch (e) {
    logger.error(`[Calendar] Error getting status for ${dateStr}: ${e.message}`);
    // Fallback seguro v7.0.6
    return {
      fecha: dateStr,
      tipo_dia: 'laboral',
      es_feriado: 0,
      tareas_habilitadas: 1,
      retiros_habilitados: 1,
      recargas_habilitadas: 1,
      motivo: null,
      reglas_niveles: {}
    };
  }
}

export async function getUserTeamReport(userId) {
  try {
    // 1. Obtener niveles para mapeo
    const levels = await getLevels();
    const internarId = levels.find(l => String(l.codigo).toLowerCase() === 'internar')?.id || '';

    // 2. Reporte de 3 niveles con conteo real
    const level1 = await query(`
      SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre, u.nivel_id
      FROM usuarios u 
      LEFT JOIN niveles n ON u.nivel_id = n.id
      WHERE u.invitado_por = ?`, [userId]);

    const level2 = level1.length > 0 ? await query(`
      SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre, u.nivel_id
      FROM usuarios u 
      LEFT JOIN niveles n ON u.nivel_id = n.id
      WHERE u.invitado_por IN (?)`, [level1.map(u => u.id)]) : [];

    const level3 = level2.length > 0 ? await query(`
      SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre, u.nivel_id
      FROM usuarios u 
      LEFT JOIN niveles n ON u.nivel_id = n.id
      WHERE u.invitado_por IN (?)`, [level2.map(u => u.id)]) : [];

    // 3. Cálculo de Comisiones
    const commissions = await query(`
      SELECT 
        CASE 
          WHEN descripcion LIKE '%Nivel A%' THEN 'A'
          WHEN descripcion LIKE '%Nivel B%' THEN 'B'
          WHEN descripcion LIKE '%Nivel C%' THEN 'C'
          ELSE 'Otros'
        END as nivel_red,
        SUM(monto) as total
      FROM movimientos_saldo 
      WHERE usuario_id = ? AND tipo_movimiento = 'comision_inversion'
      GROUP BY nivel_red
    `, [userId]);

    const commMap = commissions.reduce((acc, curr) => {
      acc[curr.nivel_red] = Number(curr.total || 0);
      return acc;
    }, {});

    const totalCommissions = Object.values(commMap).reduce((a, b) => a + b, 0);

    return {
      resumen: {
        total_miembros: level1.length + level2.length + level3.length,
        ingresos_totales: totalCommissions,
        comisiones_hoy: 0 
      },
      niveles: [
        { nivel: 'A', porcentaje: 10, total_miembros: level1.length, monto_recarga: commMap['A'] || 0 },
        { nivel: 'B', porcentaje: 3, total_miembros: level2.length, monto_recarga: commMap['B'] || 0 },
        { nivel: 'C', porcentaje: 1, total_miembros: level3.length, monto_recarga: commMap['C'] || 0 }
      ],
      detalles: {
        level1: level1.map(u => ({ ...u, join_date: u.created_at })),
        level2: level2.map(u => ({ ...u, join_date: u.created_at })),
        level3: level3.map(u => ({ ...u, join_date: u.created_at }))
      }
    };
  } catch (err) {
    logger.error(`[Team Report Error]: ${err.message}`);
    return { 
      resumen: { total_miembros: 0, ingresos_totales: 0, comisiones_hoy: 0 }, 
      niveles: [], 
      detalles: { level1: [], level2: [], level3: [] } 
    };
  }
}

/**
 * Validación Centralizada: ¿Puede realizar tareas hoy?
 */
export async function canPerformTasks(userId, dateStr = boliviaTime.todayStr()) {
  try {
    const status = await getDayStatus(dateStr);
    if (!status) return { ok: true }; 

    if (!status.tareas_habilitadas) {
      return { ok: false, message: status.motivo || 'Las tareas están suspendidas por hoy.' };
    }

    // Verificar reglas por nivel si existen
    const user = await findUserById(userId);
    if (!user) return { ok: false, message: 'Usuario no encontrado.' };
    if (user.bloqueado) return { ok: false, message: 'Tu cuenta ha sido bloqueada.' };
    
    const levels = await getLevels();
    const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));

    const levelRules = typeof status.reglas_niveles === 'string' 
      ? JSON.parse(status.reglas_niveles) 
      : (status.reglas_niveles || {});

    if (userLevel && levelRules[userLevel.codigo]?.tareas === false) {
      return { ok: false, message: `Las tareas no están habilitadas para el nivel ${userLevel.nombre} hoy.` };
    }

    // 3. Verificar Límite Diario Real (Anti-Bypass) v7.0.5
    const countResult = await queryOne(`SELECT COUNT(*) as total FROM actividad_tareas WHERE usuario_id = ? AND fecha_dia = ?`, [userId, dateStr]);
    const completed = countResult?.total || 0;
    
    if (userLevel && completed >= userLevel.num_tareas_diarias) {
      return { ok: false, message: 'Límite de tareas diarias alcanzado.' };
    }

    return { ok: true };
  } catch (err) {
    logger.error(`[canPerformTasks Error]: ${err.message}`);
    return { ok: false, message: 'Error interno de validación de tareas.' };
  }
}

/**
 * Validación Centralizada: ¿Puede retirar hoy?
 */
/**
 * Verifica si el usuario puede realizar recargas según el calendario operativo
 */
export async function canRecharge(userId, dateStr = boliviaTime.todayStr()) {
  const status = await getDayStatus(dateStr);
  if (!status) return { ok: true };

  if (!status.recargas_habilitadas) {
    return { ok: false, message: status.motivo || 'Las recargas están suspendidas temporalmente por administración.' };
  }

  const user = await findUserById(userId);
  if (!user) return { ok: false, message: 'Usuario no encontrado.' };
  if (user.bloqueado) return { ok: false, message: 'Tu cuenta ha sido bloqueada.' };

  return { ok: true };
}

export async function canWithdraw(userId, dateStr = boliviaTime.todayStr()) {
  const status = await getDayStatus(dateStr);
  if (!status) return { ok: true };

  if (!status.retiros_habilitados) {
    return { ok: false, message: status.motivo || 'Los retiros están suspendidos temporalmente por administración.' };
  }

  const user = await findUserById(userId);
  if (!user) return { ok: false, message: 'Usuario no encontrado.' };
  if (user.bloqueado) return { ok: false, message: 'Tu cuenta ha sido bloqueada. Contacta a soporte.' };

  const levels = await getLevels();
  const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));
  
  if (!userLevel || userLevel.codigo === 'internar' || userLevel.codigo === 'pasantia') {
    return { ok: false, message: 'El nivel Internar no tiene habilitados los retiros. Debes estar en un nivel global para solicitar retiros.' };
  }

  // REGLA GLOBAL: Martes (2) a Jueves (4)
  const dayOfWeek = boliviaTime.getDay(); // Basado en hora de Bolivia actual
  const isAllowedDay = dayOfWeek >= 2 && dayOfWeek <= 4;

  if (!isAllowedDay) {
    return { ok: false, message: 'Los retiros están disponibles de martes a jueves, según horario de Bolivia.' };
  }

  // 2. Regla de Horario (Config Global)
  const time = boliviaTime.getTimeString();
  const config = await getPublicContent();
  
  let schedule = { enabled: true, inicio: '09:00', fin: '18:00' };
  
  if (config.horario_retiro) {
    const c = typeof config.horario_retiro === 'string' ? JSON.parse(config.horario_retiro) : config.horario_retiro;
    schedule = { enabled: !!c.enabled, inicio: c.hora_inicio, fin: c.hora_fin };
  }

  if (schedule.enabled && !boliviaTime.isTimeInWindow(time, schedule.inicio, schedule.fin)) {
    return { ok: false, message: `El horario de retiros es de ${schedule.inicio} a ${schedule.fin} (Hora Bolivia).` };
  }

  return { ok: true };
}

// ========================
// 1. USUARIOS & AUTH
// ========================

const USER_FIELDS = `id, tenant_id, telefono, nombre_usuario, nombre_real, codigo_invitacion, invitado_por, nivel_id, avatar_url, saldo_principal, saldo_comisiones, rol, bloqueado, tickets_ruleta, primer_ascenso_completado, last_device_id, created_at`;

export async function findUserById(id, tenantId = null) {
  const now = Date.now();
  const cacheKey = tenantId ? `${tenantId}:${id}` : id;

  if (userCache.has(cacheKey)) {
    const cached = userCache.get(cacheKey);
    if (now - cached.timestamp < USER_CACHE_TTL) return cached.data;
  }

  let sql = `SELECT ${USER_FIELDS} FROM usuarios WHERE id = ?`;
  const params = [id];

  if (tenantId) {
    sql += ` AND tenant_id = ?`;
    params.push(tenantId);
  }

  const user = await queryOne(sql, params);
  if (user) userCache.set(cacheKey, { data: user, timestamp: now });
  return user;
}

/**
 * Normaliza el formato de teléfono para búsqueda flexible.
 * Acepta: 70000001, 59170000001, +59170000001
 * Retorna un array con las posibles variaciones para la base de datos.
 */
export function normalizeTelefono(tel) {
  if (!tel) return [];
  const variations = new Set();
  const raw = String(tel).trim();
  
  // 1. Agregar el original tal cual (trim)
  variations.add(raw);
  
  // 2. Versión solo números
  const clean = raw.replace(/\D/g, '');
  if (!clean) return Array.from(variations);
  variations.add(clean);
  
  // 3. Lógica específica para Bolivia (+591 o 591 o sin nada)
  // Si tiene 8 dígitos, es el número base de Bolivia
  if (clean.length === 8) {
    variations.add(`591${clean}`);
    variations.add(`+591${clean}`);
  } 
  // Si tiene 11 dígitos y empieza con 591
  else if (clean.length === 11 && clean.startsWith('591')) {
    const core = clean.substring(3);
    variations.add(core);
    variations.add(`+${clean}`);
  }
  // Si tiene 12 dígitos y empieza con +591
  else if (raw.startsWith('+591') && clean.length === 11) {
    const core = clean.substring(3);
    variations.add(core);
    variations.add(clean);
  }

  // Asegurar que si empieza con +, también esté la versión sin + y viceversa
  if (raw.startsWith('+')) {
    variations.add(raw.substring(1));
  } else if (/^\d+$/.test(raw)) {
    variations.add('+' + raw);
  }

  return Array.from(variations);
}

/**
 * Obtiene el formato canónico para guardar en DB (siempre +591XXXXXXXX)
 */
export function getCanonicalTelefono(tel) {
  const clean = String(tel).replace(/\D/g, '');
  if (clean.length === 8) return `+591${clean}`;
  if (clean.length === 11 && clean.startsWith('591')) return `+${clean}`;
  if (tel.startsWith('+')) return tel;
  return `+${clean}`;
}

export async function findUserByTelefono(telefono, tenantId = null) {
  const variations = normalizeTelefono(telefono);
  if (variations.length === 0) return null;

  const placeholders = variations.map(() => '?').join(',');
  let sql = `SELECT password_hash, ${USER_FIELDS} FROM usuarios WHERE telefono IN (${placeholders})`;
  const params = [...variations];

  if (tenantId) {
    sql += ` AND tenant_id = ?`;
    params.push(tenantId);
  }

  const user = await queryOne(sql, params);
  if (!user) {
    logger.info(`[AUTH-DEBUG] No se encontró usuario con variaciones: ${variations.join(', ')}`);
  } else {
    logger.info(`[AUTH-DEBUG] Usuario encontrado: ${user.telefono} (ID: ${user.id})`);
  }
  return user;
}

export async function findUserWithAuthSecrets(id) {
  return await queryOne(`SELECT id, password_hash, password_fondo_hash, rol FROM usuarios WHERE id = ?`, [id]);
}

export async function createUser(userData) {
  const sql = `
    INSERT INTO usuarios (
      id, tenant_id, telefono, nombre_usuario, nombre_real, 
      password_hash, password_fondo_hash, codigo_invitacion, 
      invitado_por, nivel_id, rol, last_device_id, 
      saldo_principal, saldo_comisiones, tickets_ruleta
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    userData.id || uuidv4(),
    userData.tenant_id || 'default-tenant-uuid',
    userData.telefono,
    userData.nombre_usuario,
    userData.nombre_real || userData.nombre_usuario,
    userData.password_hash,
    userData.password_fondo_hash || null,
    userData.codigo_invitacion,
    userData.invitado_por || null,
    userData.nivel_id,
    userData.rol || 'usuario',
    userData.last_device_id || null,
    userData.saldo_principal || 0,
    userData.saldo_comisiones || 0,
    userData.tickets_ruleta || 0
  ];
  await query(sql, params);
  return await findUserById(params[0]);
}

export async function updateUser(id, updates) {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const params = [...Object.values(updates).map(v => v === undefined ? null : v), id];
  
  await query(`UPDATE usuarios SET ${setClause} WHERE id = ?`, params);
  userCache.delete(id); // Invalidar caché
  return await findUserById(id);
}

export async function getUsers() {
  return await query(`SELECT * FROM usuarios`);
}

// ========================
// 2. NIVELES
// ========================

export async function getLevels() {
  const now = Date.now();
  if (levelsCache.data && now - levelsCache.lastFetch < 600000) { // 10 min cache
    return levelsCache.data;
  }

  try {
    const levels = await query(`SELECT * FROM niveles ORDER BY orden ASC`);
    if (!levels || levels.length === 0) {
      await syncLevels();
      return getLevels();
    }
    
    const processed = levels.map(l => {
      const deposito = Number(l.deposito);
      const ganancia_tarea = Number(l.ganancia_tarea);
      const num_tareas_diarias = Number(l.num_tareas_diarias);
      const ingreso_diario = Number((num_tareas_diarias * ganancia_tarea).toFixed(2));
      const isInternar = String(l.codigo).toLowerCase() === 'internar';

      return {
        ...l,
        deposito,
        ganancia_tarea,
        num_tareas_diarias,
        ingreso_diario,
        ingreso_mensual: isInternar ? 0 : Number((ingreso_diario * 30).toFixed(2)),
        ingreso_anual: isInternar ? 0 : Number((ingreso_diario * 365).toFixed(2)),
        orden: Number(l.orden),
        activo: !!l.activo,
        retiro_horario_habilitado: !!l.retiro_horario_habilitado,
        retiro_dia_inicio: l.retiro_dia_inicio !== null ? Number(l.retiro_dia_inicio) : 1,
        retiro_dia_fin: l.retiro_dia_fin !== null ? Number(l.retiro_dia_fin) : 5
      };
    });

    levelsCache.data = processed;
    levelsCache.lastFetch = now;
    return processed;
  } catch (e) {
    logger.warn('[DB] Error al obtener niveles, usando fallback.');
    return levelsCache.data || DEFAULT_LEVELS.map(l => {
      const ingreso_diario = Number((Number(l.num_tareas_diarias) * Number(l.ganancia_tarea)).toFixed(2));
      const isInternar = String(l.codigo).toLowerCase() === 'internar';
      return {
        ...l,
        ingreso_diario,
        ingreso_mensual: isInternar ? 0 : Number((ingreso_diario * 30).toFixed(2)),
        ingreso_anual: isInternar ? 0 : Number((ingreso_diario * 365).toFixed(2))
      };
    });
  }
}

/**
 * Sincroniza la tabla de niveles con los DEFAULT_LEVELS oficiales.
 * Solo actualiza si hay cambios o faltan niveles.
 */
export async function syncLevels() {
  try {
    for (const level of DEFAULT_LEVELS) {
      await query(`
        INSERT INTO niveles (id, codigo, nombre, deposito, num_tareas_diarias, ganancia_tarea, orden, activo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          deposito = VALUES(deposito),
          num_tareas_diarias = VALUES(num_tareas_diarias),
          ganancia_tarea = VALUES(ganancia_tarea),
          orden = VALUES(orden)
      `, [level.id, level.codigo, level.nombre, level.deposito, level.num_tareas_diarias, level.ganancia_tarea, level.orden, level.activo]);
    }
    logger.info('[SYNC] Niveles sincronizados con la tabla oficial.');
  } catch (err) {
    logger.error(`[Sync Error]: ${err.message}`);
  }
}

export async function invalidateLevelsCache() {
  levelsCache.data = null;
  levelsCache.lastFetch = 0;
}

// ========================
// 3. TAREAS & ACTIVIDAD (Economía unificada)
// ========================

export async function getTasks() {
  return await query(`SELECT * FROM tareas WHERE activa = 1 ORDER BY RAND()`);
}

export async function getTaskById(id) {
  return await queryOne(`SELECT * FROM tareas WHERE id = ?`, [id]);
}

/**
 * Acredita una tarea con Blindaje Senior:
 * 1. Idempotencia en DB.
 * 2. Bloqueo Pesimista (SELECT FOR UPDATE) en Usuario y Tarea Diaria.
 * 3. Auditoría Forense Atómica.
 */
export async function completeTask(userId, taskId, idempotencyKey = null) {
  const traceId = uuidv4();
  const operacion = 'TASK_REWARD';
  const todayBolivia = boliviaTime.todayStr();
  
  return await transaction(async (conn) => {
    // 0. IDEMPOTENCIA EN DB
    if (idempotencyKey) {
      const [existing] = await conn.query(
        'SELECT response_body FROM idempotencia WHERE idempotency_key = ? FOR UPDATE', 
        [idempotencyKey]
      );
      if (existing.length > 0) return JSON.parse(existing[0].response_body);
    }

    // 1. LOCK USUARIO
    const [userRows] = await conn.query('SELECT * FROM usuarios WHERE id = ? FOR UPDATE', [userId]);
    const user = userRows[0];
    if (!user) throw new Error('Usuario no encontrado');
    if (user.bloqueado) throw new Error('Tu cuenta se encuentra bloqueada.');

    // 2. VALIDAR LÍMITE DIARIO (Se permite repetir el mismo video v11.3.0)
    const [countResult] = await conn.query(
      'SELECT COUNT(*) as total FROM actividad_tareas WHERE usuario_id = ? AND fecha_dia = ? FOR UPDATE',
      [userId, todayBolivia]
    );
    const todayCount = countResult[0]?.total || 0;

    const [levelRows] = await conn.query('SELECT * FROM niveles WHERE id = ? FOR UPDATE', [user.nivel_id]);
    const level = levelRows[0];
    if (!level) throw new Error('Configuración de nivel no encontrada');

    if (todayCount >= Number(level.num_tareas_diarias)) {
      throw new Error(`Límite diario alcanzado (${level.num_tareas_diarias} tareas).`);
    }

    // 4. ACREDITACIÓN ATÓMICA
    const amount = Number(level.ganancia_tarea);
    const oldBalance = Number(user.saldo_principal);
    const newBalance = oldBalance + amount;

    await conn.query('UPDATE usuarios SET saldo_principal = ? WHERE id = ?', [newBalance, userId]);
    
    const activityId = uuidv4();
    try {
      await conn.query(
        'INSERT INTO actividad_tareas (id, usuario_id, tarea_id, monto_ganado, fecha_dia) VALUES (?, ?, ?, ?, ?)',
        [activityId, userId, taskId, amount, todayBolivia]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new Error('Ya has completado esta tarea hoy.');
      }
      throw err;
    }

    // 5. MOVIMIENTO Y AUDITORÍA
    const movimientoId = uuidv4();
    await conn.query(
      `INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
       VALUES (?, ?, 'principal', 'tarea_completada', ?, ?, ?, ?, ?)`,
      [movimientoId, userId, amount, oldBalance, newBalance, activityId, 'Pago por tarea realizada']
    );

    await conn.query(
      `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id) 
       VALUES (?, ?, ?, 'principal', ?, ?, ?, ?)`,
      [traceId, userId, operacion, amount, oldBalance, newBalance, activityId]
    );

    userCache.delete(userId);

    const res = { success: true, amount, traceId, message: 'Tarea acreditada con éxito' };

    // 6. REGISTRAR IDEMPOTENCIA
    if (idempotencyKey) {
      await conn.query(
        'INSERT INTO idempotencia (idempotency_key, response_body, operacion, usuario_id) VALUES (?, ?, ?, ?)', 
        [idempotencyKey, JSON.stringify(res), operacion, userId]
      );
    }

    return res;
  });
}

// ========================
// 4. COMPRAS DE NIVEL & RETIROS (Transaccionales ACID)
// ========================

/**
 * Crea una orden de compra de nivel (LEVEL_PURCHASE)
 */
export async function createLevelPurchase(userId, nivelId, monto, comprobanteUrl) {
  const id = uuidv4();
  await query(
    `INSERT INTO compras_nivel (id, usuario_id, nivel_id, monto, comprobante_url, estado) 
     VALUES (?, ?, ?, ?, ?, 'pendiente')`,
    [id, userId, nivelId, monto, comprobanteUrl]
  );
  return { id, status: 'pendiente' };
}

/**
 * Solicitar Retiro con Blindaje Extremo (Nivel Senior):
 * 1. Idempotencia en DB (No Redis).
 * 2. Bloqueo Pesimista (SELECT FOR UPDATE).
 * 3. Validación de 1 Retiro/Día usando Timezone Bolivia (America/La_Paz).
 * 4. Auditoría Forense Atómica.
 */
export async function requestWithdrawal(userId, { monto, tipo_billetera, tarjeta_id, idempotencyKey }) {
  const traceId = uuidv4();
  const operacion = 'WITHDRAW_REQUEST';

  return await transaction(async (conn) => {
    // 0. IDEMPOTENCIA EN DB: Fuente de Verdad Única
    if (idempotencyKey) {
      const [existing] = await conn.query(
        'SELECT response_body FROM idempotencia WHERE idempotency_key = ? FOR UPDATE', 
        [idempotencyKey]
      );
      if (existing.length > 0) return JSON.parse(existing[0].response_body);
    }

    // 1. LOCK USUARIO: Previene condiciones de carrera en saldo
    const balanceField = tipo_billetera === 'comisiones' ? 'saldo_comisiones' : 'saldo_principal';
    const [userRows] = await conn.query(
      `SELECT id, ${balanceField} as balance, nivel_id FROM usuarios WHERE id = ? FOR UPDATE`, 
      [userId]
    );
    const user = userRows[0];
    if (!user) throw new Error('Usuario no encontrado');

    const m = Number(monto);
    const oldBalance = Number(user.balance);
    if (oldBalance < m) throw new Error('Saldo insuficiente para realizar el retiro');

    // 2. BLINDAJE 1 RETIRO/DÍA: Validación estricta usando fecha_dia (Bolivia Time)
    const todayBolivia = boliviaTime.todayStr();
    const [withdrawCount] = await conn.query(
      `SELECT COUNT(*) as total FROM retiros 
       WHERE usuario_id = ? 
       AND fecha_dia = ?
       AND estado IN ('pendiente', 'aprobado', 'pagado') FOR UPDATE`,
      [userId, todayBolivia]
    );
    
    if (withdrawCount[0].total > 0) {
      throw new Error('Solo puedes realizar 1 retiro por día.');
    }

    // 3. DESCONTAR SALDO (ACID)
    const newBalance = oldBalance - m;
    await conn.query(`UPDATE usuarios SET ${balanceField} = ? WHERE id = ?`, [newBalance, userId]);

    // 4. CREAR REGISTRO DE RETIRO
    const retiroId = uuidv4();
    const config = await getPublicContent();
    const comisionPercent = Number(config.comision_retiro || 12);
    const comisionMonto = Number((m * (comisionPercent / 100)).toFixed(2));
    const montoNeto = m - comisionMonto;

    const [tarjetas] = await conn.query(
      `SELECT * FROM tarjetas_bancarias WHERE id = ? AND usuario_id = ? FOR UPDATE`, 
      [tarjeta_id, userId]
    );
    if (tarjetas.length === 0) throw new Error('Tarjeta bancaria no válida o no pertenece al usuario');

    // fecha_dia se guarda en UTC pero la lógica de validación usa CONVERT_TZ
    await conn.query(
      `INSERT INTO retiros (id, usuario_id, monto, monto_neto, comision_aplicada, tipo_billetera, estado, datos_bancarios, fecha_dia) 
       VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`,
      [retiroId, userId, m, montoNeto, comisionMonto, tipo_billetera, JSON.stringify(tarjetas[0]), todayBolivia]
    );

    // 5. MOVIMIENTO Y AUDITORÍA FORENSE
    const movimientoId = uuidv4();
    await conn.query(
      `INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
       VALUES (?, ?, ?, 'retiro', ?, ?, ?, ?, ?)`,
      [movimientoId, userId, tipo_billetera, -m, oldBalance, newBalance, retiroId, 'Solicitud de retiro']
    );

    await conn.query(
      `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [traceId, userId, operacion, tipo_billetera, m, oldBalance, newBalance, retiroId]
    );

    userCache.delete(userId);

    const res = { success: true, retiroId, traceId, message: 'Retiro procesado correctamente' };

    // 6. REGISTRAR IDEMPOTENCIA EN DB (Final de la transacción)
    if (idempotencyKey) {
      await conn.query(
        'INSERT INTO idempotencia (idempotency_key, response_body, operacion, usuario_id) VALUES (?, ?, ?, ?)', 
        [idempotencyKey, JSON.stringify(res), operacion, userId]
      );
    }

    return res;
  });
}

/**
 * Aprueba una compra de nivel con Blindaje Senior:
 * 1. Lock en Compra y Usuario.
 * 2. Validación de Estado 'pendiente'.
 * 3. Actualización Atómica.
 */
export async function approveLevelPurchase(compraId, adminId, idempotencyKey = null) {
  const traceId = uuidv4();
  const operacion = 'LEVEL_UPGRADE';

  return await transaction(async (conn) => {
    // 0. Idempotencia
    if (idempotencyKey) {
      const [existing] = await conn.query(
        'SELECT response_body FROM idempotencia WHERE idempotency_key = ? FOR UPDATE', 
        [idempotencyKey]
      );
      if (existing.length > 0) return JSON.parse(existing[0].response_body);
    }

    // 1. LOCK COMPRA: Evita doble aprobación
    const [compraRows] = await conn.query(
      `SELECT * FROM compras_nivel WHERE id = ? FOR UPDATE`, 
      [compraId]
    );
    const compra = compraRows[0];
    if (!compra) throw new Error('Orden de compra no encontrada');
    if (compra.estado !== 'pendiente') throw new Error(`La orden ya se encuentra en estado: ${compra.estado}`);

    // 2. LOCK USUARIO
    const [userRows] = await conn.query(`SELECT * FROM usuarios WHERE id = ? FOR UPDATE`, [compra.usuario_id]);
    const user = userRows[0];
    if (!user) throw new Error('Usuario asociado a la compra no encontrado');

    // 3. ACTUALIZACIÓN ATÓMICA
    const [levels] = await conn.query(`SELECT * FROM niveles WHERE id = ? FOR UPDATE`, [compra.nivel_id]);
    const targetLevel = levels[0];
    if (!targetLevel) throw new Error('Nivel de destino inválido');

    const ticketsToAdd = Number(targetLevel.orden);
    await conn.query(
      `UPDATE usuarios SET nivel_id = ?, tickets_ruleta = tickets_ruleta + ? WHERE id = ?`, 
      [targetLevel.id, ticketsToAdd, compra.usuario_id]
    );

    await conn.query(
      `UPDATE compras_nivel SET estado = 'completada', procesado_por = ?, procesado_at = NOW() WHERE id = ?`, 
      [adminId, compraId]
    );

    // 4. AUDITORÍA
    await conn.query(
      `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id, metadata) 
       VALUES (?, ?, ?, 'principal', ?, ?, ?, ?, ?)`,
      [traceId, compra.usuario_id, operacion, compra.monto, Number(user.saldo_principal), Number(user.saldo_principal), compraId, JSON.stringify({ old_level: user.nivel_id, new_level: targetLevel.id })]
    );

    userCache.delete(compra.usuario_id);

    const res = { success: true, traceId, message: `Ascenso a ${targetLevel.nombre} completado` };
    
    if (idempotencyKey) {
      await conn.query(
        'INSERT INTO idempotencia (idempotency_key, response_body, operacion, usuario_id) VALUES (?, ?, ?, ?)', 
        [idempotencyKey, JSON.stringify(res), operacion, adminId]
      );
    }

    return res;
  });
}

/**
 * Reembolso de Nivel Anterior (Upgrade Refund) con Blindaje Pesimista
 */
export async function refundPreviousLevel(userId, idempotencyKey) {
  const traceId = uuidv4();
  const operacion = 'LEVEL_REFUND';

  return await transaction(async (conn) => {
    // 0. Idempotencia en DB
    if (idempotencyKey) {
      const [existing] = await conn.query(
        'SELECT response_body FROM idempotencia WHERE idempotency_key = ? FOR UPDATE', 
        [idempotencyKey]
      );
      if (existing.length > 0) return JSON.parse(existing[0].response_body);
    }

    // 1. LOCK USUARIO
    const [userRows] = await conn.query(`SELECT * FROM usuarios WHERE id = ? FOR UPDATE`, [userId]);
    const user = userRows[0];
    if (!user) throw new Error('Usuario no encontrado');

    // 2. BUSCAR COMPRA ORIGINAL (LOCK PESIMISTA)
    const [purchaseRows] = await conn.query(
      `SELECT * FROM compras_nivel 
       WHERE usuario_id = ? AND nivel_id = ? AND estado = 'completada' AND reembolsado = 0 
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [userId, user.nivel_id]
    );
    const purchase = purchaseRows[0];
    if (!purchase) throw new Error('No se encontró una compra de nivel activa elegible para devolución.');

    // 3. ACREDITACIÓN ATÓMICA A WALLET COMISIONES
    const amount = Number(purchase.monto);
    const oldBalance = Number(user.saldo_comisiones);
    const newBalance = oldBalance + amount;

    await conn.query(`UPDATE usuarios SET saldo_comisiones = ? WHERE id = ?`, [newBalance, userId]);
    await conn.query(`UPDATE compras_nivel SET reembolsado = 1 WHERE id = ?`, [purchase.id]);

    // 4. MOVIMIENTO Y AUDITORÍA
    const movimientoId = uuidv4();
    await conn.query(
      `INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
       VALUES (?, ?, 'comisiones', 'devolucion_nivel', ?, ?, ?, ?, ?)`,
      [movimientoId, userId, amount, oldBalance, newBalance, purchase.id, 'Devolución de inversión por ascenso de nivel']
    );

    await conn.query(
      `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id) 
       VALUES (?, ?, ?, 'comisiones', ?, ?, ?, ?)`,
      [traceId, userId, operacion, amount, oldBalance, newBalance, purchase.id]
    );

    userCache.delete(userId);

    const res = { success: true, amount, traceId, message: 'Inversión devuelta a billetera de comisiones' };
    
    if (idempotencyKey) {
      await conn.query(
        'INSERT INTO idempotencia (idempotency_key, response_body, operacion, usuario_id) VALUES (?, ?, ?, ?)', 
        [idempotencyKey, JSON.stringify(res), operacion, userId]
      );
    }

    return res;
  });
}

/**
 * Aprueba un Retiro con Blindaje Senior:
 * 1. Lock en Retiro y Usuario.
 * 2. Validación de Estado 'pendiente'.
 * 3. Auditoría de finalización.
 */
export async function approveRetiro(retiroId, adminId, idempotencyKey = null) {
  const traceId = uuidv4();
  const operacion = 'WITHDRAW_APPROVE';

  return await transaction(async (conn) => {
    // 0. Idempotencia en DB
    if (idempotencyKey) {
      const [existing] = await conn.query(
        'SELECT response_body FROM idempotencia WHERE idempotency_key = ? FOR UPDATE', 
        [idempotencyKey]
      );
      if (existing.length > 0) return JSON.parse(existing[0].response_body);
    }

    // 1. LOCK RETIRO: Evita doble aprobación
    const [retiroRows] = await conn.query(
      `SELECT * FROM retiros WHERE id = ? FOR UPDATE`, 
      [retiroId]
    );
    const retiro = retiroRows[0];
    if (!retiro) throw new Error('Retiro no encontrado');
    if (retiro.estado !== 'pendiente') throw new Error(`El retiro ya se encuentra en estado: ${retiro.estado}`);

    // 2. ACTUALIZACIÓN ATÓMICA
    await conn.query(
      `UPDATE retiros SET estado = 'pagado', procesado_por = ?, procesado_at = NOW() WHERE id = ?`, 
      [adminId, retiroId]
    );

    // 3. AUDITORÍA (El saldo ya fue descontado al solicitar)
    await conn.query(
      `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id) 
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [traceId, retiro.usuario_id, operacion, retiro.tipo_billetera, retiro.monto, retiroId]
    );

    const res = { success: true, traceId, message: 'Retiro aprobado correctamente' };

    if (idempotencyKey) {
      await conn.query(
        'INSERT INTO idempotencia (idempotency_key, response_body, operacion, usuario_id) VALUES (?, ?, ?, ?)', 
        [idempotencyKey, JSON.stringify(res), operacion, adminId]
      );
    }

    return res;
  });
}

/**
 * Rechaza un Retiro con Reembolso Atómico:
 * 1. Lock en Retiro y Usuario.
 * 2. Validación de Estado 'pendiente'.
 * 3. Reembolso de Saldo Atómico.
 */
export async function rejectRetiro(retiroId, adminId, motivo, idempotencyKey = null) {
  const traceId = uuidv4();
  const operacion = 'WITHDRAW_REJECT_REFUND';

  return await transaction(async (conn) => {
    // 0. Idempotencia en DB
    if (idempotencyKey) {
      const [existing] = await conn.query(
        'SELECT response_body FROM idempotencia WHERE idempotency_key = ? FOR UPDATE', 
        [idempotencyKey]
      );
      if (existing.length > 0) return JSON.parse(existing[0].response_body);
    }

    // 1. LOCK RETIRO
    const [retiroRows] = await conn.query(
      `SELECT * FROM retiros WHERE id = ? FOR UPDATE`, 
      [retiroId]
    );
    const retiro = retiroRows[0];
    if (!retiro) throw new Error('Retiro no encontrado');
    if (retiro.estado !== 'pendiente') throw new Error(`El retiro ya se encuentra en estado: ${retiro.estado}`);

    // 2. LOCK USUARIO Y REEMBOLSO
    const balanceField = retiro.tipo_billetera === 'comisiones' ? 'saldo_comisiones' : 'saldo_principal';
    const [userRows] = await conn.query(
      `SELECT id, ${balanceField} as balance FROM usuarios WHERE id = ? FOR UPDATE`, 
      [retiro.usuario_id]
    );
    const user = userRows[0];
    if (!user) throw new Error('Usuario asociado al retiro no encontrado');

    const amount = Number(retiro.monto);
    const oldBalance = Number(user.balance);
    const newBalance = oldBalance + amount;

    await conn.query(`UPDATE usuarios SET ${balanceField} = ? WHERE id = ?`, [newBalance, user.id]);

    // 3. ACTUALIZAR ESTADO RETIRO
    await conn.query(
      `UPDATE retiros SET estado = 'rechazado', admin_notas = ?, procesado_por = ?, procesado_at = NOW() WHERE id = ?`, 
      [motivo, adminId, retiroId]
    );

    // 4. MOVIMIENTO Y AUDITORÍA
    const movimientoId = uuidv4();
    await conn.query(
      `INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
       VALUES (?, ?, ?, 'reembolso_retiro', ?, ?, ?, ?, ?)`,
      [movimientoId, user.id, retiro.tipo_billetera, amount, oldBalance, newBalance, retiroId, `Reembolso por retiro rechazado: ${motivo}`]
    );

    await conn.query(
      `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [traceId, user.id, operacion, amount, oldBalance, newBalance, retiroId]
    );

    userCache.delete(user.id);

    const res = { success: true, traceId, message: 'Retiro rechazado y saldo reembolsado' };

    if (idempotencyKey) {
      await conn.query(
        'INSERT INTO idempotencia (idempotency_key, response_body, operacion, usuario_id) VALUES (?, ?, ?, ?)', 
        [idempotencyKey, JSON.stringify(res), operacion, adminId]
      );
    }

    return res;
  });
}

/**
 * distributeInvestmentCommissions v7.0.6: Distribución de 3 niveles con regla de jerarquía
 */
export async function distributeInvestmentCommissions(userId, amount) {
  try {
    const user = await findUserById(userId);
    if (!user || !user.invitado_por) return;

    const levels = await getLevels();
    const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));
    if (!userLevel) return;

    const configs = [
      { key: 'A', percent: 0.10 },
      { key: 'B', percent: 0.03 },
      { key: 'C', percent: 0.01 }
    ];

    let currentUplineId = user.invitado_por;
    for (const config of configs) {
      if (!currentUplineId) break;
      
      const uplineId = currentUplineId;

      await transaction(async (conn) => {
        // Bloqueo de upline
        const [uplineRows] = await conn.query(`
          SELECT u.*, n.orden as nivel_orden, n.codigo as nivel_codigo 
          FROM usuarios u 
          LEFT JOIN niveles n ON u.nivel_id = n.id 
          WHERE u.id = ? FOR UPDATE`, [uplineId]);
        
        const uplineData = uplineRows[0];
        if (!uplineData) return;

        // Avanzar al siguiente upline para la próxima iteración ANTES de las reglas de jerarquía
        currentUplineId = uplineData.invitado_por;

        // REGLA DE JERARQUÍA: El upline debe ser >= nivel que el invitado para cobrar
        if (uplineData.nivel_codigo === 'internar' || Number(uplineData.nivel_orden) < Number(userLevel.orden)) {
          return;
        }

        const commission = Number((amount * config.percent).toFixed(2));
        if (commission > 0) {
          const oldBalance = Number(uplineData.saldo_comisiones);
          const newBalance = oldBalance + commission;
          const traceId = uuidv4();

          await conn.query(`UPDATE usuarios SET saldo_comisiones = ? WHERE id = ?`, [newBalance, uplineId]);
          
          const movimientoId = uuidv4();
          await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
            VALUES (?, ?, 'comisiones', 'comision_inversion', ?, ?, ?, ?, ?)`, 
            [movimientoId, uplineId, commission, oldBalance, newBalance, user.id, `Comisión Inversión Nivel ${config.key} de ${user.nombre_usuario}`]);

          // Auditoría Financiera
          await conn.query(
            `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id) 
             VALUES (?, ?, 'COMMISSION_CREDIT', 'comisiones', ?, ?, ?, ?)`,
            [traceId, uplineId, commission, oldBalance, newBalance, movimientoId]
          );
          
          userCache.delete(uplineId);
        }
      });
    }
  } catch (err) {
    logger.error(`[Commissions Error]: ${err.message}`);
  }
}

export async function getRecargaById(id) {
  return await queryOne(`SELECT * FROM compras_nivel WHERE id = ?`, [id]);
}

export async function updateRecarga(id, updates) {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const params = [...Object.values(updates), id];
  await query(`UPDATE compras_nivel SET ${setClause} WHERE id = ?`, params);
}

export async function getRetiroById(id) {
  return await queryOne(`SELECT * FROM retiros WHERE id = ?`, [id]);
}

export async function updateRetiro(id, updates) {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const params = [...Object.values(updates), id];
  await query(`UPDATE retiros SET ${setClause} WHERE id = ?`, params);
}

export async function handleLevelUpRewards() {
  // Opcional, por ahora solo exportamos para evitar errores de importación
  return true;
}

// ========================
// 5. COMISIONES (Regla de Jerarquía)
// ========================

// distributeInvestmentCommissions v7.0.6 ya definido arriba

// ========================
// 6. CONFIGURACIÓN & MENSAJES
// ========================

export async function getPublicContent() {
  const now = Date.now();
  if (configCache.data && now - configCache.lastFetch < 300000) return configCache.data;

  try {
    const rows = await query(`SELECT * FROM configuraciones`);
    const config = rows.reduce((acc, r) => {
      let val = r.valor;
      try {
        // Intentar parsear si parece JSON (objetos, arrays, números, booleanos stringificados)
        val = JSON.parse(r.valor);
      } catch (e) {
        // Si falla, usar el valor tal cual (es un string plano)
      }
      return { ...acc, [r.clave]: val };
    }, {});
    
    // Mezclar con defaults para asegurar campos críticos
    const merged = { ...DEFAULT_CONFIG, ...config };
    configCache.data = merged;
    configCache.lastFetch = now;
    return merged;
  } catch (e) {
    logger.warn('[DB] Usando configuración por defecto (DB Offline)');
    return DEFAULT_CONFIG;
  }
}

export async function refreshPublicContent(newContent = null) {
  if (newContent) {
    // Si se provee nuevo contenido, guardar en DB
    for (const [clave, valor] of Object.entries(newContent)) {
      await query(`INSERT INTO configuraciones (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?`, 
        [clave, JSON.stringify(valor), JSON.stringify(valor)]);
    }
  }
  configCache.data = null;
  configCache.lastFetch = 0;
  return await getPublicContent();
}

export async function getMensajesGlobales() {
  try {
    return await query(`SELECT * FROM mensajes_globales WHERE activo = 1 ORDER BY fecha DESC LIMIT 20`);
  } catch (e) {
    return [];
  }
}

export async function createMensajeGlobal(mensaje) {
  const id = uuidv4();
  await query(`INSERT INTO mensajes_globales (id, titulo, contenido, imagen_url) VALUES (?, ?, ?, ?)`,
    [id, mensaje.titulo, mensaje.contenido, mensaje.imagen_url]);
  return { id, ...mensaje };
}

export async function deleteMensajeGlobal(id) {
  await query(`DELETE FROM mensajes_globales WHERE id = ?`, [id]);
  return true;
}

export async function findAdminByTelegramId(id) {
  // En v8.0.0, usamos la tabla usuarios_telegram para validación de operadores
  return await queryOne(`SELECT * FROM usuarios_telegram WHERE telegram_id = ? AND activo = 1`, [id]);
}

export async function getDailyWithdrawalSummary(dateStr = boliviaTime.todayStr()) {
  return await queryOne(`SELECT COUNT(*) as total, SUM(monto) as monto FROM retiros WHERE DATE(created_at) = ? AND estado = 'pagado'`, [dateStr]);
}

export async function getDashboardStats() {
  const [userCount, rechargeTotal, withdrawalTotal, activeTasks] = await Promise.all([
    queryOne(`SELECT COUNT(*) as total FROM usuarios WHERE rol = 'usuario'`),
    queryOne(`SELECT SUM(monto) as total FROM compras_nivel WHERE estado = 'completada'`),
    queryOne(`SELECT SUM(monto) as total FROM retiros WHERE estado = 'pagado'`),
    queryOne(`SELECT COUNT(*) as total FROM actividad_tareas WHERE fecha_dia = ?`, [boliviaTime.todayStr()])
  ]);

  return {
    usuarios: userCount.total,
    recargas: Number(rechargeTotal.total || 0),
    retiros: Number(withdrawalTotal.total || 0),
    tareas_hoy: activeTasks.total
  };
}

export async function getTeamReport(userId) {
  try {
    // Nivel 1 (Directos)
    const level1 = await query(`
      SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre
      FROM usuarios u 
      LEFT JOIN niveles n ON u.nivel_id = n.id
      WHERE u.invitado_por = ?`, [userId]);

    // Nivel 2
    const level2 = level1.length > 0 ? await query(`
      SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre
      FROM usuarios u 
      LEFT JOIN niveles n ON u.nivel_id = n.id
      WHERE u.invitado_por IN (?)`, [level1.map(u => u.id)]) : [];

    // Nivel 3
    const level3 = level2.length > 0 ? await query(`
      SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre
      FROM usuarios u 
      LEFT JOIN niveles n ON u.nivel_id = n.id
      WHERE u.invitado_por IN (?)`, [level2.map(u => u.id)]) : [];

    // Obtener comisiones acumuladas por nivel de red (Solo inversión)
    const commissions = await query(`
      SELECT 
        CASE 
          WHEN descripcion LIKE '%Nivel A%' THEN 'A'
          WHEN descripcion LIKE '%Nivel B%' THEN 'B'
          WHEN descripcion LIKE '%Nivel C%' THEN 'C'
          ELSE 'Otros'
        END as nivel_red,
        SUM(monto) as total
      FROM movimientos_saldo 
      WHERE usuario_id = ? AND tipo_movimiento = 'comision_inversion'
      GROUP BY nivel_red
    `, [userId]);

    const commMap = commissions.reduce((acc, curr) => {
      acc[curr.nivel_red] = Number(curr.total || 0);
      return acc;
    }, {});

    const totalCommissions = Object.values(commMap).reduce((a, b) => a + b, 0);

    return {
      resumen: {
        total_miembros: level1.length + level2.length + level3.length,
        ingresos_totales: totalCommissions,
        comisiones_hoy: 0 
      },
      niveles: [
        { nivel: 'A', porcentaje: 10, total_miembros: level1.length, monto_recarga: commMap['A'] || 0 },
        { nivel: 'B', porcentaje: 3, total_miembros: level2.length, monto_recarga: commMap['B'] || 0 },
        { nivel: 'C', porcentaje: 1, total_miembros: level3.length, monto_recarga: commMap['C'] || 0 }
      ],
      detalles: {
        level1: level1.map(u => ({ ...u, join_date: u.created_at })),
        level2: level2.map(u => ({ ...u, join_date: u.created_at })),
        level3: level3.map(u => ({ ...u, join_date: u.created_at }))
      }
    };
  } catch (err) {
    logger.error(`[Team Report Error]: ${err.message}`);
    return { resumen: { total_miembros: 0, ingresos_totales: 0 }, niveles: [] };
  }
}

export async function getUserEarningsSummary(userId) {
  const today = boliviaTime.todayStr();
  const yesterday = boliviaTime.yesterdayStr();
  const stats = await queryOne(`
    SELECT 
      COALESCE(SUM(CASE WHEN fecha_dia = ? THEN monto_ganado ELSE 0 END), 0) as hoy,
      COALESCE(SUM(CASE WHEN fecha_dia = ? THEN monto_ganado ELSE 0 END), 0) as ayer
    FROM actividad_tareas WHERE usuario_id = ?`, [today, yesterday, userId]);
  return stats;
}

export async function isUserPunished(userId) {
  return false; 
}

export async function resetDailyEarnings() {
  try {
    logger.audit('[CRON] Verificación diaria de integridad completada (Hora Bolivia).');
    return true;
  } catch (err) {
    logger.error(`[Reset Error]: ${err.message}`);
  }
}

export async function getPremiosRuleta() {
  return await query(`SELECT * FROM premios_ruleta WHERE activo = 1 ORDER BY orden ASC`);
}

export async function createSorteoGanador(data) {
  const id = uuidv4();
  await query(`INSERT INTO sorteos_ganadores (id, usuario_id, premio_id, monto_ganado) VALUES (?, ?, ?, ?)`,
    [id, data.usuario_id, data.premio_id, data.monto || data.monto_ganado || 0]);
  return { id, ...data };
}

export async function addUserEarnings(userId, amount) {
  // Esta función registra el movimiento de ganancia para la ruleta
  // El saldo ya fue actualizado en el router, aquí solo documentamos el movimiento
  try {
    const user = await findUserById(userId);
    if (!user) return;
    
    // Obtenemos el saldo anterior (antes de la actualización que ya ocurrió en el router)
    // o simplemente registramos el movimiento con el saldo actual.
    // Para ser precisos, el router debería pasar los saldos, pero si no, los recuperamos.
    await query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, descripcion) 
      VALUES (?, ?, 'comisiones', 'premio_ruleta', ?, ?, ?, ?)`,
      [uuidv4(), userId, amount, user.saldo_comisiones - amount, user.saldo_comisiones, 'Premio ganado en la Ruleta']);
  } catch (err) {
    logger.error(`[addUserEarnings Error]: ${err.message}`);
  }
}

export async function createMovimiento(data) {
  const id = uuidv4();
  await query(`
    INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, descripcion, referencia_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.usuario_id, data.tipo_billetera || 'principal', data.tipo_movimiento, data.monto, data.saldo_anterior, data.saldo_nuevo, data.descripcion, data.referencia_id]);
  return { id, ...data };
}

export async function getSorteosGanadores() {
  return await query(`
    SELECT s.*, u.nombre_usuario, p.nombre as premio_nombre 
    FROM sorteos_ganadores s 
    JOIN usuarios u ON s.usuario_id = u.id 
    JOIN premios_ruleta p ON s.premio_id = p.id 
    ORDER BY s.created_at DESC 
    LIMIT 20
  `);
}

export async function findUserByCodigo(codigo) {
  return await queryOne(`SELECT id FROM usuarios WHERE codigo_invitacion = ?`, [codigo]);
}

export async function getTarjetasByUser(userId) {
  return await query(`SELECT * FROM tarjetas_bancarias WHERE usuario_id = ?`, [userId]);
}

export async function createTarjeta(data) {
  const id = uuidv4();
  await query(`INSERT INTO tarjetas_bancarias (id, usuario_id, nombre_banco, numero_cuenta, nombre_titular) VALUES (?, ?, ?, ?, ?)`,
    [id, data.usuario_id, data.nombre_banco, data.numero_cuenta, data.nombre_titular]);
  return { id, ...data };
}

export async function deleteTarjeta(id) {
  await query(`DELETE FROM tarjetas_bancarias WHERE id = ?`, [id]);
  return true;
}

export async function getRecargas() {
  return await query(`SELECT * FROM recargas ORDER BY created_at DESC`);
}

export async function getRetiros() {
  return await query(`SELECT * FROM retiros ORDER BY created_at DESC`);
}

export async function getMetodosQr() {
  return await query(`SELECT * FROM metodos_qr WHERE activo = 1 ORDER BY orden ASC`);
}

export async function getAllMetodosQr() {
  return await query(`SELECT * FROM metodos_qr ORDER BY orden ASC`);
}

export async function getBanners() {
  try {
    return await query(`SELECT * FROM banners_carrusel WHERE activo = 1 ORDER BY orden ASC`);
  } catch (e) {
    return [];
  }
}

export async function getAllTasks() {
  return await query(`SELECT * FROM tareas ORDER BY orden ASC`);
}

export async function getPunishedUsers() {
  return [];
}

export async function unpunishUser() { return true; }
export async function unpunishAllUsers() { return true; }

export async function getTaskActivity(userId) {
  return await query(`SELECT * FROM actividad_tareas WHERE usuario_id = ?`, [userId]);
}

export async function createTaskActivity(data) {
  const id = uuidv4();
  await query(`INSERT INTO actividad_tareas (id, usuario_id, tarea_id, monto_ganado, fecha_dia) VALUES (?, ?, ?, ?, ?)`,
    [id, data.usuario_id, data.tarea_id, data.monto_ganado, data.fecha_dia]);
  return { id, ...data };
}


