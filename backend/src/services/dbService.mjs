import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { query, queryOne, transaction } from '../config/db.mjs';
import logger from '../utils/logger.mjs';
import * as boliviaTimeHelper from '../utils/boliviaTime.mjs';
import { validatePasanteWithdrawalRules, validateRequiredWithdrawalQrImage } from '../utils/withdrawalRules.mjs';
import redis from './redisService.mjs';
import { emitToAll, emitToUser } from './socketService.mjs';
import { deleteLocalFile, readLocalFileBuffer } from '../utils/fileStorage.mjs';
import { sendToAdmin, sendToRetiros, formatRetiroMessage, formatRetiroMessageAprobado, formatRetiroMessageRechazado, formatRecargaMessageAprobada, formatRecargaMessageRechazada } from './telegramBot.mjs';

// Re-exportar utilidades de base de datos para evitar SyntaxErrors en imports delegados
export { query, queryOne, transaction, deleteNonAdminUsers };

/**
 * @section AUDITORÍA SENIOR v12.0.0 - CACHÉ DISTRIBUIDA (REDIS)
 */
const REDIS_TTL = 3600; // 1 hora de caché por defecto
const CONFIG_KEY = 'global:config';
const LEVELS_KEY = 'global:levels';

// Caché local de fallback rápido (L1 Cache)
const userCache = new Map();
const USER_CACHE_TTL = 10000; // 10 segundos
const levelsCache = { data: null, lastFetch: 0 };
const configCache = { data: null, lastFetch: 0 };
const withdrawalExpiryState = { lastRunDate: null };
const operationalAuditSchemaCache = { mode: null };

const reportWithdrawalQrDebug = (hypothesisId, location, msg, data = {}) => {
  let debugServerUrl = 'http://127.0.0.1:7777/event';
  let sessionId = 'withdrawal-qr-telegram';
  try {
    const env = fs.readFileSync(`${process.cwd()}\\.dbg\\withdrawal-qr-telegram.env`, 'utf8');
    debugServerUrl = env.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || debugServerUrl;
    sessionId = env.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || sessionId;
  } catch {}
  fetch(debugServerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, runId: 'pre-fix', hypothesisId, location, msg, data, ts: Date.now() })
  }).catch(() => {});
};

async function getOperationalAuditMode(conn) {
  if (operationalAuditSchemaCache.mode) return operationalAuditSchemaCache.mode;

  const [rows] = await conn.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'auditoria_operativa'`
  );

  const columns = new Set(rows.map((row) => row.COLUMN_NAME));
  operationalAuditSchemaCache.mode = columns.has('trace_id') && columns.has('operacion') ? 'modern' : 'legacy';
  return operationalAuditSchemaCache.mode;
}

async function insertOperationalAudit(conn, {
  traceId,
  usuarioId,
  operacion,
  estadoAnterior = null,
  estadoNuevo = null,
  motivo = null,
  metadata = null,
  procesadoPor = null
}) {
  const mode = await getOperationalAuditMode(conn);

  if (mode === 'modern') {
    await conn.query(
      `INSERT INTO auditoria_operativa (
        trace_id, usuario_id, operacion, estado_anterior, estado_nuevo, motivo, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [traceId, usuarioId, operacion, estadoAnterior, estadoNuevo, motivo, metadata ? JSON.stringify(metadata) : null]
    );
    return;
  }

  const legacyMotivo = motivo || (metadata ? JSON.stringify(metadata) : null);
  await conn.query(
    `INSERT INTO auditoria_operativa (
      id, usuario_id, tipo_operacion, estado_anterior, estado_nuevo, motivo, procesado_por
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), usuarioId, operacion, estadoAnterior, estadoNuevo, legacyMotivo, procesadoPor]
  );
}

const DEFAULT_CONFIG = {
  task_allowed_days: '1,2,3,4,5',
  comision_retiro: 10,
  horario_recarga: { enabled: true, hora_inicio: '10:00', hora_fin: '18:00', dias_semana: [1,2,3,4,5] },
  horario_retiro: { enabled: true, hora_inicio: '10:00', hora_fin: '18:00', dias_semana: [1,2,3,4,5] },
  restricciones_horario_activas: false,
  marquee_text: 'Bienvenido a BCB Global Institutional — Inversión Publicitaria Líder en Bolivia',
  soporte_canal_url: 'https://t.me/bcb_bolivia_oficial',
  soporte_gerente_url: 'https://wa.me/59190000000',
  soporte_bot_url: '',
  ruleta_activa: true,
  recompensas_visibles: true,
  banners: [],
  bloquear_niveles_superiores_enabled: true,
  mensaje_niveles_superiores: 'Niveles disponibles solamente para líderes',
  nivel_minimo_lider: 4 // orden del nivel mínimo para acceder a niveles superiores (GLOBAL4 es orden 4)
};

const DEFAULT_LEVELS = [
  { id: 'l1', codigo: 'internar', nombre: 'Interno', deposito: 0, num_tareas_diarias: 3, ganancia_tarea: 1.00, orden: 0, activo: 1 },
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
    return boliviaTimeHelper.getBoliviaNow(date);
  },
  todayStr: (date = new Date()) => {
    return boliviaTimeHelper.getBoliviaDateKey(date);
  },
  yesterdayStr: (date = new Date()) => {
    const d = boliviaTimeHelper.getBoliviaNow(date);
    d.setUTCDate(d.getUTCDate() - 1);
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
    return boliviaTimeHelper.getBoliviaDayOfWeek(date);
  },
  getDayName: (date = new Date()) => {
    return boliviaTimeHelper.getBoliviaDayName(date);
  },
  isTimeInWindow: (timeStr, start = '00:00', end = '23:59') => {
    return boliviaTimeHelper.isTimeInWindow(timeStr, start, end);
  }
};

// Alias para compatibilidad hacia atrás
export const peruTime = boliviaTime;

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
        await getGlobalContent();
    logger.info('[CACHE] Configuración global cargada.');
  } catch (err) {
    logger.error('[CACHE-ERROR] Fallo al pre-cargar configuración:', err.message);
    configCache.data = DEFAULT_CONFIG; // Fallback
  }
}

/**
 * Obtiene el estado operativo para una fecha específica
 */
export async function getDayStatus(dateStr = peruTime.todayStr()) {
  try {
    const day = await queryOne(`SELECT * FROM calendario_operativo WHERE fecha = ?`, [dateStr]);
    
    // Obtenemos el día de la semana de forma segura en UTC para comparar
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = dateObj.getUTCDay(); // 0=Dom, 1=Lun...

    // Reglas Base (Si no hay registro en el calendario)
    const status = day || {
      fecha: dateStr,
      tipo_dia: 'laboral',
      es_feriado: 0,
      tareas_habilitadas: 1, 
      retiros_habilitados: 1,
      recargas_habilitadas: 1,
      motivo: null,
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
export async function canPerformTasks(userId, dateStr = peruTime.todayStr()) {
  try {
    const status = await getDayStatus(dateStr);
    
    // REGLA DOMINICAL AUTOMÁTICA (v14.0.0)
    const today = peruTime.getDay();
    if (today === 0) { // 0 = Domingo
      return { ok: false, message: 'DOMINGO DE DESCANSO: Hoy no hay tareas disponibles. En BCB Global también valoramos el descanso. Aprovecha este día para compartir con tu familia y disfrutar de un lindo domingo. Las tareas volverán a estar disponibles mañana.' };
    }

    if (status && !status.tareas_habilitadas) {
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
export async function canRecharge(userId, dateStr = peruTime.todayStr()) {
  const status = await getDayStatus(dateStr);
  if (!status) return { ok: true };

  if (!status.recargas_habilitadas) {
    return { ok: false, message: status.motivo || 'Las recargas están suspendidas temporalmente por administración.' };
  }

  const user = await findUserById(userId);
  if (!user) return { ok: false, message: 'Usuario no encontrado.' };
  if (user.bloqueado) return { ok: false, message: 'Tu cuenta ha sido bloqueada.' };

  // 2. Regla de Horario y Días (Config Global)
  const config = await getGlobalContent();
  const time = peruTime.getTimeString();
  const today = peruTime.getDay();

  let schedule = DEFAULT_CONFIG.horario_recarga;
  if (config.horario_recarga) {
    schedule = typeof config.horario_recarga === 'string' ? JSON.parse(config.horario_recarga) : config.horario_recarga;
  }

  if (schedule.enabled) {
    const isAllowedDay = Array.isArray(schedule.dias_semana) && schedule.dias_semana.includes(today);
    if (!isAllowedDay) {
      return { ok: false, message: 'Las recargas no están disponibles el día de hoy.' };
    }
    if (!peruTime.isTimeInWindow(time, schedule.hora_inicio, schedule.hora_fin)) {
      return { ok: false, message: `El horario de recargas es de ${schedule.hora_inicio} a ${schedule.hora_fin} (Hora Bolivia).` };
    }
  }

  return { ok: true };
}

export async function canWithdraw(userId, dateStr = peruTime.todayStr()) {
  const status = await getDayStatus(dateStr);
  if (!status) return { ok: true };

  if (!status.retiros_habilitados) {
    return { ok: false, message: status.motivo || 'Los retiros están suspendidos temporalmente por administración.' };
  }

  const user = await findUserById(userId);
  if (!user) return { ok: false, message: 'Usuario no encontrado.' };
  if (user.bloqueado) return { ok: false, message: 'Tu cuenta ha sido bloqueada. Contacta a soporte.' };

  // Check if user was blocked due to rejected withdrawal
  if (user.ultima_rechazo_retiro) {
    const lastRejectDateKey = peruTime.getDateString(user.ultima_rechazo_retiro);
    if (lastRejectDateKey === dateStr) {
      return { ok: false, message: 'Tu retiro anterior fue rechazado. No puedes solicitar retiros hasta mañana.' };
    }
  }

  const levels = await getLevels();
  const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));
  
  if (!userLevel) {
    return { ok: false, message: 'Nivel de usuario no encontrado.' };
  }

  // Validar límite de retiros de pasantía por patrocinador (MÓDULO 8)
  if (userLevel.codigo === 'internar' || userLevel.codigo === 'pasantia') {
    const diasPasantiaCompletos = await getCompletedInternshipDays(userId, Number(userLevel.num_tareas_diarias || 0));
    if (diasPasantiaCompletos < 4) {
      return { ok: false, message: `Debes completar los 4 dias de pasantia antes de solicitar tu retiro. Dias completados: ${diasPasantiaCompletos}/4.` };
    }

    if (!user.invitado_por) {
      return { ok: false, message: 'No puedes realizar retiros sin un patrocinador asignado.' };
    }

    const limitePatrocinador = await queryOne(`
      SELECT total_aprobados, maximo_por_patrocinador FROM limites_retiros_pasantia
      WHERE patrocinador_id = ?
    `, [user.invitado_por]);

    if (limitePatrocinador && limitePatrocinador.total_aprobados >= limitePatrocinador.maximo_por_patrocinador) {
      return { ok: false, message: 'Tu patrocinador ya alcanzó el límite de 15 retiros autorizados para usuarios de Pasantía.' };
    }
  }

  // 1. Regla de Horario y Días (Config Global)
  const config = await getGlobalContent();
  const time = peruTime.getTimeString();
  const today = peruTime.getDay();

  let schedule = DEFAULT_CONFIG.horario_retiro;
  if (config.horario_retiro) {
    schedule = typeof config.horario_retiro === 'string' ? JSON.parse(config.horario_retiro) : config.horario_retiro;
  }

  // --- VALIDACIÓN DE DÍAS: Lunes a Sábado ---
  const globalAllowedDays = [1, 2, 3, 4, 5, 6];
  const isAllowedDay = globalAllowedDays.includes(today);

  if (!isAllowedDay) {
    return { ok: false, message: 'Los retiros están disponibles de Lunes a Sábado.' };
  }

  if (schedule.enabled && !peruTime.isTimeInWindow(time, schedule.hora_inicio, schedule.hora_fin)) {
    return { ok: false, message: `El horario de retiros es de ${schedule.hora_inicio} a ${schedule.hora_fin} (Hora Bolivia).` };
  }

  return { ok: true };
}

export async function getCompletedInternshipDays(userId, requiredTasksPerDay = 3) {
  const minimumTasks = Math.max(1, Number(requiredTasksPerDay || 0));
  const result = await queryOne(`
    SELECT COUNT(*) as total
    FROM (
      SELECT fecha_dia
      FROM actividad_tareas
      WHERE usuario_id = ?
      GROUP BY fecha_dia
      HAVING COUNT(*) >= ?
    ) dias_completos
  `, [userId, minimumTasks]);

  return Number(result?.total || 0);
}

// ========================
// 1. USUARIOS & AUTH
// ========================

const USER_FIELDS = `id, tenant_id, telefono, nombre_usuario, nombre_real, codigo_invitacion, invitado_por, nivel_id, avatar_url, saldo_principal, saldo_comisiones, rol, bloqueado, tickets_ruleta, primer_ascenso_completado, last_device_id, grado_colaborador, salario_colaborador, created_at`;

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
 * Acepta: 900000001, 51900000001, +51900000001
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
  
  // 3. Lógica específica para Perú (+51) y Bolivia (+591)
  // Si tiene 9 dígitos, es el número base de Perú
  if (clean.length === 9) {
    variations.add(`51${clean}`);
    variations.add(`+51${clean}`);
  } 
  // Si tiene 8 dígitos, es el número base de Bolivia
  else if (clean.length === 8) {
    variations.add(`591${clean}`);
    variations.add(`+591${clean}`);
  }
  // Si tiene 11 dígitos y empieza con 51 (Perú)
  else if (clean.length === 11 && clean.startsWith('51')) {
    const core = clean.substring(2);
    variations.add(core);
    variations.add(`+${clean}`);
  }
  // Si tiene 11 dígitos y empieza con 591 (Bolivia - Caso especial 3 + 8)
  else if (clean.length === 11 && clean.startsWith('591')) {
    const core = clean.substring(3);
    variations.add(core);
    variations.add(`+${clean}`);
  }
  // Si tiene 12 dígitos y empieza con +51
  else if (raw.startsWith('+51') && clean.length === 11) {
    const core = clean.substring(2);
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
 * Obtiene el formato canónico para guardar en DB (siempre +51XXXXXXXXX)
 */
export function getCanonicalTelefono(tel) {
  const clean = String(tel).replace(/\D/g, '');
  if (clean.length === 9) return `+51${clean}`;
  if (clean.length === 8) return `+591${clean}`;
  if (clean.length === 11 && clean.startsWith('51')) return `+${clean}`;
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

async function deleteNonAdminUsers() {
  logger.warn('[DB] Deleting all non-admin users...');
  const result = await query(`DELETE FROM usuarios WHERE rol != 'admin'`);
  logger.warn(`[DB] Deleted ${result.affectedRows} non-admin users.`);
  return result.affectedRows;
}

// ========================
// 2. NIVELES
// ========================

export async function getLevels() {
  const now = Date.now();
  // 1. L1 Cache (1 min)
  if (levelsCache.data && now - levelsCache.lastFetch < 60000) {
    return levelsCache.data;
  }

  try {
    // 2. L2 Cache (Redis)
    const cached = await redis.get(LEVELS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      levelsCache.data = parsed;
      levelsCache.lastFetch = now;
      return parsed;
    }

    // 3. DB Fallback
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

    // Guardar en Redis y L1 Cache
    await redis.set(LEVELS_KEY, JSON.stringify(processed), 'EX', REDIS_TTL);
    levelsCache.data = processed;
    levelsCache.lastFetch = now;
    
    return processed;
  } catch (err) {
    logger.error('[DB-LEVELS] Fallo:', err.message);
    return levelsCache.data || DEFAULT_LEVELS;
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
  const todayPeru = peruTime.todayStr();
  
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
      [userId, todayPeru]
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
    
    // Notificación en tiempo real v12.0.0
    emitToUser(userId, 'balance:updated', { 
      tipo_billetera: 'principal', 
      nuevo_saldo: newBalance,
      monto: amount,
      operacion
    });
    
    const activityId = uuidv4();
    try {
      await conn.query(
        'INSERT INTO actividad_tareas (id, usuario_id, tarea_id, monto_ganado, fecha_dia) VALUES (?, ?, ?, ?, ?)',
        [activityId, userId, taskId, amount, todayPeru]
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
     VALUES (?, ?, ?, ?, ?, 'Verificando')`,
    [id, userId, nivelId, monto, comprobanteUrl]
  );
  return { id, status: 'Verificando' };
}

