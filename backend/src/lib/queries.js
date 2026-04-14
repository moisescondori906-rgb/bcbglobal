import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, transaction } from '../config/db.js';
import logger from './logger.js';

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
  banners: []
};

const DEFAULT_LEVELS = [
  { id: 'l1', codigo: 'internar', nombre: 'Internar', deposito: 0, num_tareas_diarias: 2, ganancia_tarea: 1.30, orden: 0, activo: 1 },
  { id: 'l2', codigo: 'global1', nombre: 'GLOBAL 1', deposito: 200.00, num_tareas_diarias: 4, ganancia_tarea: 1.80, orden: 1, activo: 1 },
  { id: 'l3', codigo: 'global2', nombre: 'GLOBAL 2', deposito: 720.00, num_tareas_diarias: 8, ganancia_tarea: 3.22, orden: 2, activo: 1 },
  { id: 'l4', codigo: 'global3', nombre: 'GLOBAL 3', deposito: 2830.00, num_tareas_diarias: 15, ganancia_tarea: 6.76, orden: 3, activo: 1 },
  { id: 'l5', codigo: 'global4', nombre: 'GLOBAL 4', deposito: 9150.00, num_tareas_diarias: 30, ganancia_tarea: 11.33, orden: 4, activo: 1 },
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
  now: () => {
    // Obtenemos la fecha UTC y la desplazamos a GMT-4 (Bolivia)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * -4));
  },
  todayStr: () => {
    const d = boliviaTime.now();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  yesterdayStr: () => {
    const d = boliviaTime.now();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  getDateString: (date) => {
    if (!date) return '';
    const d = new Date(date);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const bol = new Date(utc + (3600000 * -4));
    return bol.toISOString().split('T')[0];
  },
  getTimeString: (date = new Date()) => {
    const d = new Date(date);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const bol = new Date(utc + (3600000 * -4));
    return bol.toTimeString().substring(0, 5);
  },
  getDay: () => {
    return boliviaTime.now().getDay();
  },
  isTimeInWindow: (timeStr, start = '00:00', end = '23:59') => {
    if (start <= end) return timeStr >= start && timeStr <= end;
    return timeStr >= start || timeStr <= end;
  }
};

// ========================
// 0. CALENDARIO OPERATIVO (Validaciones Centralizadas)
// ========================

/**
 * Obtiene el estado operativo para una fecha específica
 */
export async function getDayStatus(dateStr = boliviaTime.todayStr()) {
  try {
    const day = await queryOne(`SELECT * FROM calendario_operativo WHERE fecha = ?`, [dateStr]);
    
    // Obtenemos el día de la semana de forma segura en UTC para comparar
    // dateStr es YYYY-MM-DD
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0=Dom, 1=Lun...

    // Reglas Base (Si no hay registro en el calendario)
    const status = day || {
      fecha: dateStr,
      tipo_dia: dayOfWeek === 0 ? 'mantenimiento' : 'laboral',
      es_feriado: 0,
      tareas_habilitadas: dayOfWeek === 0 ? 0 : 1, // Domingos bloqueados por defecto
      retiros_habilitados: 1,
      recargas_habilitadas: 1,
      motivo: dayOfWeek === 0 ? 'Mantenimiento Dominical' : null,
      reglas_niveles: {}
    };

    return status;
  } catch (e) {
    logger.error(`[Calendar] Error getting status for ${dateStr}: ${e.message}`);
    return null;
  }
}

/**
 * Validación Centralizada: ¿Puede realizar tareas hoy?
 */
export async function canPerformTasks(userId, dateStr = boliviaTime.todayStr()) {
  const status = await getDayStatus(dateStr);
  if (!status) return { ok: true }; // Fallback permisivo si falla la DB

  if (!status.tareas_habilitadas) {
    return { ok: false, message: status.motivo || 'Las tareas están suspendidas por hoy.' };
  }

  // Verificar reglas por nivel si existen
  const user = await findUserById(userId);
  const levels = await getLevels();
  const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));

  if (status.reglas_niveles) {
    const levelRules = typeof status.reglas_niveles === 'string' 
      ? JSON.parse(status.reglas_niveles) 
      : status.reglas_niveles;

    if (levelRules[userLevel?.codigo]?.tareas === false) {
      return { ok: false, message: `Las tareas no están habilitadas para el nivel ${userLevel?.nombre} hoy.` };
    }
  }

  return { ok: true };
}