/**
 * Solicitar Retiro con Blindaje Extremo (Nivel Senior):
 * 1. Idempotencia en DB (No Redis).
 * 2. Bloqueo Pesimista (SELECT FOR UPDATE).
 * 3. Validación de 1 Retiro/Día usando Timezone Bolivia (America/La_Paz).
 * 4. Auditoría Forense Atómica.
 */
export async function requestWithdrawal(userId, { monto, tipo_billetera, tarjeta_id, idempotencyKey, comprobante_url = null }) {
  const traceId = uuidv4();
  const operacion = 'WITHDRAW_REQUEST';
  // #region debug-point B:dbservice-request-input
  reportWithdrawalQrDebug('B', 'dbService.mjs:826', '[DEBUG] requestWithdrawal input', {
    userId,
    tipoBilletera: tipo_billetera,
    hasComprobanteUrl: !!comprobante_url,
    comprobanteUrl: comprobante_url || null
  });
  // #endregion

  const qrValidation = validateRequiredWithdrawalQrImage(comprobante_url);
  if (!qrValidation.ok) {
    throw new Error(qrValidation.message);
  }

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
      `SELECT id, ${balanceField} as balance, nivel_id, invitado_por FROM usuarios WHERE id = ? FOR UPDATE`, 
      [userId]
    );
    const user = userRows[0];
    if (!user) throw new Error('Usuario no encontrado');

    const m = Number(monto);
    const oldBalance = Number(user.balance);

    // 2. BLINDAJE 1 RETIRO/DIA: validar por periodo calendario Bolivia, no por 24 horas.
    const withdrawalWindow = boliviaTimeHelper.getBoliviaWithdrawalDayWindow();
    const withdrawalDateKey = withdrawalWindow.dateKey;

    const [withdrawCount] = await conn.query(
      `SELECT COUNT(*) as total FROM retiros 
       WHERE usuario_id = ? 
       AND fecha_dia = ? FOR UPDATE`,
      [userId, withdrawalDateKey]
    );

    const retirosHoy = withdrawCount[0].total;
    logger.info(`[WITHDRAWAL DAILY LIMIT] usuario_id=${userId} fecha_dia=${withdrawalDateKey} ventana=${withdrawalWindow.startsAt}..${withdrawalWindow.endsAt} retiros_periodo=${retirosHoy}`);
    
    if (retirosHoy > 0) {
      throw new Error(`Ya realizaste una solicitud de retiro en el periodo actual (${withdrawalDateKey}, hora Bolivia). Puedes volver a solicitar despues del reinicio diario de las 23:59.`);
    }

    // 3. VALIDAR MONTO POR NIVEL
    const [levelRows] = await conn.query('SELECT * FROM niveles WHERE id = ? FOR UPDATE', [user.nivel_id]);
    const level = levelRows[0];
    if (!level) throw new Error('Nivel de usuario no encontrado');

    const levelCode = String(level?.codigo || '').toLowerCase();
    const isPasante = levelCode === 'internar' || levelCode === 'pasantia';
    let montoFinal = m;
    if (isPasante) {
      const completedInternshipDays = await getCompletedInternshipDays(userId, Number(level.num_tareas_diarias || 0));
      const pasanteValidation = validatePasanteWithdrawalRules({
        requestedAmount: m,
        balance: oldBalance,
        completedInternshipDays,
        requiredInternshipDays: 4,
        requiredAmount: 10
      });
      if (!pasanteValidation.ok) {
        throw new Error(pasanteValidation.message);
      }
      montoFinal = pasanteValidation.amount;
    } else {
      // Global 1 o superior: mínimo 20 Bs
      if (m < 20) {
        throw new Error('Los retiros para niveles Global 1 en adelante deben ser de al menos 20 Bs.');
      }
      if (oldBalance < m) throw new Error('Saldo insuficiente para realizar el retiro');
    }

    // 4. DESCONTAR SALDO (ACID)
    const newBalance = oldBalance - montoFinal;
    await conn.query(`UPDATE usuarios SET ${balanceField} = ? WHERE id = ?`, [newBalance, userId]);

    // Notificación en tiempo real v12.0.0
    emitToUser(userId, 'balance:updated', { 
      tipo_billetera, 
      nuevo_saldo: newBalance,
      monto: -montoFinal,
      operacion
    });

    // 5. CREAR REGISTRO DE RETIRO
    const retiroId = uuidv4();
    const montoSolicitado = montoFinal;
    
    // v12.7.0: Obtener comisiones desde la configuración global
    const config = await getGlobalContent();
    const pctRetiro = isPasante ? 0 : (Number(config.comision_retiro || 10) / 100); // 0% comision para pasantes, 10% para VIP

    const comisionTotal = +(montoSolicitado * pctRetiro).toFixed(2);
    const montoNeto = +(montoSolicitado - comisionTotal).toFixed(2);
    const comisionOperador = 0;
    const comisionRetiro = comisionTotal;

    const [tarjetas] = await conn.query(
      `SELECT * FROM tarjetas_bancarias WHERE id = ? AND usuario_id = ? FOR UPDATE`, 
      [tarjeta_id, userId]
    );
    if (tarjetas.length === 0) throw new Error('Tarjeta bancaria no válida o no pertenece al usuario');

    // Se guardan columnas detalladas de comisión para auditoría v12.1.0
    // Check if user is pasante to set correct state
    const initialState = isPasante && user.invitado_por ? 'Pendiente_Patrocinador' : 'Verificando';
    // #region debug-point B:dbservice-before-insert
    reportWithdrawalQrDebug('B', 'dbService.mjs:922', '[DEBUG] requestWithdrawal before insert', {
      retiroId,
      userId,
      initialState,
      isPasante,
      hasComprobanteUrl: !!comprobante_url,
      comprobanteUrl: comprobante_url || null
    });
    // #endregion
    
    await conn.query(
      `INSERT INTO retiros (
        id, usuario_id, monto, monto_neto, comision_aplicada, 
        comision_operador, comision_retiro, comision_total,
        tipo_billetera, estado, datos_bancarios, cuenta_bancaria_id, comprobante_url,
        password_fondo_validado, fecha_dia, patrocinador_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        retiroId, userId, montoSolicitado, montoNeto, comisionTotal, 
        comisionOperador, comisionRetiro, comisionTotal,
        tipo_billetera, initialState, JSON.stringify(tarjetas[0]), tarjeta_id, comprobante_url,
        withdrawalDateKey, user.invitado_por || null
      ]
    );
    // #region debug-point B:dbservice-after-insert
    reportWithdrawalQrDebug('B', 'dbService.mjs:940', '[DEBUG] requestWithdrawal inserted retiro', {
      retiroId,
      userId,
      storedComprobanteUrl: comprobante_url || null
    });
    // #endregion

    // 6. MOVIMIENTO Y AUDITORÍA FORENSE
    const movimientoId = uuidv4();
    await conn.query(
      `INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
       VALUES (?, ?, ?, 'retiro', ?, ?, ?, ?, ?)`,
      [movimientoId, userId, tipo_billetera, -montoFinal, oldBalance, newBalance, retiroId, 'Solicitud de retiro']
    );

    await conn.query(
      `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [traceId, userId, operacion, tipo_billetera, montoFinal, oldBalance, newBalance, retiroId]
    );

    userCache.delete(userId);

    const res = { success: true, retiroId, traceId, message: 'Retiro procesado correctamente. Por favor, verifica que el QR coincida con el número de cuenta, de lo contrario el retiro será rechazado.' };

    // 7. REGISTRAR IDEMPOTENCIA EN DB (Final de la transacción)
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
 * 2. Validación de Estado 'Verificando'. * 3. Actualización Atómica.
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
    if (compra.estado !== 'Verificando') throw new Error(`La orden ya se encuentra en estado: ${compra.estado}`);

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

    // 4. OTORGAR TICKETS AL INVITADOR USANDO EL SISTEMA AUTOMÁTICO
    let resultadoTickets = null;
    if (user.invitado_por) {
      // Llamamos a la función que crea los tickets, historial y actualiza todo
      resultadoTickets = await giveTicketsPorAscensoInvitado(
        user.invitado_por, 
        compra.usuario_id, 
        targetLevel.codigo, 
        conn
      );
    }

    // Notificación en tiempo real al usuario que ascendió
    emitToUser(compra.usuario_id, 'user:level_up', { 
      nuevo_nivel: targetLevel.nombre,
      tickets_ganados: ticketsToAdd,
      operacion
    });

    await conn.query(
      `UPDATE compras_nivel SET estado = 'Aceptado', estado_operativo = 'Aceptado', procesado_por = ?, procesado_at = NOW() WHERE id = ?`, 
      [adminId, compraId]
    );

    // 4. AUDITORÍA
    await conn.query(
      `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id, metadata) 
       VALUES (?, ?, ?, 'principal', ?, ?, ?, ?, ?)`,
      [traceId, compra.usuario_id, operacion, compra.monto, Number(user.saldo_principal), Number(user.saldo_principal), compraId, JSON.stringify({ old_level: user.nivel_id, new_level: targetLevel.id })]
    );

    userCache.delete(compra.usuario_id);

    const res = { 
      success: true, 
      traceId, 
      message: `Ascenso a ${targetLevel.nombre} completado`, 
      ticketsInvitador: resultadoTickets,
      usuarioId: compra.usuario_id,
      nivelId: targetLevel.id
    };

    // Notificar por Telegram
    const adminUser = await queryOne(`SELECT nombre_usuario FROM usuarios WHERE id = ?`, [adminId]);
    const message = formatRecargaMessageAprobada({ 
      procesado_por: adminUser?.nombre_usuario || 'Administrador', 
      hora: peruTime.getTimeString() 
    });
    sendToAdmin(message);
    
    if (idempotencyKey) {
      await conn.query(
        'INSERT INTO idempotencia (idempotency_key, response_body, operacion, usuario_id) VALUES (?, ?, ?, ?)', 
        [idempotencyKey, JSON.stringify(res), operacion, adminId]
      );
    }

    return res;
  }).then(async (result) => {
    // Después de la transacción, creamos la notificación para el invitador (si aplica)
    if (result.ticketsInvitador && result.ticketsInvitador.cantidadTickets > 0) {
      // Obtenemos la información del usuario y el nivel
      const [userCompraRows] = await query(`SELECT * FROM usuarios WHERE id = ?`, [result.usuarioId]);
      const userCompra = userCompraRows?.[0];
      
      if (userCompra && userCompra.invitado_por) {
        const [levelInfo] = await query(`
          SELECT nombre FROM niveles WHERE codigo = ?
        `, [result.ticketsInvitador.nivelAlcanzado]);
        const nombreNivel = levelInfo?.nombre || result.ticketsInvitador.nivelAlcanzado;
        
        const tituloNotificacion = '¡Felicidades!';
        const mensajeNotificacion = `Has recibido ${result.ticketsInvitador.cantidadTickets} Ticket${result.ticketsInvitador.cantidadTickets > 1 ? 's' : ''} de Sorteo porque tu invitado ascendió a ${nombreNivel}.`;
        await createNotification(userCompra.invitado_por, tituloNotificacion, mensajeNotificacion);
      }
    }
    
    return result;
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
       WHERE usuario_id = ? AND nivel_id = ? AND estado = 'Aceptado' AND reembolsado = 0 
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
 * 2. Validación de Estado 'Verificando'. * 3. Auditoría de finalización.
 */
export async function sponsorApproveRetiro(retiroId, sponsorId, idempotencyKey = null) {
  const traceId = uuidv4();
  const operacion = 'SPONSOR_WITHDRAW_APPROVE';

  return await transaction(async (conn) => {
    // 0. Idempotencia
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
    if (retiro.estado !== 'Pendiente_Patrocinador') throw new Error(`El retiro ya se encuentra en estado: ${retiro.estado}`);
    if (retiro.patrocinador_id !== sponsorId) throw new Error('No eres el patrocinador de este retiro');

    // 2. Check límite de retiros para patrocinador
    // Ensure limites_retiros_pasantia row exists
    await conn.query(
      `INSERT INTO limites_retiros_pasantia (id, patrocinador_id) VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE patrocinador_id = patrocinador_id`,
      [uuidv4(), sponsorId]
    );

    const [limiteRows] = await conn.query(
      `SELECT * FROM limites_retiros_pasantia WHERE patrocinador_id = ? FOR UPDATE`, 
      [sponsorId]
    );
    const limite = limiteRows[0];
    if (limite.total_aprobados >= limite.maximo_por_patrocinador) {
      throw new Error('Ya alcanzaste el límite de 15 retiros autorizados para usuarios de Pasantía');
    }

    // 3. Incrementar contador
    await conn.query(
      `UPDATE limites_retiros_pasantia SET total_aprobados = total_aprobados + 1 WHERE patrocinador_id = ?`,
      [sponsorId]
    );

    // 4. Actualizar retiro
    await conn.query(
      `UPDATE retiros SET 
        estado = 'Verificando', 
        procesado_por_patrocinador = ?, 
        procesado_por_patrocinador_at = NOW() 
      WHERE id = ?`, 
      [sponsorId, retiroId]
    );

    const [userRows] = await conn.query(
      `SELECT u.nombre_usuario, u.telefono, n.nombre AS nivel_nombre
       FROM usuarios u
       LEFT JOIN niveles n ON u.nivel_id = n.id
       WHERE u.id = ?`,
      [retiro.usuario_id]
    );
    const retiroUser = userRows[0] || {};

    const [cardRows] = await conn.query(
      `SELECT nombre_banco, numero_cuenta, nombre_titular
       FROM tarjetas_bancarias
       WHERE id = ?`,
      [retiro.cuenta_bancaria_id]
    );
    const retiroCard = cardRows[0] || {};

    const config = await getGlobalContent();
    const adminMessage = formatRetiroMessage({
      id: retiro.id,
      telefono: retiroUser.telefono,
      nombre_usuario: retiroUser.nombre_usuario,
      nivel: retiroUser.nivel_nombre || 'Usuario',
      monto: retiro.monto,
      banco: retiroCard.nombre_banco,
      cuenta: retiroCard.numero_cuenta,
      nombre_titular: retiroCard.nombre_titular,
      hora: peruTime.getTimeString()
    }, config.comision_retiro);

    // 5. Auditoría
    await insertOperationalAudit(conn, {
      traceId,
      usuarioId: sponsorId,
      operacion,
      estadoAnterior: 'Pendiente_Patrocinador',
      estadoNuevo: 'Verificando',
      metadata: { retiro_id: retiroId }
    });

    let qrBuffer = null;
    if (retiro.comprobante_url) {
      try {
        qrBuffer = await readLocalFileBuffer(retiro.comprobante_url);
      } catch (err) {
        logger.warn(`[WITHDRAW_SPONSOR_APPROVE] No se pudo leer QR ${retiro.comprobante_url}: ${err.message}`);
      }
    }
    const telegramOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📝 Tomar Caso", callback_data: `retiro_tomar_${retiro.id}` }
          ]
        ]
      },
      ...(qrBuffer ? { photo: qrBuffer } : {})
    };

    sendToRetiros(adminMessage, telegramOptions);

    const res = { success: true, traceId, message: 'Retiro aprobado por patrocinador, enviado a administrador' };

    if (idempotencyKey) {
      await conn.query(
        'INSERT INTO idempotencia (idempotency_key, response_body, operacion, usuario_id) VALUES (?, ?, ?, ?)', 
        [idempotencyKey, JSON.stringify(res), operacion, sponsorId]
      );
    }

    return res;
  });
}

export async function sponsorRejectRetiro(retiroId, sponsorId, motivo, idempotencyKey = null) {
  const traceId = uuidv4();
  const operacion = 'SPONSOR_WITHDRAW_REJECT';

  return await transaction(async (conn) => {
    // 0. Idempotencia
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
    if (retiro.estado !== 'Pendiente_Patrocinador') throw new Error(`El retiro ya se encuentra en estado: ${retiro.estado}`);
    if (retiro.patrocinador_id !== sponsorId) throw new Error('No eres el patrocinador de este retiro');

    // 2. LOCK USER for refund
    const balanceField = retiro.tipo_billetera === 'comisiones' ? 'saldo_comisiones' : 'saldo_principal';
    const [userRows] = await conn.query(
      `SELECT * FROM usuarios WHERE id = ? FOR UPDATE`, 
      [retiro.usuario_id]
    );
    const user = userRows[0];

    // 3. Refund
    await conn.query(
      `UPDATE usuarios SET ${balanceField} = ${balanceField} + ? WHERE id = ?`,
      [retiro.monto, retiro.usuario_id]
    );

    // 4. Update retiro
    await conn.query(
      `UPDATE retiros SET 
        estado = 'Rechazado', 
        admin_notas = ?,
        procesado_por_patrocinador = ?, 
        procesado_por_patrocinador_at = NOW() 
      WHERE id = ?`, 
      [motivo, sponsorId, retiroId]
    );

    // 5. Create movimiento_saldo for refund
    const movimientoId = uuidv4();
    await conn.query(
      `INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
       VALUES (?, ?, ?, 'reembolso_retiro', ?, ?, ?, ?, ?)`,
      [movimientoId, retiro.usuario_id, retiro.tipo_billetera, retiro.monto, Number(user[balanceField]), Number(user[balanceField]) + Number(retiro.monto), retiroId, 'Reembolso por retiro rechazado por patrocinador']
    );

    // 6. Auditoría
    await insertOperationalAudit(conn, {
      traceId,
      usuarioId: sponsorId,
      operacion,
      estadoAnterior: 'Pendiente_Patrocinador',
      estadoNuevo: 'Rechazado',
      motivo,
      metadata: { retiro_id: retiroId }
    });

    const res = { success: true, traceId, message: 'Retiro rechazado y saldo reembolsado' };

    if (idempotencyKey) {
      await conn.query(
        'INSERT INTO idempotencia (idempotency_key, response_body, operacion, usuario_id) VALUES (?, ?, ?, ?)', 
        [idempotencyKey, JSON.stringify(res), operacion, sponsorId]
      );
    }

    return res;
  });
}

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
    if (retiro.estado !== 'Verificando') throw new Error(`El retiro ya se encuentra en estado: ${retiro.estado}`);

    // 2. ELIMINAR ARCHIVO QR SI EXISTE
    if (retiro.comprobante_url) {
      try {
        await deleteLocalFile(retiro.comprobante_url);
        logger.info(`[WITHDRAW_APPROVE] Archivo QR eliminado: ${retiro.comprobante_url}`);
      } catch (err) {
        logger.warn(`[WITHDRAW_APPROVE] No se pudo eliminar el archivo QR: ${err.message}`);
      }
    }

    // 3. ACTUALIZACIÓN ATÓMICA
    await conn.query(
      `UPDATE retiros SET estado = 'Aceptado', procesado_por = ?, procesado_at = NOW() WHERE id = ?`, 
      [adminId, retiroId]
    );

    // 4. AUDITORÍA (El saldo ya fue descontado al solicitar)
    await conn.query(
      `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id) 
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [traceId, retiro.usuario_id, operacion, retiro.tipo_billetera, retiro.monto, retiroId]
    );

    await insertOperationalAudit(conn, {
      traceId: uuidv4(),
      usuarioId: adminId,
      operacion: 'ADMIN_WITHDRAW_APPROVE',
      estadoAnterior: 'Verificando',
      estadoNuevo: 'Aceptado',
      metadata: { retiro_id: retiroId },
      procesadoPor: adminId
    });

    const res = { success: true, traceId, message: 'Retiro aprobado correctamente' };

    // Notificar por Telegram
    const adminUser = await queryOne(`SELECT nombre_usuario FROM usuarios WHERE id = ?`, [adminId]);
    const message = formatRetiroMessageAprobado({ 
      procesado_por: adminUser?.nombre_usuario || 'Administrador', 
      hora: peruTime.getTimeString() 
    });
    sendToAdmin(message);

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
 * 2. Validación de Estado 'Verificando'. * 3. Reembolso de Saldo Atómico.
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
    if (retiro.estado !== 'Verificando') throw new Error(`El retiro ya se encuentra en estado: ${retiro.estado}`);

    // 2. ELIMINAR ARCHIVO QR SI EXISTE
    if (retiro.comprobante_url) {
      try {
        await deleteLocalFile(retiro.comprobante_url);
        logger.info(`[WITHDRAW_REJECT] Archivo QR eliminado: ${retiro.comprobante_url}`);
      } catch (err) {
        logger.warn(`[WITHDRAW_REJECT] No se pudo eliminar el archivo QR: ${err.message}`);
      }
    }

    // 3. LOCK USUARIO Y REEMBOLSO
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

    // Update balance and set ultima_rechazo_retiro
    const todayPeru = peruTime.todayStr();
    await conn.query(`UPDATE usuarios SET ${balanceField} = ?, ultima_rechazo_retiro = ? WHERE id = ?`, [newBalance, todayPeru, user.id]);

    // 4. ACTUALIZAR ESTADO RETIRO
    await conn.query(
      `UPDATE retiros SET estado = 'Rechazado', admin_notas = ?, procesado_por = ?, procesado_at = NOW() WHERE id = ?`, 
      [motivo, adminId, retiroId]
    );

    // 5. MOVIMIENTO Y AUDITORÍA
    const movimientoId = uuidv4();
    await conn.query(
      `INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
       VALUES (?, ?, ?, 'reembolso_retiro', ?, ?, ?, ?, ?)`,
      [movimientoId, user.id, retiro.tipo_billetera, amount, oldBalance, newBalance, retiroId, `Reembolso por retiro rechazado: ${motivo}`]
    );

    await conn.query(
      `INSERT INTO auditoria_financiera (trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [traceId, user.id, operacion, retiro.tipo_billetera, amount, oldBalance, newBalance, retiroId]
    );

    await insertOperationalAudit(conn, {
      traceId: uuidv4(),
      usuarioId: adminId,
      operacion: 'ADMIN_WITHDRAW_REJECT',
      estadoAnterior: 'Verificando',
      estadoNuevo: 'Rechazado',
      motivo,
      metadata: { retiro_id: retiroId },
      procesadoPor: adminId
    });

    userCache.delete(user.id);

    const res = { success: true, traceId, message: 'Retiro rechazado y saldo reembolsado' };

    // Notificar por Telegram
    const adminUser = await queryOne(`SELECT nombre_usuario FROM usuarios WHERE id = ?`, [adminId]);
    const message = formatRetiroMessageRechazado({ 
      procesado_por: adminUser?.nombre_usuario || 'Administrador', 
      hora: peruTime.getTimeString(),
      motivo: motivo 
    });
    sendToAdmin(message);

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
 * getDailyOperatorSummary v12.1.0: Resumen diario por operador (Telegram + Admin)
 */
export async function getDailyOperatorSummary(dateStr = peruTime.todayStr()) {
  try {
    // 1. Totales Generales
    const totales = await queryOne(`
      SELECT 
        (SELECT COUNT(*) FROM compras_nivel WHERE DATE(procesado_at) = ? AND estado IN ('Aceptado')) as recargas_procesadas,
        (SELECT IFNULL(SUM(monto), 0) FROM compras_nivel WHERE DATE(procesado_at) = ? AND estado IN ('Aceptado')) as total_recargas,
        (SELECT COUNT(*) FROM retiros WHERE fecha_dia = ? AND estado IN ('Aceptado')) as retiros_procesados,
        (SELECT IFNULL(SUM(monto), 0) FROM retiros WHERE fecha_dia = ? AND estado IN ('Aceptado')) as total_retiros_solicitados,
        (SELECT IFNULL(SUM(monto_neto), 0) FROM retiros WHERE fecha_dia = ? AND estado IN ('Aceptado')) as total_neto_pagado,
        (SELECT IFNULL(SUM(comision_operador), 0) FROM retiros WHERE fecha_dia = ? AND estado IN ('Aceptado')) as total_comision_operadores_5,
        (SELECT IFNULL(SUM(comision_retiro), 0) FROM retiros WHERE fecha_dia = ? AND estado IN ('Aceptado')) as total_comision_plataforma_10,
        (SELECT IFNULL(SUM(comision_total), 0) FROM retiros WHERE fecha_dia = ? AND estado IN ('Aceptado')) as total_descuento_15
    `, [dateStr, dateStr, dateStr, dateStr, dateStr, dateStr, dateStr, dateStr]);

    // 2. Detalle por Operador (Agrupado por Telegram ID)
    // Nota: Unimos resultados de retiros y recargas
    const operators = await query(`
      SELECT 
        COALESCE(r.operador_telegram_id, c.operador_telegram_id) as telegram_id,
        COALESCE(r.operador_nombre, c.operador_nombre) as nombre,
        COALESCE(r.operador_username, c.operador_username) as username,
        IFNULL(r.cant_retiros, 0) as retiros_tomados,
        IFNULL(r.monto_retiros, 0) as total_retiros,
        IFNULL(r.neto_retiros, 0) as neto_pagado,
        IFNULL(r.comision_op, 0) as comision_5,
        IFNULL(c.cant_recargas, 0) as recargas_tomadas,
        IFNULL(c.monto_recargas, 0) as total_recargas
      FROM (
        SELECT 
          operador_telegram_id, operador_nombre, operador_username,
          COUNT(*) as cant_retiros,
          SUM(monto) as monto_retiros,
          SUM(monto_neto) as neto_retiros,
          SUM(comision_operador) as comision_op
        FROM retiros 
        WHERE fecha_dia = ? AND estado_operativo IN ('Verificando', 'Aceptado', 'Rechazado')
        GROUP BY operador_telegram_id, operador_nombre, operador_username
      ) r
      LEFT JOIN (
        SELECT 
          operador_telegram_id, operador_nombre, operador_username,
          COUNT(*) as cant_recargas,
          SUM(monto) as monto_recargas
        FROM compras_nivel 
        WHERE DATE(tomado_en) = ? AND estado_operativo IN ('Verificando', 'Aceptado', 'Rechazado')
        GROUP BY operador_telegram_id, operador_nombre, operador_username
      ) c ON r.operador_telegram_id = c.operador_telegram_id
      
      UNION
      
      SELECT 
        COALESCE(r.operador_telegram_id, c.operador_telegram_id) as telegram_id,
        COALESCE(r.operador_nombre, c.operador_nombre) as nombre,
        COALESCE(r.operador_username, c.operador_username) as username,
        IFNULL(r.cant_retiros, 0) as retiros_tomados,
        IFNULL(r.monto_retiros, 0) as total_retiros,
        IFNULL(r.neto_retiros, 0) as neto_pagado,
        IFNULL(r.comision_op, 0) as comision_5,
        IFNULL(c.cant_recargas, 0) as recargas_tomadas,
        IFNULL(c.monto_recargas, 0) as total_recargas
      FROM (
        SELECT 
          operador_telegram_id, operador_nombre, operador_username,
          COUNT(*) as cant_retiros,
          SUM(monto) as monto_retiros,
          SUM(monto_neto) as neto_retiros,
          SUM(comision_operador) as comision_op
        FROM retiros 
        WHERE fecha_dia = ? AND estado_operativo IN ('Verificando', 'Aceptado', 'Rechazado')
        GROUP BY operador_telegram_id, operador_nombre, operador_username
      ) r
      RIGHT JOIN (
        SELECT 
          operador_telegram_id, operador_nombre, operador_username,
          COUNT(*) as cant_recargas,
          SUM(monto) as monto_recargas
        FROM compras_nivel 
        WHERE DATE(tomado_en) = ? AND estado_operativo IN ('Verificando', 'Aceptado', 'Rechazado')
        GROUP BY operador_telegram_id, operador_nombre, operador_username
      ) c ON r.operador_telegram_id = c.operador_telegram_id
      WHERE r.operador_telegram_id IS NULL
    `, [dateStr, dateStr, dateStr, dateStr]);

    return {
      fecha: dateStr,
      totales,
      operadores: operators
    };
  } catch (err) {
    logger.error(`[Operator Summary Error]: ${err.message}`);
    return { fecha: dateStr, totales: {}, operadores: [] };
  }
}

/**
 * distributeInvestmentCommissions v8.0.0: Distribución de 3 niveles con regla de jerarquía e idempotencia
 * @param userId - ID del usuario que realizó la inversión
 * @param amount - Monto de la inversión
 * @param purchaseId - ID de la compra (para idempotencia y prevención de duplicados)
 */
export async function distributeInvestmentCommissions(userId, amount, purchaseId = null) {
  try {
    const user = await findUserById(userId);
    if (!user || !user.invitado_por) return;
    if (!purchaseId) {
      logger.warn(`[COMMISSIONS] Saltando distribución para usuario ${userId}: falta purchaseId.`);
      return;
    }

    // --- REGLA: SOLO PRIMERA INVERSIÓN ---
    // Verificamos si el usuario ya tiene otras inversiones aprobadas anteriormente.
    // Contamos todas las compras aprobadas. Si el total es > 1, significa que no es la primera.
    const stats = await queryOne(`SELECT COUNT(*) as total FROM compras_nivel WHERE usuario_id = ? AND estado IN ('Aceptado')`, [userId]);
    if (stats.total > 1) {
      logger.info(`[COMMISSIONS] Usuario ${user.nombre_usuario} (${userId}) ya realizó inversiones previas. Saltando distribución de comisiones.`);
      return;
    }

    const levels = await getLevels();
    const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));
    if (!userLevel) return;

    // Lista de números con privilegios especiales
    const NUMEROS_PRIVILEGIADOS = [
      '+59176410141',
      '+59172530644',
      '+59160658710',
      '+59172722011',
      '+59169543891',
      '+59167616797',
      '+59176992552',
      '+59173309335',
      '+59170707070',
      '+59177429727'
    ];

    const configs = [
      { key: 'A', percent: 0.10 },
      { key: 'B', percent: 0.035 },
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

        // REGLA DE JERARQUÍA (con excepción para números privilegiados)
        const esPrivilegiado = NUMEROS_PRIVILEGIADOS.includes(uplineData.telefono);
        const subordinadoEsPasante = ['internar', 'pasantia'].includes(String(userLevel.codigo || '').toLowerCase());
        
        if (subordinadoEsPasante) {
          // Si el subordinado es pasante, no se genera comisión
          return;
        }

        if (esPrivilegiado) {
          // Regla especial: si upline es VIP 1 o superior, recibe comisión aunque subordinado tenga VIP mayor
          if (uplineData.nivel_codigo === 'internar' || Number(uplineData.nivel_orden) < 1) {
            // Upline privilegiado pero no tiene VIP 1 o superior
            return;
          }
        } else {
          // Regla normal: upline debe ser >= nivel que el invitado
          if (uplineData.nivel_codigo === 'internar' || Number(uplineData.nivel_orden) < Number(userLevel.orden)) {
            return;
          }
        }

        // --- VALIDACIÓN DE IDEMPOTENCIA ---
        // Verificar si esta comisión ya fue acreditada antes de continuar
        if (purchaseId) {
          const [existingComm] = await conn.query(`
            SELECT id FROM historial_comisiones 
            WHERE usuario_invitador = ? 
              AND usuario_subordinado = ? 
              AND nivel_red = ? 
              AND referencia_compra = ?`,
            [uplineId, userId, config.key, purchaseId]
          );
          if (existingComm.length > 0) {
            logger.info(`[COMMISSIONS] Comisión Nivel ${config.key} para ${uplineData.nombre_usuario} ya existe. Saltando (idempotencia).`);
            return;
          }
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
          
          // --- REGISTRO EN HISTORIAL DETALLADO ---
          const historialId = uuidv4();
          await conn.query(`
            INSERT INTO historial_comisiones (
              id, usuario_invitador, usuario_subordinado, nivel_red, 
              monto_comision, monto_inversion, porcentaje_aplicado, 
              estado, referencia_compra
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'acreditada', ?)`,
            [
              historialId, uplineId, userId, config.key,
              commission, amount, Number((config.percent * 100).toFixed(2)),
              purchaseId
            ]
          );

          userCache.delete(uplineId);
          
          // Notificación en tiempo real (v12.0.0)
          emitToUser(uplineId, 'balance:updated', {
            tipo_billetera: 'comisiones',
            nuevo_saldo: newBalance,
            monto: commission,
            operacion: 'comision_inversion'
          });
          
          logger.info(`[COMMISSIONS] Acreditada comisión Nivel ${config.key} de ${commission} Bs. a ${uplineData.nombre_usuario} (${uplineId})`);
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

export async function handleLevelUpRewards(userId, oldLevelId, newLevelId, compraId = null) {
  const [userRows] = await query(`SELECT * FROM usuarios WHERE id = ?`, [userId]);
  const user = userRows[0];
  
  if (!user) return false;

  const [levels] = await query(`SELECT * FROM niveles WHERE id = ?`, [newLevelId]);
  const targetLevel = levels[0];

  if (!targetLevel) return false;

  // REGALAR TICKETS A INVITADOR SOLO SI ES PRIMERA COMPRA DE NIVEL VIP
  if (user.invitado_por) {
    // Verificar si es la primera compra completada de nivel del usuario
    const queryParams = [userId];
    let sql = `SELECT COUNT(*) as total FROM compras_nivel 
               WHERE usuario_id = ? AND estado = 'Aceptado'`;
    if (compraId) {
      sql += ` AND id != ?`;
      queryParams.push(compraId);
    }

    const [completasCount] = await query(sql, queryParams);
    const yaTieneCompraVip = completasCount[0].total > 0;

    // Solo regalamos tickets si es la PRIMERA compra completada de nivel
    if (!yaTieneCompraVip) {
      let ticketsParaInvitador = 0;
      // Global 1 o Global 2 → 1 ticket
      if (targetLevel.codigo === 'global1' || targetLevel.codigo === 'global2') {
        ticketsParaInvitador = 1;
      }
      // Global 3 → 2 tickets
      else if (targetLevel.codigo === 'global3') {
        ticketsParaInvitador = 2;
      }

      if (ticketsParaInvitador > 0) {
        await query(
          `UPDATE usuarios SET tickets_ruleta = tickets_ruleta + ? WHERE id = ?`,
          [ticketsParaInvitador, user.invitado_por]
        );
        // Notificación al invitador
        emitToUser(user.invitado_por, 'user:tickets_gifted', {
          cantidad: ticketsParaInvitador,
          razon: `Tu invitado compró ${targetLevel.nombre} por primera vez`,
        });
      }
    }
  }

  return true;
}

// ========================
// 5. COMISIONES (Regla de Jerarquía)
// ========================

// distributeInvestmentCommissions v7.0.6 ya definido arriba

// ========================
// 6. CONFIGURACIÓN & MENSAJES
// ========================

export async function getGlobalContent() {
  const now = Date.now();
  // 1. Intentar L1 Cache (Memoria local - 30s)
  if (configCache.data && now - configCache.lastFetch < 30000) return configCache.data;

  try {
    // 2. Intentar L2 Cache (Redis - Compartida entre procesos)
    const cached = await redis.get(CONFIG_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      configCache.data = parsed;
      configCache.lastFetch = now;
      return parsed;
    }

    // 3. Fallback a DB
    const rows = await query(`SELECT * FROM configuraciones`);
    const config = rows.reduce((acc, r) => {
      let val = r.valor;
      try {
        val = JSON.parse(r.valor);
      } catch (e) {}
      return { ...acc, [r.clave]: val };
    }, {});
    
    const merged = { ...DEFAULT_CONFIG, ...config };
    
    // Guardar en Redis y L1 Cache
    await redis.set(CONFIG_KEY, JSON.stringify(merged), 'EX', REDIS_TTL);
    configCache.data = merged;
    configCache.lastFetch = now;
    
    return merged;
  } catch (e) {
    logger.warn('[DB] Usando configuración por defecto (DB Offline)');
    return DEFAULT_CONFIG;
  }
}

export async function refreshGlobalContent(newContent = null) {
  if (newContent) {
    for (const [clave, valor] of Object.entries(newContent)) {
      const valStr = JSON.stringify(valor);
      await query(`INSERT INTO configuraciones (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?`, 
        [clave, valStr, valStr]);
    }
  }
  
  // Invalidar Caches (L1 y L2)
  configCache.data = null;
  configCache.lastFetch = 0;
  await redis.del(CONFIG_KEY);
  
  const updated = await getGlobalContent();
  
  // Emitir actualización en tiempo real v12.0.0
  emitToAll('config:updated', updated);
  
  return updated;
}

export async function getPublicContent() {
  return getGlobalContent();
}

export async function refreshPublicContent(newContent = null) {
  return refreshGlobalContent(newContent);
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

export async function getDailyWithdrawalSummary(dateStr = peruTime.todayStr()) {
  try {
    const summary = await queryOne(`
      SELECT 
        COUNT(*) as cantidad_procesados,
        IFNULL(SUM(monto), 0) as total_solicitado,
        IFNULL(SUM(monto_neto), 0) as total_pagado_neto,
        IFNULL(SUM(comision_aplicada), 0) as total_comisiones
      FROM retiros 
      WHERE fecha_dia = ? 
      AND estado IN ('Aceptado')
    `, [dateStr]);

    const totalSolicitado = Number(summary.total_solicitado);
    const totalComisiones = Number(summary.total_comisiones);
    
    // Cálculo de desglose según regla: 15% total (10% empresa + 5% operadores)
    // El total_comisiones ya representa el 15% (o el % configurado en ese momento)
    // Para el reporte visual usaremos los porcentajes fijos solicitados:
    const gananciaOperadores = Number((totalSolicitado * 0.05).toFixed(2));
    const gananciaEmpresa = Number((totalSolicitado * 0.10).toFixed(2));
    const totalDescontado = Number((totalSolicitado * 0.15).toFixed(2));

    return {
      fecha: dateStr,
      cantidad_procesados: summary.cantidad_procesados,
      total_solicitado: totalSolicitado,
      total_pagado_neto: Number(summary.total_pagado_neto),
      total_descontado_15: totalDescontado,
      ganancia_operadores_5: gananciaOperadores,
      comision_retiro_10: gananciaEmpresa
    };
  } catch (err) {
    logger.error('[DB-SUMMARY] Error:', err.message);
    return {
      fecha: dateStr,
      cantidad_procesados: 0,
      total_solicitado: 0,
      total_pagado_neto: 0,
      total_descontado_15: 0,
      ganancia_operadores_5: 0,
      comision_retiro_10: 0
    };
  }
}

export async function getDashboardStats() {
  const [userCount, rechargeTotal, withdrawalTotal, activeTasks] = await Promise.all([
    queryOne(`SELECT COUNT(*) as total FROM usuarios WHERE rol = 'usuario'`),
    queryOne(`SELECT SUM(monto) as total FROM compras_nivel WHERE estado = 'Aceptado'`),
    queryOne(`SELECT SUM(monto) as total FROM retiros WHERE estado = 'Aceptado'`),
    queryOne(`SELECT COUNT(*) as total FROM actividad_tareas WHERE fecha_dia = ?`, [peruTime.todayStr()])
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
  const today = peruTime.todayStr();
  const yesterday = peruTime.yesterdayStr();
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
    logger.audit('[CRON] Verificación diaria de integridad completada (Hora Per�).');
    
    // 1. Limpieza de usuarios inactivos > 14 días (v12.2.0)
    // Solo eliminamos usuarios "Internar" (Pasantes) con 0 balance para no afectar a clientes reales.
    const cleanupResult = await query(`
      DELETE FROM usuarios 
      WHERE nivel_id = 'l1' 
        AND rol = 'usuario' 
        AND saldo_principal = 0 
        AND saldo_comisiones = 0 
        AND updated_at < DATE_SUB(NOW(), INTERVAL 14 DAY)
    `);
    
    if (cleanupResult.affectedRows > 0) {
      logger.info(`[CRON-CLEANUP] Se eliminaron ${cleanupResult.affectedRows} usuarios inactivos.`);
    }

    return true;
  } catch (err) {
    logger.error(`[Reset Error]: ${err.message}`);
  }
}

export async function expirePendingWithdrawalsForDay(dateStr = peruTime.todayStr()) {
  const expired = await transaction(async (conn) => {
    const [retiroRows] = await conn.query(
      `SELECT r.*, u.invitado_por, u.nombre_usuario
       FROM retiros r
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.fecha_dia = ?
         AND r.estado IN ('Pendiente_Patrocinador', 'Verificando', 'verificando')
       FOR UPDATE`,
      [dateStr]
    );

    if (retiroRows.length === 0) {
      return [];
    }

    const expiredItems = [];

    for (const retiro of retiroRows) {
      const balanceField = retiro.tipo_billetera === 'comisiones' ? 'saldo_comisiones' : 'saldo_principal';
      const [userRows] = await conn.query(
        `SELECT id, ${balanceField} AS balance FROM usuarios WHERE id = ? FOR UPDATE`,
        [retiro.usuario_id]
      );
      const userBalance = userRows[0];
      if (!userBalance) continue;

      const oldBalance = Number(userBalance.balance || 0);
      const amount = Number(retiro.monto || 0);
      const newBalance = oldBalance + amount;
      const traceId = uuidv4();

      await conn.query(
        `UPDATE usuarios SET ${balanceField} = ? WHERE id = ?`,
        [newBalance, retiro.usuario_id]
      );

      await conn.query(
        `DELETE FROM movimientos_saldo
         WHERE referencia_id = ?
           AND tipo_movimiento = 'retiro'`,
        [retiro.id]
      );

      await conn.query(
        `INSERT INTO auditoria_financiera (
          trace_id, usuario_id, operacion, billetera, monto, saldo_anterior, saldo_nuevo, referencia_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [traceId, retiro.usuario_id, 'WITHDRAW_AUTO_EXPIRE_REFUND', retiro.tipo_billetera, amount, oldBalance, newBalance, retiro.id]
      );

      await insertOperationalAudit(conn, {
        traceId,
        usuarioId: retiro.usuario_id,
        operacion: 'WITHDRAW_AUTO_EXPIRE',
        estadoAnterior: retiro.estado,
        estadoNuevo: 'Eliminado',
        metadata: { retiro_id: retiro.id, fecha_dia: dateStr }
      });

      await conn.query(`DELETE FROM retiros WHERE id = ?`, [retiro.id]);

      expiredItems.push({
        id: retiro.id,
        usuario_id: retiro.usuario_id,
        invitado_por: retiro.invitado_por,
        estado: retiro.estado,
        nombre_usuario: retiro.nombre_usuario,
        monto: amount,
        comprobante_url: retiro.comprobante_url
      });
    }

    return expiredItems;
  });

  for (const retiro of expired) {
    if (retiro.comprobante_url) {
      try {
        await deleteLocalFile(retiro.comprobante_url);
      } catch (err) {
        logger.warn(`[WITHDRAW_AUTO_EXPIRE] No se pudo eliminar QR ${retiro.comprobante_url}: ${err.message}`);
      }
    }

    await createNotification(
      retiro.usuario_id,
      'Retiro vencido',
      `Tu retiro de ${retiro.monto} Bs no fue aprobado durante el día, fue eliminado automáticamente y tu saldo fue devuelto.`
    ).catch((err) => logger.warn(`[WITHDRAW_AUTO_EXPIRE] No se pudo notificar al usuario ${retiro.usuario_id}: ${err.message}`));

    if (retiro.invitado_por && retiro.estado === 'Pendiente_Patrocinador') {
      await createNotification(
        retiro.invitado_por,
        'Solicitud de retiro vencida',
        `La solicitud de retiro de ${retiro.nombre_usuario || 'tu subordinado'} por ${retiro.monto} Bs venció a las 23:59 y fue eliminada automáticamente.`
      ).catch((err) => logger.warn(`[WITHDRAW_AUTO_EXPIRE] No se pudo notificar al patrocinador ${retiro.invitado_por}: ${err.message}`));
    }
  }

  if (expired.length > 0) {
    logger.info(`[WITHDRAW_AUTO_EXPIRE] Se expiraron ${expired.length} retiros pendientes del día ${dateStr}.`);
  }

  return expired.length;
}

export function startPendingWithdrawalsExpiryService() {
  const runIfNeeded = async () => {
    try {
      const nowDate = peruTime.todayStr();
      const nowTime = peruTime.getTimeString().slice(0, 5);

      if (nowTime !== '23:59') return;
      if (withdrawalExpiryState.lastRunDate === nowDate) return;

      await expirePendingWithdrawalsForDay(nowDate);
      withdrawalExpiryState.lastRunDate = nowDate;
    } catch (err) {
      logger.error(`[WITHDRAW_AUTO_EXPIRE] Error en ejecución programada: ${err.message}`);
    }
  };

  setInterval(runIfNeeded, 60 * 1000);
  runIfNeeded().catch(err => logger.error(`[WITHDRAW_AUTO_EXPIRE] Error inicial: ${err.message}`));
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

// ========================
// 7. SISTEMA DE TICKETS DE SORTEO
// ========================

/**
 * Genera un ticket de sorteo para un usuario
 */
export async function createTicketSorteo(userId, motivo) {
  const id = uuidv4();
  const codigo = `TK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  await query(`
    INSERT INTO tickets_sorteo (id, codigo, usuario_id, motivo, estado)
    VALUES (?, ?, ?, ?, 'Activo')
  `, [id, codigo, userId, motivo]);
  
  return { id, codigo, usuario_id: userId, motivo, estado: 'Activo' };
}

/**
 * Obtiene todos los tickets de un usuario
 */
export async function getTicketsByUser(userId) {
  return await query(`
    SELECT t.*, u.nombre_usuario
    FROM tickets_sorteo t
    JOIN usuarios u ON t.usuario_id = u.id
    WHERE t.usuario_id = ?
    ORDER BY t.created_at DESC
  `, [userId]);
}

/**
 * Obtiene todos los tickets (admin)
 */
export async function getAllTicketsSorteo() {
  return await query(`
    SELECT t.*, u.nombre_usuario, u.telefono
    FROM tickets_sorteo t
    JOIN usuarios u ON t.usuario_id = u.id
    ORDER BY t.created_at DESC
  `);
}

/**
 * Registra una recompensa en el historial
 */
export async function createHistorialRecompensa(data) {
  const id = uuidv4();
  
  await query(`
    INSERT INTO historial_recompensas (
      id, usuario_receptor, usuario_generador, nivel_alcanzado, 
      cantidad_tickets, motivo, estado
    ) VALUES (?, ?, ?, ?, ?, ?, 'Completado')
  `, [
    id, 
    data.usuario_receptor, 
    data.usuario_generador || null, 
    data.nivel_alcanzado || null, 
    data.cantidad_tickets, 
    data.motivo
  ]);
  
  return { id, ...data, estado: 'Completado' };
}

/**
 * Crea una notificación para un usuario
 */
export async function createNotification(userId, titulo, mensaje) {
  const id = uuidv4();
  
  await query(`
    INSERT INTO notificaciones (id, usuario_id, titulo, mensaje, leida)
    VALUES (?, ?, ?, ?, 0)
  `, [id, userId, titulo, mensaje]);
  
  // Notificar en tiempo real
  emitToUser(userId, 'user:new_notification', {
    id,
    titulo,
    mensaje
  });
  
  return { id, usuario_id: userId, titulo, mensaje, leida: false };
}

/**
 * Obtiene el historial de recompensas de un usuario
 */
export async function getHistorialRecompensasByUser(userId) {
  return await query(`
    SELECT h.*, 
           u1.nombre_usuario as nombre_receptor,
           u2.nombre_usuario as nombre_generador
    FROM historial_recompensas h
    JOIN usuarios u1 ON h.usuario_receptor = u1.id
    LEFT JOIN usuarios u2 ON h.usuario_generador = u2.id
    WHERE h.usuario_receptor = ?
    ORDER BY h.created_at DESC
  `, [userId]);
}

/**
 * Otorga tickets a un usuario por registro
 */
export async function giveTicketsPorRegistro(userId) {
  try {
    // 1 ticket por registro
    const ticket = await createTicketSorteo(userId, 'Registro de usuario');
    
    // Registrar en historial
    await createHistorialRecompensa({
      usuario_receptor: userId,
      cantidad_tickets: 1,
      motivo: 'Registro de usuario'
    });
    
    // Actualizar tickets_ruleta en la tabla usuarios
    await query(`UPDATE usuarios SET tickets_ruleta = tickets_ruleta + 1 WHERE id = ?`, [userId]);
    
    // Crear notificación
    const tituloNotificacion = '¡Bienvenido!';
    const mensajeNotificacion = 'Has recibido 1 Ticket de Sorteo por completar tu registro.';
    await createNotification(userId, tituloNotificacion, mensajeNotificacion);
    
    return ticket;
  } catch (err) {
    logger.error(`[Tickets-Registro] Error: ${err.message}`);
    throw err;
  }
}

/**
 * Otorga tickets al invitador por ascenso de su invitado
 */
export async function giveTicketsPorAscensoInvitado(invitadorId, invitadoId, nivelAlcanzado, conn = null) {
  try {
    const db = conn || query;
    
    // Obtener el nombre del nivel para las notificaciones
    let levelInfo;
    if (conn) {
      const [levelRows] = await conn.query(`
        SELECT nombre FROM niveles WHERE codigo = ? OR id = ?
      `, [nivelAlcanzado.toLowerCase(), nivelAlcanzado]);
      levelInfo = levelRows[0];
    } else {
      levelInfo = await queryOne(`
        SELECT nombre FROM niveles WHERE codigo = ? OR id = ?
      `, [nivelAlcanzado.toLowerCase(), nivelAlcanzado]);
    }
    const nombreNivel = levelInfo?.nombre || nivelAlcanzado;
    
    // Verificar si ya se otorgaron tickets por este ascenso (evitar duplicados)
    let existing;
    if (conn) {
      const [existingRows] = await conn.query(`
        SELECT * FROM historial_recompensas 
        WHERE usuario_receptor = ? 
          AND usuario_generador = ? 
          AND nivel_alcanzado = ? 
          AND motivo LIKE 'Invitado ascendió a%'
      `, [invitadorId, invitadoId, nivelAlcanzado.toLowerCase()]);
      existing = existingRows;
    } else {
      existing = await query(`
        SELECT * FROM historial_recompensas 
        WHERE usuario_receptor = ? 
          AND usuario_generador = ? 
          AND nivel_alcanzado = ? 
          AND motivo LIKE 'Invitado ascendió a%'
      `, [invitadorId, invitadoId, nivelAlcanzado.toLowerCase()]);
    }
    
    if (existing && existing.length > 0) {
      logger.info(`[Tickets-Ascenso] Tickets ya otorgados previamente para este ascenso.`);
      return null;
    }

    let comprasVipAceptadas = 0;
    if (conn) {
      const [purchaseRows] = await conn.query(`
        SELECT COUNT(*) AS total
        FROM compras_nivel
        WHERE usuario_id = ? AND estado = 'Aceptado'
      `, [invitadoId]);
      comprasVipAceptadas = Number(purchaseRows[0]?.total || 0);
    } else {
      const purchaseStats = await queryOne(`
        SELECT COUNT(*) AS total
        FROM compras_nivel
        WHERE usuario_id = ? AND estado = 'Aceptado'
      `, [invitadoId]);
      comprasVipAceptadas = Number(purchaseStats?.total || 0);
    }

    if (comprasVipAceptadas > 0) {
      logger.info(`[Tickets-Ascenso] Invitado ${invitadoId} ya tenía compras VIP aceptadas. No se regalan tickets por ascensos posteriores.`);
      return null;
    }
    
    // Determinar cantidad de tickets según nivel
    let cantidadTickets = 0;
    let motivoTicket = '';
    let motivoHistorial = '';
    const nivelCodigo = String(nivelAlcanzado).toLowerCase();
    
    if (nivelCodigo === 'global1') {
      cantidadTickets = 1;
      motivoTicket = 'Invitado ascendió a Global 1';
      motivoHistorial = 'Invitado ascendió a Global 1';
    } else if (nivelCodigo === 'global2') {
      cantidadTickets = 1;
      motivoTicket = 'Invitado ascendió a Global 2';
      motivoHistorial = 'Invitado ascendió a Global 2';
    } else if (nivelCodigo === 'global3') {
      cantidadTickets = 2;
      motivoTicket = 'Invitado ascendió a Global 3';
      motivoHistorial = 'Invitado ascendió a Global 3';
    }
    
    if (cantidadTickets === 0) {
      return null;
    }
    
    // Otorgar tickets
    for (let i = 0; i < cantidadTickets; i++) {
      const ticketId = uuidv4();
      const ticketCodigo = `TK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      if (conn) {
        await conn.query(`
          INSERT INTO tickets_sorteo (id, codigo, usuario_id, motivo, estado)
          VALUES (?, ?, ?, ?, 'Activo')
        `, [ticketId, ticketCodigo, invitadorId, motivoTicket]);
      } else {
        await query(`
          INSERT INTO tickets_sorteo (id, codigo, usuario_id, motivo, estado)
          VALUES (?, ?, ?, ?, 'Activo')
        `, [ticketId, ticketCodigo, invitadorId, motivoTicket]);
      }
    }
    
    // Registrar en historial
    const historialId = uuidv4();
    if (conn) {
      await conn.query(`
        INSERT INTO historial_recompensas (
          id, usuario_receptor, usuario_generador, nivel_alcanzado, 
          cantidad_tickets, motivo, estado
        ) VALUES (?, ?, ?, ?, ?, ?, 'Completado')
      `, [
        historialId, 
        invitadorId, 
        invitadoId, 
        nivelCodigo, 
        cantidadTickets, 
        motivoHistorial
      ]);
    } else {
      await createHistorialRecompensa({
        usuario_receptor: invitadorId,
        usuario_generador: invitadoId,
        nivel_alcanzado: nivelCodigo,
        cantidad_tickets: cantidadTickets,
        motivo: motivoHistorial
      });
    }
    
    // Actualizar tickets_ruleta en la tabla usuarios
    if (conn) {
      await conn.query(`UPDATE usuarios SET tickets_ruleta = tickets_ruleta + ? WHERE id = ?`, [cantidadTickets, invitadorId]);
    } else {
      await query(`UPDATE usuarios SET tickets_ruleta = tickets_ruleta + ? WHERE id = ?`, [cantidadTickets, invitadorId]);
    }
    
    // Crear notificación (fuera de la transacción si es que estamos en una)
    if (!conn) {
      const tituloNotificacion = '¡Felicidades!';
      const mensajeNotificacion = `Has recibido ${cantidadTickets} Ticket${cantidadTickets > 1 ? 's' : ''} de Sorteo porque tu invitado ascendió a ${nombreNivel}.`;
      await createNotification(invitadorId, tituloNotificacion, mensajeNotificacion);
    }
    
    // Notificar en tiempo real
    emitToUser(invitadorId, 'user:tickets_gifted', {
      cantidad: cantidadTickets,
      razon: `Tu invitado alcanzó el nivel ${nombreNivel}`
    });
    
    return { cantidadTickets, nivelAlcanzado: nivelCodigo };
  } catch (err) {
    logger.error(`[Tickets-Ascenso] Error: ${err.message}`);
    throw err;
  }
}

// ========================
// 8. SISTEMA DE APROBACIÓN DE RETIROS PASAJEROS
// ========================

/**
 * Verifica si un usuario es de nivel pasante
 */
export async function esUsuarioPasante(userId) {
  const user = await findUserById(userId);
  if (!user) return false;
  
  const levels = await getLevels();
  const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));
  
  const codigo = String(userLevel?.codigo || '').toLowerCase();
  return codigo === 'internar' || codigo === 'pasantia';
}

export async function puedeAprobarRetirosDePasantes(userId) {
  const user = await findUserById(userId);
  if (!user) return false;

  const levels = await getLevels();
  const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));
  const codigo = String(userLevel?.codigo || '').toLowerCase();

  return codigo !== 'internar' && codigo !== 'pasantia' && Number(userLevel?.orden || 0) >= 1;
}

/**
 * Obtiene el conteo de retiros autorizados por patrocinador
 */
export async function getConteoRetirosPatrocinador(patrocinadorId) {
  const result = await queryOne(`
    SELECT COALESCE(total_aprobados, 0) as total
    FROM limites_retiros_pasantia
    WHERE patrocinador_id = ?
  `, [patrocinadorId]);
  
  return result?.total || 0;
}

/**
 * Verifica si el patrocinador tiene cupo para aprobar un retiro de pasante
 */
export async function patrocinadorTieneCupo(patrocinadorId) {
  const conteo = await getConteoRetirosPatrocinador(patrocinadorId);
  const maximo = 15;
  return conteo < maximo;
}

/**
 * Aproba un retiro de pasante por parte del patrocinador
 */
export async function aprobarRetiroPorPatrocinador(retiroId, patrocinadorId) {
  const traceId = uuidv4();
  
  return await transaction(async (conn) => {
    // 1. Lock del retiro
    const [retiroRows] = await conn.query(`SELECT * FROM retiros WHERE id = ? FOR UPDATE`, [retiroId]);
    const retiro = retiroRows[0];
    if (!retiro) throw new Error('Retiro no encontrado');
    
    // 2. Verificar que el patrocinador es correcto
    const [userRows] = await conn.query(`SELECT * FROM usuarios WHERE id = ?`, [retiro.usuario_id]);
    const user = userRows[0];
    if (!user || user.invitado_por !== patrocinadorId) {
      throw new Error('No eres el patrocinador de este usuario');
    }

    if (!await puedeAprobarRetirosDePasantes(patrocinadorId)) {
      throw new Error('Solo usuarios VIP pueden aprobar retiros de pasantes');
    }
    
    // 3. Verificar que es un pasante
    if (!await esUsuarioPasante(retiro.usuario_id)) {
      throw new Error('Este usuario no es pasante');
    }
    
    // 4. Verificar que el retiro está en estado correcto
    const estadosValidos = ['Pendiente_Patrocinador', 'verificando', 'Verificando'];
    if (!estadosValidos.includes(retiro.estado)) {
      throw new Error('El retiro no está en estado Verificando por patrocinador');
    }
    if (retiro.estado_patrocinador && retiro.estado_patrocinador !== 'Verificando') {
      throw new Error('El retiro no está en estado Verificando por patrocinador');
    }
    
    // 5. Verificar que el patrocinador tiene cupo
    const [limiteRows] = await conn.query(`
      SELECT * FROM limites_retiros_pasantia WHERE patrocinador_id = ? FOR UPDATE
    `, [patrocinadorId]);
    let limite = limiteRows[0];
    let totalAprobados = limite?.total_aprobados || 0;
    
    if (totalAprobados >= 15) {
      throw new Error('Tu patrocinador ya alcanzó el límite de 15 retiros autorizados para usuarios de Pasantía');
    }
    
    // 6. Actualizar el conteo del patrocinador
    totalAprobados += 1;
    if (limite) {
      await conn.query(`
        UPDATE limites_retiros_pasantia 
        SET total_aprobados = ?, updated_at = NOW()
        WHERE patrocinador_id = ?
      `, [totalAprobados, patrocinadorId]);
    } else {
      const limiteId = uuidv4();
      await conn.query(`
        INSERT INTO limites_retiros_pasantia (id, patrocinador_id, total_aprobados, maximo_por_patrocinador)
        VALUES (?, ?, ?, 15)
      `, [limiteId, patrocinadorId, totalAprobados]);
    }
    
    // 7. Actualizar el retiro
    await conn.query(`
      UPDATE retiros 
      SET estado_patrocinador = 'aprobado',
          aprobado_por_patrocinador = 1,
          patrocinador_id = ?,
          fecha_aprobacion_patrocinador = NOW(),
          procesado_por_patrocinador = ?,
          procesado_por_patrocinador_at = NOW(),
          estado = 'Verificando'
      WHERE id = ?
    `, [patrocinadorId, patrocinadorId, retiroId]);

    const [nivelRows] = await conn.query(`SELECT nombre FROM niveles WHERE id = ?`, [user.nivel_id]);
    const nivelNombre = nivelRows[0]?.nombre || 'Usuario';
    const [cardRows] = await conn.query(`
      SELECT nombre_banco, numero_cuenta, nombre_titular
      FROM tarjetas_bancarias
      WHERE id = ?
    `, [retiro.cuenta_bancaria_id]);
    const retiroCard = cardRows[0] || {};
    const config = await getGlobalContent();
    const adminMessage = formatRetiroMessage({
      id: retiro.id,
      telefono: user.telefono,
      nombre_usuario: user.nombre_usuario,
      nivel: nivelNombre,
      monto: retiro.monto,
      banco: retiroCard.nombre_banco,
      cuenta: retiroCard.numero_cuenta,
      nombre_titular: retiroCard.nombre_titular,
      hora: peruTime.getTimeString()
    }, config.comision_retiro);
    
    // 8. Registrar auditoría
    await conn.query(`
      INSERT INTO auditoria_operaciones (
        id, tipo_operacion, usuario_id, patrocinador_id, fecha, estado_anterior, estado_nuevo, metadata
      ) VALUES (?, 'retiro_aprobado_patrocinador', ?, ?, NOW(), 'Pendiente_Patrocinador', 'Verificando', ?)
    `, [uuidv4(), retiro.usuario_id, patrocinadorId, JSON.stringify({ retiroId, monto: retiro.monto })]);
    
    // Also log to auditoria_operativa
    await insertOperationalAudit(conn, {
      traceId,
      usuarioId: patrocinadorId,
      operacion: 'retiro_aprobado_patrocinador',
      estadoAnterior: retiro.estado,
      estadoNuevo: 'Verificando',
      metadata: { retiroId, monto: retiro.monto },
      procesadoPor: patrocinadorId
    });

    let qrBuffer = null;
    if (retiro.comprobante_url) {
      try {
        qrBuffer = await readLocalFileBuffer(retiro.comprobante_url);
      } catch (err) {
        logger.warn(`[WITHDRAW_SPONSOR_APPROVE_LEGACY] No se pudo leer QR ${retiro.comprobante_url}: ${err.message}`);
      }
    }
    const telegramOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📝 Tomar Caso", callback_data: `retiro_tomar_${retiro.id}` }
          ]
        ]
      },
      ...(qrBuffer ? { photo: qrBuffer } : {})
    };

    sendToRetiros(adminMessage, telegramOptions);

    await createNotification(
      retiro.usuario_id,
      'Retiro aprobado por tu patrocinador',
      `Tu retiro de ${retiro.monto} Bs fue aprobado por tu patrocinador y ahora está en revisión por administración.`
    );
    
    return { success: true, message: 'Retiro aprobado por patrocinador, ahora en espera de administración' };
  });
}

/**
 * Rechaza un retiro de pasante por parte del patrocinador
 */
export async function rechazarRetiroPorPatrocinador(retiroId, patrocinadorId, motivo) {
  const traceId = uuidv4();
  
  return await transaction(async (conn) => {
    // 1. Lock del retiro
    const [retiroRows] = await conn.query(`SELECT * FROM retiros WHERE id = ? FOR UPDATE`, [retiroId]);
    const retiro = retiroRows[0];
    if (!retiro) throw new Error('Retiro no encontrado');
    
    // 2. Verificar que el patrocinador es correcto
    const [userRows] = await conn.query(`SELECT * FROM usuarios WHERE id = ?`, [retiro.usuario_id]);
    const user = userRows[0];
    if (!user || user.invitado_por !== patrocinadorId) {
      throw new Error('No eres el patrocinador de este usuario');
    }

    if (!await puedeAprobarRetirosDePasantes(patrocinadorId)) {
      throw new Error('Solo usuarios VIP pueden aprobar retiros de pasantes');
    }
    
    // 3. Verificar que es un pasante
    if (!await esUsuarioPasante(retiro.usuario_id)) {
      throw new Error('Este usuario no es pasante');
    }
    
    // 4. Verificar que el retiro está en estado verificando
    const estadosValidos = ['Pendiente_Patrocinador', 'verificando', 'Verificando'];
    if (!estadosValidos.includes(retiro.estado)) {
      throw new Error('El retiro no está en estado Verificando por patrocinador');
    }
    if (retiro.estado_patrocinador && retiro.estado_patrocinador !== 'Verificando') {
      throw new Error('El retiro no está en estado Verificando por patrocinador');
    }
    
    // 5. Reembolso del saldo
    const balanceField = retiro.tipo_billetera === 'comisiones' ? 'saldo_comisiones' : 'saldo_principal';
    const [userBalanceRows] = await conn.query(`SELECT * FROM usuarios WHERE id = ? FOR UPDATE`, [retiro.usuario_id]);
    const userBalance = userBalanceRows[0];
    const oldBalance = Number(userBalance[balanceField]);
    const amount = Number(retiro.monto);
    const newBalance = oldBalance + amount;
    
    await conn.query(`UPDATE usuarios SET ${balanceField} = ? WHERE id = ?`, [newBalance, userBalance.id]);
    
    // 6. Actualizar el retiro
    await conn.query(`
      UPDATE retiros 
      SET estado_patrocinador = 'rechazado',
          aprobado_por_patrocinador = 0,
          patrocinador_id = ?,
          motivo_rechazo_patrocinador = ?,
          estado = 'Rechazado',
          procesado_por_patrocinador = ?,
          procesado_por_patrocinador_at = NOW()
      WHERE id = ?
    `, [patrocinadorId, motivo, patrocinadorId, retiroId]);
    
    // 7. Registrar movimiento de reembolso
    const movimientoId = uuidv4();
    await conn.query(`
      INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
      VALUES (?, ?, ?, 'reembolso_retiro', ?, ?, ?, ?, ?)
    `, [movimientoId, userBalance.id, retiro.tipo_billetera, amount, oldBalance, newBalance, retiroId, `Reembolso por retiro rechazado por patrocinador: ${motivo}`]);
    
    // 8. Registrar auditoría (both tables)
    await conn.query(`
      INSERT INTO auditoria_operaciones (
        id, tipo_operacion, usuario_id, patrocinador_id, fecha, estado_anterior, estado_nuevo, motivo, metadata
      ) VALUES (?, 'retiro_rechazado_patrocinador', ?, ?, NOW(), 'verificando', 'rechazado', ?, ?)
    `, [uuidv4(), retiro.usuario_id, patrocinadorId, motivo, JSON.stringify({ retiroId, monto: retiro.monto })]);

    await insertOperationalAudit(conn, {
      traceId,
      usuarioId: patrocinadorId,
      operacion: 'retiro_rechazado_patrocinador',
      estadoAnterior: retiro.estado,
      estadoNuevo: 'rechazado',
      motivo,
      metadata: { retiroId, monto: retiro.monto },
      procesadoPor: patrocinadorId
    });
    
    // 9. Notificar al usuario
    await createNotification(retiro.usuario_id, 'Retiro Rechazado', `Tu retiro de ${retiro.monto} Bs fue rechazado por tu patrocinador: ${motivo}`);
    
    return { success: true, message: 'Retiro rechazado por patrocinador y saldo reembolsado' };
  });
}

/**
 * Obtiene los retiros Verificando por aprobación de patrocinador
 */
export async function getRetirosPendientesPatrocinador(patrocinadorId) {
  if (!await puedeAprobarRetirosDePasantes(patrocinadorId)) {
    return [];
  }

  return await query(`
    SELECT r.*, u.nombre_usuario as usuario_nombre, u.nombre_usuario, u.telefono, n.nombre as nivel_nombre, n.codigo as nivel_codigo
    FROM retiros r
    JOIN usuarios u ON r.usuario_id = u.id
    LEFT JOIN niveles n ON u.nivel_id = n.id
    WHERE u.invitado_por = ?
      AND LOWER(COALESCE(n.codigo, '')) IN ('internar', 'pasantia')
      AND (
        r.estado = 'Pendiente_Patrocinador'
        OR (
          r.estado IN ('Verificando', 'verificando')
          AND r.patrocinador_id IS NULL
          AND COALESCE(r.aprobado_por_patrocinador, 0) = 0
          AND (r.estado_patrocinador IS NULL OR r.estado_patrocinador = 'Verificando')
        )
      )
      AND (r.estado_patrocinador IS NULL OR r.estado_patrocinador = 'Verificando')
    ORDER BY r.created_at DESC
  `, [patrocinadorId]);
}

/**
 * Obtiene el equipo completo de un patrocinador con sus retiros
 */
export async function getEquipoPatrocinador(patrocinadorId) {
  // Obtener nivel A (primer nivel - directos)
  const level1 = await query(`
    SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre, n.codigo as nivel_codigo,
           (SELECT COUNT(*) FROM retiros WHERE usuario_id = u.id AND estado = 'Pendiente_Patrocinador' AND (estado_patrocinador IS NULL OR estado_patrocinador = 'Verificando')) as retiros_pendientes
    FROM usuarios u
    LEFT JOIN niveles n ON u.nivel_id = n.id
    WHERE u.invitado_por = ?
    ORDER BY u.created_at DESC
  `, [patrocinadorId]);
  
  // Obtener niveles B y C (solo para visualización)
  const level2Ids = level1.map(u => u.id);
  const level2 = level2Ids.length > 0 ? await query(`
    SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre, n.codigo as nivel_codigo,
           (SELECT COUNT(*) FROM retiros WHERE usuario_id = u.id AND estado = 'Pendiente_Patrocinador' AND (estado_patrocinador IS NULL OR estado_patrocinador = 'Verificando')) as retiros_pendientes
    FROM usuarios u
    LEFT JOIN niveles n ON u.nivel_id = n.id
    WHERE u.invitado_por IN (?)
    ORDER BY u.created_at DESC
  `, [level2Ids]) : [];
  
  const level3Ids = level2.map(u => u.id);
  const level3 = level3Ids.length > 0 ? await query(`
    SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre, n.codigo as nivel_codigo,
           (SELECT COUNT(*) FROM retiros WHERE usuario_id = u.id AND estado = 'Pendiente_Patrocinador' AND (estado_patrocinador IS NULL OR estado_patrocinador = 'Verificando')) as retiros_pendientes
    FROM usuarios u
    LEFT JOIN niveles n ON u.nivel_id = n.id
    WHERE u.invitado_por IN (?)
    ORDER BY u.created_at DESC
  `, [level3Ids]) : [];
  
  return {
    level1, // Nivel A - directos (los que el patrocinador puede aprobar)
    level2, // Nivel B - visualización
    level3  // Nivel C - visualización
  };
}

/**
 * Genera reporte financiero diario (para Telegram)
 */
export async function generarReporteFinancieroDiario(dateStr = null) {
  const fecha = dateStr || peruTime.todayStr();
  
  const reporte = await queryOne(`
    SELECT
      (SELECT COALESCE(SUM(monto), 0) FROM compras_nivel WHERE DATE(procesado_at) = ? AND estado IN ('Aceptado')) as total_ingresos,
      (SELECT COALESCE(SUM(monto), 0) FROM compras_nivel WHERE DATE(procesado_at) = ? AND estado IN ('Aceptado')) as total_recargas,
      (SELECT COALESCE(SUM(monto), 0) FROM retiros WHERE fecha_dia = ? AND estado IN ('Aceptado')) as total_retiros,
      (SELECT COALESCE(SUM(monto), 0) FROM retiros WHERE fecha_dia = ? AND estado IN ('Aceptado')) as total_salidas,
      (SELECT COUNT(*) FROM compras_nivel WHERE DATE(procesado_at) = ? AND estado IN ('Aceptado')) as cantidad_recargas,
      (SELECT COUNT(*) FROM retiros WHERE fecha_dia = ? AND estado IN ('Aceptado')) as cantidad_retiros
  `, [fecha, fecha, fecha, fecha, fecha, fecha]);
  
  const balance = Number(reporte.total_ingresos || 0) - Number(reporte.total_salidas || 0);
  
  return {
    ...reporte,
    balance,
    fecha
  };
}

// ========================
// 9. ACTUALIZACIÓN DE ESTADOS DE RECARGAS/RETIROS
// ========================

/**
 * Aprueba una recarga con el nuevo estado "aceptado"
 */
export async function aprobarRecargaNuevo(compraId, adminId) {
  const result = await query(`
    UPDATE compras_nivel 
    SET estado = 'Aceptado', 
        estado_operativo = 'Aceptado',
        procesado_por = ?,
        procesado_at = NOW()
    WHERE id = ? AND estado IN ('Verificando', 'pendiente_ascenso', 'verificando')
  `, [adminId, compraId]);
  
  if (result.affectedRows === 0) {
    throw new Error('No se pudo aprobar la recarga (estado no válido o ya procesada)');
  }
  
  return { success: true };
}

/**
 * Rechaza una recarga con el nuevo estado "Rechazado"
 */
export async function rechazarRecargaNuevo(compraId, adminId, motivo) {
  const result = await query(`
    UPDATE compras_nivel 
    SET estado = 'Rechazado', 
        estado_operativo = 'Rechazado',
        admin_notas = ?,
        procesado_por = ?,
        procesado_at = NOW()
    WHERE id = ? AND estado IN ('Verificando', 'pendiente_ascenso', 'verificando')
  `, [motivo, adminId, compraId]);
  
  if (result.affectedRows === 0) {
    throw new Error('No se pudo rechazar la recarga (estado no válido o ya procesada)');
  }
  
  return { success: true };
}

/**
 * Aprueba un retiro con el nuevo estado "Aceptado"
 */
export async function aprobarRetiroNuevo(retiroId, adminId) {
  return await transaction(async (conn) => {
    // 1. Lock del retiro
    const [retiroRows] = await conn.query(`SELECT * FROM retiros WHERE id = ? FOR UPDATE`, [retiroId]);
    const retiro = retiroRows[0];
    if (!retiro) throw new Error('Retiro no encontrado');
    
    // 2. Si es pasante, verificar que el patrocinador ya lo aprobó
    const esPasante = await esUsuarioPasante(retiro.usuario_id);
    if (esPasante && !retiro.aprobado_por_patrocinador) {
      throw new Error('Este retiro de pasante necesita la aprobación del patrocinador primero');
    }
    
    // 3. Verificar estado
    if (retiro.estado !== 'Verificando' && retiro.estado !== 'verificando') {
      throw new Error('El retiro no está en estado Verificando');
    }
    
    // 4. Actualizar el retiro
    await conn.query(`
      UPDATE retiros 
      SET estado = 'Aceptado', 
          estado_operativo = 'Aceptado',
          procesado_por = ?,
          procesado_at = NOW()
      WHERE id = ?
    `, [adminId, retiroId]);
    
    // 5. Registrar auditoría
    await conn.query(`
      INSERT INTO auditoria_operaciones (
        id, tipo_operacion, usuario_id, admin_id, fecha, estado_anterior, estado_nuevo, metadata
      ) VALUES (?, 'retiro_aprobado_admin', ?, ?, NOW(), 'verificando', 'Aceptado', ?)
    `, [uuidv4(), retiro.usuario_id, adminId, JSON.stringify({ retiroId, monto: retiro.monto })]);
    
    return { success: true, message: 'Retiro aprobado' };
  });
}

/**
 * Rechaza un retiro con el nuevo estado "rechazado"
 */
export async function rechazarRetiroNuevo(retiroId, adminId, motivo) {
  return await transaction(async (conn) => {
    // 1. Lock del retiro
    const [retiroRows] = await conn.query(`SELECT * FROM retiros WHERE id = ? FOR UPDATE`, [retiroId]);
    const retiro = retiroRows[0];
    if (!retiro) throw new Error('Retiro no encontrado');
    
    // 2. Verificar estado
    if (retiro.estado !== 'Verificando' && retiro.estado !== 'verificando') {
      throw new Error('El retiro no está en estado Verificando');
    }
    
    // 3. Reembolso
    const balanceField = retiro.tipo_billetera === 'comisiones' ? 'saldo_comisiones' : 'saldo_principal';
    const [userRows] = await conn.query(`SELECT * FROM usuarios WHERE id = ? FOR UPDATE`, [retiro.usuario_id]);
    const user = userRows[0];
    const oldBalance = Number(user[balanceField]);
    const amount = Number(retiro.monto);
    const newBalance = oldBalance + amount;
    
    await conn.query(`UPDATE usuarios SET ${balanceField} = ? WHERE id = ?`, [newBalance, user.id]);
    
    // 4. Actualizar el retiro
    await conn.query(`
      UPDATE retiros 
      SET estado = 'Rechazado', 
          estado_operativo = 'Rechazado',
          admin_notas = ?,
          procesado_por = ?,
          procesado_at = NOW()
      WHERE id = ?
    `, [motivo, adminId, retiroId]);
    
    // 5. Registrar movimiento
    const movimientoId = uuidv4();
    await conn.query(`
      INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
      VALUES (?, ?, ?, 'reembolso_retiro', ?, ?, ?, ?, ?)
    `, [movimientoId, user.id, retiro.tipo_billetera, amount, oldBalance, newBalance, retiroId, `Reembolso por retiro rechazado: ${motivo}`]);
    
    // 6. Notificar
    await createNotification(user.id, 'Retiro Rechazado', `Tu retiro de ${retiro.monto} Bs fue rechazado: ${motivo}`);
    
    return { success: true, message: 'Retiro rechazado y saldo reembolsado' };
  });
}