/**
 * Validación Centralizada: ¿Puede retirar hoy?
 */
export async function canWithdraw(userId, dateStr = boliviaTime.todayStr()) {
  const status = await getDayStatus(dateStr);
  if (!status) return { ok: true };

  if (!status.retiros_habilitados) {
    return { ok: false, message: status.motivo || 'Los retiros están suspendidos temporalmente.' };
  }

  const user = await findUserById(userId);
  const levels = await getLevels();
  const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));
  
  if (userLevel?.codigo === 'internar') {
    return { ok: false, message: 'El nivel Internar no tiene permitido realizar retiros.' };
  }

  // Regla: G1=Mar(2), G2=Mie(3), G3=Jue(4), G4=Vie(5), G5+=Sab(6)
  const dayOfWeek = boliviaTime.getDay();
  const rules = {
    'global1': 2,
    'global2': 3,
    'global3': 4,
    'global4': 5
  };

  let allowedDay = rules[userLevel?.codigo];
  if (allowedDay === undefined && userLevel && userLevel.orden >= 5) {
    allowedDay = 6; // Sábado
  }

  // Solo validar día si no hay una regla específica de calendario para este día
  const levelRules = typeof status.reglas_niveles === 'string' 
    ? JSON.parse(status.reglas_niveles) 
    : status.reglas_niveles;

  const hasSpecificRule = levelRules && levelRules[userLevel?.codigo]?.retiro !== undefined;

  if (hasSpecificRule) {
    if (levelRules[userLevel?.codigo]?.retiro === false) {
      return { ok: false, message: `Los retiros no están habilitados para el nivel ${userLevel?.nombre} hoy según calendario.` };
    }
  } else {
    // Si no hay regla específica en el calendario, aplicamos el cronograma semanal institucional
    if (allowedDay !== undefined && dayOfWeek !== allowedDay) {
      const DAY_NAMES = { 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
      const dayName = DAY_NAMES[allowedDay] || 'su día asignado';
      return { ok: false, message: `Tu nivel (${userLevel?.nombre}) solo permite retirar los días ${dayName}.` };
    }
  }

  // Regla de Horario (si existe en el nivel o config)
  const time = boliviaTime.getTimeString();
  const config = await getPublicContent();
  const schedule = userLevel?.retiro_horario_habilitado 
    ? { enabled: true, hora_inicio: userLevel.retiro_hora_inicio, hora_fin: userLevel.retiro_hora_fin }
    : config.horario_retiro;

  if (schedule?.enabled && !boliviaTime.isTimeInWindow(time, schedule.hora_inicio, schedule.hora_fin)) {
    return { ok: false, message: `El horario de retiros es de ${schedule.hora_inicio} a ${schedule.hora_fin} (Bolivia).` };
  }

  return { ok: true };
}

// ========================
// 1. USUARIOS & AUTH
// ========================

const USER_FIELDS = `id, telefono, nombre_usuario, nombre_real, codigo_invitacion, invitado_por, nivel_id, avatar_url, saldo_principal, saldo_comisiones, rol, bloqueado, tickets_ruleta, primer_ascenso_completado, last_device_id, created_at`;

export async function findUserById(id) {
  const now = Date.now();
  if (userCache.has(id)) {
    const cached = userCache.get(id);
    if (now - cached.timestamp < USER_CACHE_TTL) return cached.data;
  }

  const user = await queryOne(`SELECT ${USER_FIELDS} FROM usuarios WHERE id = ?`, [id]);
  if (user) userCache.set(id, { data: user, timestamp: now });
  return user;
}

export async function findUserByTelefono(telefono) {
  return await queryOne(`SELECT password_hash, ${USER_FIELDS} FROM usuarios WHERE telefono = ?`, [telefono]);
}

export async function findUserWithAuthSecrets(id) {
  return await queryOne(`SELECT password_hash, password_fondo_hash, ${USER_FIELDS} FROM usuarios WHERE id = ?`, [id]);
}

export async function createUser(userData) {
  const sql = `INSERT INTO usuarios (id, telefono, nombre_usuario, nombre_real, password_hash, password_fondo_hash, codigo_invitacion, invitado_por, nivel_id, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    userData.id || uuidv4(),
    userData.telefono,
    userData.nombre_usuario,
    userData.nombre_real,
    userData.password_hash,
    userData.password_fondo_hash,
    userData.codigo_invitacion,
    userData.invitado_por,
    userData.nivel_id,
    userData.rol || 'usuario'
  ];
  await query(sql, params);
  return await findUserById(params[0]);
}

export async function updateUser(id, updates) {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const params = [...Object.values(updates), id];
  
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
  if (levelsCache.data && now - levelsCache.lastFetch < 60000) {
    return levelsCache.data.map(l => {
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

  try {
    const levels = await query(`SELECT * FROM niveles ORDER BY orden ASC`);
    if (levels.length === 0) {
      // Si no hay niveles en la DB, sincronizar con los defaults
      await syncLevels();
      return getLevels();
    }
    levelsCache.data = levels;
    levelsCache.lastFetch = now;
    return levels.map(l => {
      const ingreso_diario = Number((Number(l.num_tareas_diarias) * Number(l.ganancia_tarea)).toFixed(2));
      const isInternar = String(l.codigo).toLowerCase() === 'internar';
      return {
        ...l,
        ingreso_diario,
        ingreso_mensual: isInternar ? 0 : Number((ingreso_diario * 30).toFixed(2)),
        ingreso_anual: isInternar ? 0 : Number((ingreso_diario * 365).toFixed(2))
      };
    });
  } catch (e) {
    logger.warn('[DB] Usando niveles por defecto (DB Offline)');
    return DEFAULT_LEVELS.map(l => {
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
  return await transaction(async (conn) => {
    for (const level of DEFAULT_LEVELS) {
      await conn.query(`
        INSERT INTO niveles (id, codigo, nombre, deposito, ganancia_tarea, num_tareas_diarias, orden, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          nombre = VALUES(nombre),
          deposito = VALUES(deposito),
          ganancia_tarea = VALUES(ganancia_tarea),
          num_tareas_diarias = VALUES(num_tareas_diarias),
          orden = VALUES(orden),
          activo = VALUES(activo)
      `, [level.id, level.codigo, level.nombre, level.deposito, level.ganancia_tarea, level.num_tareas_diarias, level.orden, level.activo]);
    }
    // Eliminar niveles que no estén en los defaults (G1, G2, etc)
    const codes = DEFAULT_LEVELS.map(l => l.codigo);
    await conn.query(`DELETE FROM niveles WHERE codigo NOT IN (?)`, [codes]);
    invalidateLevelsCache();
    logger.info('[LEVELS] Niveles sincronizados con éxito.');
  });
}

export async function preloadLevels() {
  const levels = await getLevels();
  // Guardamos los niveles calculados en el caché
  levelsCache.data = levels;
  levelsCache.lastFetch = Date.now();
  return levels;
}

export async function invalidateLevelsCache() {
  levelsCache.data = null;
  levelsCache.lastFetch = 0;
}

// ========================
// 3. TAREAS & ACTIVIDAD (Economía unificada)
// ========================

export async function getTasks() {
  return await query(`SELECT * FROM tareas WHERE activa = 1 ORDER BY orden ASC`);
}

export async function getTaskById(id) {
  return await queryOne(`SELECT * FROM tareas WHERE id = ?`, [id]);
}

/**
 * Acredita una tarea con Idempotencia real y Transacción
 */
export async function completeTask(userId, taskId) {
  return await transaction(async (conn) => {
    const today = boliviaTime.todayStr();
    
    // 1. Verificar idempotencia
    const [alreadyDone] = await conn.query(`SELECT id FROM actividad_tareas WHERE usuario_id = ? AND tarea_id = ? AND fecha_dia = ?`, [userId, taskId, today]);
    if (alreadyDone.length > 0) throw new Error('Tarea ya completada hoy');

    // 2. Obtener datos del usuario y su nivel
    const [userRows] = await conn.query(`SELECT u.id, u.saldo_principal, n.ganancia_tarea, n.num_tareas_diarias FROM usuarios u JOIN niveles n ON u.nivel_id = n.id WHERE u.id = ? FOR UPDATE`, [userId]);
    const user = userRows[0];
    if (!user) throw new Error('Usuario no encontrado');

    // 3. Verificar límite de tareas diarias
    const [countRows] = await conn.query(`SELECT COUNT(*) as total FROM actividad_tareas WHERE usuario_id = ? AND fecha_dia = ?`, [userId, today]);
    if (countRows[0].total >= user.num_tareas_diarias) throw new Error('Límite de tareas diarias alcanzado');

    const amount = Number(user.ganancia_tarea);
    const newBalance = Number(user.saldo_principal) + amount;

    // 4. Insertar Actividad
    const activityId = uuidv4();
    await conn.query(`INSERT INTO actividad_tareas (id, usuario_id, tarea_id, monto_ganado, fecha_dia) VALUES (?, ?, ?, ?, ?)`, 
      [activityId, userId, taskId, amount, today]);

    // 5. Actualizar Saldo
    await conn.query(`UPDATE usuarios SET saldo_principal = ? WHERE id = ?`, [newBalance, userId]);

    // 6. Registrar Movimiento
    await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
      VALUES (?, ?, 'principal', 'tarea', ?, ?, ?, ?, ?)`, 
      [uuidv4(), userId, amount, user.saldo_principal, newBalance, activityId, 'Ganancia por tarea completada']);

    return { success: true, amount };
  });
}

// ========================
// 4. RECARGAS & RETIROS (Transaccionales)
// ========================

export async function approveRecarga(recargaId, adminId) {
  return await transaction(async (conn) => {
    const [recargaRows] = await conn.query(`SELECT * FROM recargas WHERE id = ? AND estado = 'pendiente' FOR UPDATE`, [recargaId]);
    const recarga = recargaRows[0];
    if (!recarga) throw new Error('Recarga no encontrada o ya procesada');

    const { usuario_id, monto } = recarga;

    const [levels] = await conn.query(`SELECT * FROM niveles ORDER BY deposito DESC`);
    const targetLevel = levels.find(l => Number(l.deposito) === Number(monto));

    const [userRows] = await conn.query(`SELECT * FROM usuarios WHERE id = ? FOR UPDATE`, [usuario_id]);
    const user = userRows[0];
    const oldBalance = user.saldo_principal;

    if (targetLevel) {
      // Ascenso de Nivel
      const ticketsToAdd = Number(targetLevel.orden); // Regla: global1=1, global2=2...
      
      await conn.query(`UPDATE usuarios SET nivel_id = ?, tickets_ruleta = tickets_ruleta + ? WHERE id = ?`, 
        [targetLevel.id, ticketsToAdd, usuario_id]);
      
      // Registrar notificación de ascenso
      await conn.query(`INSERT INTO notificaciones (id, usuario_id, titulo, mensaje) VALUES (?, ?, ?, ?)`,
        [uuidv4(), usuario_id, '¡Felicidades!', `Has ascendido a ${targetLevel.nombre}. Recibiste ${ticketsToAdd} tickets de ruleta.`]);
    } else {
      // Recarga de Saldo simple
      const newBalance = Number(oldBalance) + Number(monto);
      await conn.query(`UPDATE usuarios SET saldo_principal = ? WHERE id = ?`, [newBalance, usuario_id]);
      
      await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
        VALUES (?, ?, 'principal', 'recarga', ?, ?, ?, ?, ?)`, 
        [uuidv4(), usuario_id, monto, oldBalance, newBalance, recargaId, 'Recarga de saldo aprobada']);
    }

    await conn.query(`UPDATE recargas SET estado = 'aprobada', procesado_por = ?, procesado_at = NOW() WHERE id = ?`, [adminId, recargaId]);

    return { success: true, levelUp: !!targetLevel };
  });
}

export async function rejectRetiro(retiroId, adminId, motivo) {
  return await transaction(async (conn) => {
    const [retiroRows] = await conn.query(`SELECT * FROM retiros WHERE id = ? AND estado = 'pendiente' FOR UPDATE`, [retiroId]);
    const retiro = retiroRows[0];
    if (!retiro) throw new Error('Retiro no encontrado o ya procesada');

    const { usuario_id, monto, tipo_billetera } = retiro;
    const field = tipo_billetera === 'comisiones' ? 'saldo_comisiones' : 'saldo_principal';

    const [userRows] = await conn.query(`SELECT ${field} as balance FROM usuarios WHERE id = ? FOR UPDATE`, [usuario_id]);
    const user = userRows[0];
    const oldBalance = user.balance;
    const newBalance = Number(oldBalance) + Number(monto);

    await conn.query(`UPDATE usuarios SET ${field} = ? WHERE id = ?`, [newBalance, usuario_id]);

    await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
      VALUES (?, ?, ?, 'reembolso_retiro', ?, ?, ?, ?, ?)`, 
      [uuidv4(), usuario_id, tipo_billetera, monto, oldBalance, newBalance, retiroId, `Reembolso por retiro rechazado: ${motivo}`]);

    await conn.query(`UPDATE retiros SET estado = 'rechazado', admin_notas = ?, procesado_por = ?, procesado_at = NOW() WHERE id = ?`, [motivo, adminId, retiroId]);

    return { success: true };
  });
}

export async function getRecargaById(id) {
  return await queryOne(`SELECT * FROM recargas WHERE id = ?`, [id]);
}

export async function updateRecarga(id, updates) {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const params = [...Object.values(updates), id];
  await query(`UPDATE recargas SET ${setClause} WHERE id = ?`, params);
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

export async function distributeInvestmentCommissions(userId, amount) {
  try {
    const user = await findUserById(userId);
    if (!user || !user.invitado_por) return;

    const levels = await getLevels();
    const userLevel = levels.find(l => l.id === user.nivel_id);
    // Un pasante no genera comisiones para su red al subir de nivel (si es que se permite)
    // Pero aquí el 'user' es quien acaba de recargar/comprar.
    if (!userLevel) return;

    const configs = [
      { key: 'A', percent: 0.10 },
      { key: 'B', percent: 0.03 },
      { key: 'C', percent: 0.01 }
    ];

    let currentUplineId = user.invitado_por;
    for (const config of configs) {
      if (!currentUplineId) break;
      
      await transaction(async (conn) => {
        const [uplineRows] = await conn.query(`
          SELECT u.*, n.orden as nivel_orden, n.codigo as nivel_codigo 
          FROM usuarios u 
          LEFT JOIN niveles n ON u.nivel_id = n.id 
          WHERE u.id = ? FOR UPDATE`, [currentUplineId]);
        
        const upline = uplineRows[0];
        if (!upline) return;

        // REGLA OFICIAL: 
        // 1. Internares no cobran comisiones.
        // 2. El nivel del upline debe ser mayor o igual al nivel del usuario que genera la comisión.
        if (upline.nivel_codigo === 'internar' || upline.nivel_orden < userLevel.orden) {
          currentUplineId = upline.invitado_por;
          return;
        }

        const commission = Number((amount * config.percent).toFixed(2));
        if (commission > 0) {
          const oldBalance = upline.saldo_comisiones;
          const newBalance = Number(oldBalance) + commission;

          await conn.query(`UPDATE usuarios SET saldo_comisiones = ? WHERE id = ?`, [newBalance, upline.id]);
          
          await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
            VALUES (?, ?, 'comisiones', 'comision_inversion', ?, ?, ?, ?, ?)`, 
            [uuidv4(), upline.id, commission, oldBalance, newBalance, user.id, `Comisión Inversión Nivel ${config.key} de ${user.nombre_usuario}`]);
        }
        currentUplineId = upline.invitado_por;
      });
    }
  } catch (err) {
    logger.error(`[Commissions Error]: ${err.message}`);
  }
}

// ========================
// 6. CONFIGURACIÓN & MENSAJES
// ========================

export async function getPublicContent() {
  const now = Date.now();
  if (configCache.data && now - configCache.lastFetch < 300000) return configCache.data;

  try {
    const rows = await query(`SELECT * FROM configuraciones`);
    const config = rows.reduce((acc, r) => ({ ...acc, [r.clave]: r.valor }), {});
    
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

export async function preloadConfig() {
  const config = await getPublicContent();
  configCache.data = config;
  configCache.lastFetch = Date.now();
  return config;
}

export async function refreshPublicContent() {
  configCache.data = null;
  configCache.lastFetch = 0;
  return await getPublicContent();
}

export async function getMensajesGlobales() {
  try {
    return await query(`SELECT * FROM mensajes_globales WHERE activo = 1 ORDER BY fecha DESC`);
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
  return await queryOne(`SELECT * FROM usuarios WHERE rol = 'admin' AND last_device_id = ?`, [id]);
}

export async function getDailyWithdrawalSummary() {
  const today = boliviaTime.todayStr();
  return await queryOne(`SELECT COUNT(*) as total, SUM(monto) as monto FROM retiros WHERE DATE(created_at) = ?`, [today]);
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

export async function distributeTaskCommissions(userId, taskAmount) {
  try {
    const user = await findUserById(userId);
    if (!user || !user.invitado_por) return;

    const levels = await getLevels();
    const userLevel = levels.find(l => l.id === user.nivel_id);
    if (!userLevel) return;

    // REGLA: Nivel A (Directo) = 0% por tareas.
    // Nivel B = 2%, Nivel C = 1% (Si el negocio lo permite)
    const configs = [
      { key: 'A', percent: 0.00 }, // El usuario dijo 0% por tareas para nivel A
      { key: 'B', percent: 0.02 },
      { key: 'C', percent: 0.01 }
    ];

    let currentUplineId = user.invitado_por;
    for (const config of configs) {
      if (!currentUplineId) break;
      if (config.percent === 0) {
        const upline = await findUserById(currentUplineId);
        currentUplineId = upline?.invitado_por;
        continue;
      }

      await transaction(async (conn) => {
        const [uplineRows] = await conn.query(`
          SELECT u.*, n.orden as nivel_orden, n.codigo as nivel_codigo 
          FROM usuarios u 
          LEFT JOIN niveles n ON u.nivel_id = n.id 
          WHERE u.id = ? FOR UPDATE`, [currentUplineId]);
        
        const upline = uplineRows[0];
        if (!upline) return;

        // REGLA OFICIAL: 
        // 1. Internares no cobran comisiones.
        // 2. El nivel del upline debe ser mayor o igual al nivel del usuario que genera la comisión.
        if (upline.nivel_codigo === 'internar' || upline.nivel_orden < userLevel.orden) {
          currentUplineId = upline.invitado_por;
          return;
        }

        const commission = Number((taskAmount * config.percent).toFixed(2));
        if (commission > 0) {
          const oldBalance = upline.saldo_comisiones;
          const newBalance = Number(oldBalance) + commission;

          await conn.query(`UPDATE usuarios SET saldo_comisiones = ? WHERE id = ?`, [newBalance, upline.id]);
          
          await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
            VALUES (?, ?, 'comisiones', 'comision_tarea', ?, ?, ?, ?, ?)`, 
            [uuidv4(), upline.id, commission, oldBalance, newBalance, user.id, `Comisión Tarea Nivel ${config.key} de ${user.nombre_usuario}`]);
        }
        currentUplineId = upline.invitado_por;
      });
    }
  } catch (err) {
    logger.error(`[Task Commissions Error]: ${err.message}`);
  }
}

export async function getUserTeamReport(userId) {
  // 1. Obtener todos los descendientes en 3 niveles
  const team = {
    resumen: {
      total_miembros: 0,
      ingresos_totales: 0,
      miembros_activos: 0
    },
    niveles: [
      { nivel: 'A', total_miembros: 0, monto_recarga: 0, porcentaje: 10 },
      { nivel: 'B', total_miembros: 0, monto_recarga: 0, porcentaje: 3 },
      { nivel: 'C', total_miembros: 0, monto_recarga: 0, porcentaje: 1 }
    ]
  };

  try {
    // Miembros Nivel A (Directos)
    const levelA = await query(`SELECT id, nivel_id, saldo_comisiones FROM usuarios WHERE invitado_por = ?`, [userId]);
    team.niveles[0].total_miembros = levelA.length;
    
    const idsA = levelA.map(u => u.id);
    if (idsA.length > 0) {
      // Miembros Nivel B
      const levelB = await query(`SELECT id, nivel_id FROM usuarios WHERE invitado_por IN (?)`, [idsA]);
      team.niveles[1].total_miembros = levelB.length;
      
      const idsB = levelB.map(u => u.id);
      if (idsB.length > 0) {
        // Miembros Nivel C
        const levelC = await query(`SELECT id, nivel_id FROM usuarios WHERE invitado_por IN (?)`, [idsB]);
        team.niveles[2].total_miembros = levelC.length;
      }
    }

    team.resumen.total_miembros = team.niveles[0].total_miembros + team.niveles[1].total_miembros + team.niveles[2].total_miembros;

    // Ingresos totales por comisiones desde movimientos_saldo
    const totalEarnings = await queryOne(`
      SELECT SUM(monto) as total FROM movimientos_saldo 
      WHERE usuario_id = ? AND tipo_billetera = 'comisiones' AND tipo_movimiento IN ('comision_inversion', 'comision_tarea')
    `, [userId]);
    team.resumen.ingresos_totales = Number(totalEarnings?.total || 0);

    // Comisiones específicas por nivel (aproximación basada en movimientos)
    // Para ser exactos, necesitaríamos que movimientos_saldo tenga el nivel del referente, pero podemos agrupar por referencia_id
    // Por simplicidad para este reporte, mostramos los totales acumulados por el usuario
    const commissionsByLevel = await query(`
      SELECT tipo_movimiento, SUM(monto) as total FROM movimientos_saldo 
      WHERE usuario_id = ? AND tipo_billetera = 'comisiones'
      GROUP BY tipo_movimiento
    `, [userId]);

    // Asignamos montos a los niveles de forma ilustrativa si no hay desglose exacto en BD
    // (En un sistema real, guardaríamos el nivel de profundidad en movimientos_saldo)
    team.niveles[0].monto_recarga = Number(commissionsByLevel.find(c => c.tipo_movimiento === 'comision_inversion')?.total || 0);
    
    return team;
  } catch (err) {
    logger.error(`[Team Report Error]: ${err.message}`);
    return team;
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
    // No reseteamos nada de cuestionarios ni sanciones aquí, solo estadísticas de tareas si fuera necesario
    // Aunque el sistema actual usa fecha_dia en actividad_tareas, no requiere un truncate diario.
    logger.audit('[CRON] Verificación diaria completada.');
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
    [id, data.usuario_id, data.premio_id, data.monto_ganado || 0]);
  return { id, ...data };
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
