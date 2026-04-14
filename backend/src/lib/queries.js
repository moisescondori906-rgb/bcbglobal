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
  getDayName: () => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[boliviaTime.getDay()];
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
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Lun...

    // Feriados Hardcoded (Fallback si no hay DB)
    const holidays = ['2026-01-01', '2026-02-02', '2026-03-03', '2026-05-01', '2026-08-06'];
    const isHoliday = holidays.includes(dateStr);

    // Reglas Base (Si no hay registro en el calendario)
    const status = day || {
      fecha: dateStr,
      tipo_dia: isHoliday ? 'feriado' : (dayOfWeek === 0 ? 'mantenimiento' : 'laboral'),
      es_feriado: isHoliday ? 1 : 0,
      tareas_habilitadas: (dayOfWeek === 0 || isHoliday) ? 0 : 1, // Domingos y Feriados bloqueados por defecto
      retiros_habilitados: isHoliday ? 0 : 1,
      recargas_habilitadas: 1,
      motivo: isHoliday ? 'Feriado Nacional' : (dayOfWeek === 0 ? 'Mantenimiento Dominical' : null),
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
    return { ok: false, message: status.motivo || 'Los retiros están suspendidos temporalmente por administración.' };
  }

  const user = await findUserById(userId);
  const levels = await getLevels();
  const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));
  
  if (!userLevel || userLevel.codigo === 'internar') {
    return { ok: false, message: 'El nivel Internar no tiene permitido realizar retiros. Sube a GLOBAL 1 o superior.' };
  }

  // 1. Regla de Día de la Semana (Prioridad: Calendario > Nivel > Default)
  const dayOfWeek = boliviaTime.getDay();
  
  // Obtenemos reglas específicas del calendario para este día
  const levelRules = typeof status.reglas_niveles === 'string' 
    ? JSON.parse(status.reglas_niveles) 
    : (status.reglas_niveles || {});

  const hasSpecificCalendarRule = levelRules[userLevel.codigo]?.retiro !== undefined;

  if (hasSpecificCalendarRule) {
    if (levelRules[userLevel.codigo].retiro === false) {
      return { ok: false, message: `Los retiros para el nivel ${userLevel.nombre} están bloqueados hoy por calendario operativo.` };
    }
  } else {
    // Si no hay regla en el calendario, usamos la del nivel o el cronograma institucional
    if (userLevel.retiro_horario_habilitado) {
      // Validación por rango de días del nivel
      if (dayOfWeek < userLevel.retiro_dia_inicio || dayOfWeek > userLevel.retiro_dia_fin) {
        const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return { ok: false, message: `Tu nivel permite retiros de ${DAYS[userLevel.retiro_dia_inicio]} a ${DAYS[userLevel.retiro_dia_fin]}.` };
      }
    } else {
      // Cronograma Institucional Default: G1=Mar, G2=Mie, G3=Jue, G4=Vie, G5+=Sab
      const defaultRules = { 'global1': 2, 'global2': 3, 'global3': 4, 'global4': 5 };
      let allowedDay = defaultRules[userLevel.codigo];
      if (allowedDay === undefined && userLevel.orden >= 5) allowedDay = 6;

      if (allowedDay !== undefined && dayOfWeek !== allowedDay) {
        const DAY_NAMES = { 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
        return { ok: false, message: `Tu nivel (${userLevel.nombre}) solo permite retirar los días ${DAY_NAMES[allowedDay]}.` };
      }
    }
  }

  // 2. Regla de Horario (Prioridad: Nivel > Config Global)
  const time = boliviaTime.getTimeString();
  const config = await getPublicContent();
  
  let schedule = { enabled: true, inicio: '09:00', fin: '18:00' };
  
  if (userLevel.retiro_horario_habilitado) {
    schedule = { enabled: true, inicio: userLevel.retiro_hora_inicio, fin: userLevel.retiro_hora_fin };
  } else if (config.horario_retiro) {
    const c = typeof config.horario_retiro === 'string' ? JSON.parse(config.horario_retiro) : config.horario_retiro;
    schedule = { enabled: !!c.enabled, inicio: c.hora_inicio, fin: c.hora_fin };
  }

  if (schedule.enabled && !boliviaTime.isTimeInWindow(time, schedule.inicio, schedule.fin)) {
    return { ok: false, message: `El horario de retiros para tu nivel es de ${schedule.inicio} a ${schedule.fin} (Hora Bolivia).` };
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
  return await queryOne(`SELECT id, password_hash, password_fondo_hash, rol FROM usuarios WHERE id = ?`, [id]);
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
    
    // Aseguramos que los campos booleanos y numéricos sean correctos desde la DB
    const processed = levels.map(l => ({
      ...l,
      deposito: Number(l.deposito),
      ganancia_tarea: Number(l.ganancia_tarea),
      num_tareas_diarias: Number(l.num_tareas_diarias),
      orden: Number(l.orden),
      activo: !!l.activo,
      retiro_horario_habilitado: !!l.retiro_horario_habilitado,
      retiro_dia_inicio: l.retiro_dia_inicio !== null ? Number(l.retiro_dia_inicio) : 1,
      retiro_dia_fin: l.retiro_dia_fin !== null ? Number(l.retiro_dia_fin) : 5
    }));

    levelsCache.data = processed;
    levelsCache.lastFetch = now;

    return processed.map(l => {
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
    
    // 1. Verificar idempotencia (Si ya hizo esta tarea específica hoy)
    const [alreadyDone] = await conn.query(`SELECT id FROM actividad_tareas WHERE usuario_id = ? AND tarea_id = ? AND fecha_dia = ?`, [userId, taskId, today]);
    if (alreadyDone.length > 0) throw new Error('Tarea ya completada hoy');

    // 2. Bloquear usuario para evitar race conditions de saldo y contador de tareas
    const [userRows] = await conn.query(`
      SELECT u.id, u.saldo_principal, n.ganancia_tarea, n.num_tareas_diarias 
      FROM usuarios u 
      JOIN niveles n ON u.nivel_id = n.id 
      WHERE u.id = ? FOR UPDATE`, [userId]);
    
    const user = userRows[0];
    if (!user) throw new Error('Usuario no encontrado');

    // 3. Verificar límite de tareas diarias (Contar cuántas lleva hoy)
    const [countRows] = await conn.query(`SELECT COUNT(*) as total FROM actividad_tareas WHERE usuario_id = ? AND fecha_dia = ?`, [userId, today]);
    if (countRows[0].total >= user.num_tareas_diarias) throw new Error('Has alcanzado tu límite de tareas diarias para tu nivel.');

    const amount = Number(user.ganancia_tarea);
    const oldBalance = Number(user.saldo_principal);
    const newBalance = oldBalance + amount;

    // 4. Insertar Actividad
    const activityId = uuidv4();
    await conn.query(`INSERT INTO actividad_tareas (id, usuario_id, tarea_id, monto_ganado, fecha_dia) VALUES (?, ?, ?, ?, ?)`, 
      [activityId, userId, taskId, amount, today]);

    // 5. Actualizar Saldo
    await conn.query(`UPDATE usuarios SET saldo_principal = ? WHERE id = ?`, [newBalance, userId]);

    // 6. Registrar Movimiento de Saldo
    await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
      VALUES (?, ?, 'principal', 'tarea', ?, ?, ?, ?, ?)`, 
      [uuidv4(), userId, amount, oldBalance, newBalance, activityId, 'Ganancia por tarea publicitaria completada']);

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
    if (!user) throw new Error('Usuario no encontrado');
    const oldBalance = Number(user.saldo_principal);

    if (targetLevel) {
      // Ascenso de Nivel
      const ticketsToAdd = Number(targetLevel.orden); // Regla: global1=1, global2=2...
      
      await conn.query(`UPDATE usuarios SET nivel_id = ?, tickets_ruleta = tickets_ruleta + ? WHERE id = ?`, 
        [targetLevel.id, ticketsToAdd, usuario_id]);
      
      // Registrar notificación de ascenso
      await conn.query(`INSERT INTO notificaciones (id, usuario_id, titulo, mensaje) VALUES (?, ?, ?, ?)`,
        [uuidv4(), usuario_id, '¡Felicidades!', `Has ascendido a ${targetLevel.nombre}. Recibiste ${ticketsToAdd} tickets de ruleta.`]);
      
      logger.info(`[RECHARGE] Usuario ${usuario_id} ascendido a ${targetLevel.nombre} por monto ${monto}`);
    } else {
      // Recarga de Saldo simple
      const newBalance = oldBalance + Number(monto);
      await conn.query(`UPDATE usuarios SET saldo_principal = ? WHERE id = ?`, [newBalance, usuario_id]);
      
      await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
        VALUES (?, ?, 'principal', 'recarga', ?, ?, ?, ?, ?)`, 
        [uuidv4(), usuario_id, monto, oldBalance, newBalance, recargaId, 'Recarga de saldo aprobada']);
      
      logger.info(`[RECHARGE] Saldo de usuario ${usuario_id} incrementado en ${monto}`);
    }

    await conn.query(`UPDATE recargas SET estado = 'aprobada', procesado_por = ?, procesado_at = NOW() WHERE id = ?`, [adminId, recargaId]);

    return { success: true, levelUp: !!targetLevel };
  });
}

export async function approveRetiro(retiroId, adminId) {
  return await transaction(async (conn) => {
    const [retiroRows] = await conn.query(`SELECT * FROM retiros WHERE id = ? AND estado = 'pendiente' FOR UPDATE`, [retiroId]);
    const retiro = retiroRows[0];
    if (!retiro) throw new Error('Retiro no encontrado o ya procesado');

    await conn.query(`UPDATE retiros SET estado = 'completado', procesado_por = ?, procesado_at = NOW() WHERE id = ?`, [adminId, retiroId]);

    logger.info(`[WITHDRAWAL] Retiro ${retiroId} aprobado por admin ${adminId}`);
    return { success: true };
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
    if (!user) throw new Error('Usuario no encontrado');
    const oldBalance = Number(user.balance);
    const newBalance = oldBalance + Number(monto);

    await conn.query(`UPDATE usuarios SET ${field} = ? WHERE id = ?`, [newBalance, usuario_id]);

    await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
      VALUES (?, ?, ?, 'reembolso_retiro', ?, ?, ?, ?, ?)`, 
      [uuidv4(), usuario_id, tipo_billetera, monto, oldBalance, newBalance, retiroId, `Reembolso por retiro rechazado: ${motivo}`]);

    await conn.query(`UPDATE retiros SET estado = 'rechazado', admin_notas = ?, procesado_por = ?, procesado_at = NOW() WHERE id = ?`, [motivo, adminId, retiroId]);

    logger.info(`[WITHDRAWAL] Retiro ${retiroId} rechazado. Motivo: ${motivo}. Reembolso de ${monto} a ${tipo_billetera}`);
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
      
      await transaction(async (conn) => {
        const [uplineRows] = await conn.query(`
          SELECT u.*, n.orden as nivel_orden, n.codigo as nivel_codigo 
          FROM usuarios u 
          LEFT JOIN niveles n ON u.nivel_id = n.id 
          WHERE u.id = ? FOR UPDATE`, [currentUplineId]);
        
        const upline = uplineRows[0];
        if (!upline) return;

        // REGLA DE JERARQUÍA: 
        // 1. Internares no cobran comisiones.
        // 2. El nivel del upline debe ser mayor o igual al nivel del usuario que genera la comisión.
        if (upline.nivel_codigo === 'internar' || Number(upline.nivel_orden) < Number(userLevel.orden)) {
          currentUplineId = upline.invitado_por;
          return;
        }

        const commission = Number((amount * config.percent).toFixed(2));
        if (commission > 0) {
          const oldBalance = Number(upline.saldo_comisiones);
          const newBalance = oldBalance + commission;

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
  return await queryOne(`SELECT * FROM usuarios WHERE rol = 'admin' AND last_device_id = ?`, [id]);
}

export async function getDailyWithdrawalSummary() {
  const today = boliviaTime.todayStr();
  return await queryOne(`SELECT COUNT(*) as total, SUM(monto) as monto FROM retiros WHERE DATE(created_at) = ?`, [today]);
}

export async function getDashboardStats() {
  const [userCount, rechargeTotal, withdrawalTotal, activeTasks] = await Promise.all([
    queryOne(`SELECT COUNT(*) as total FROM usuarios WHERE rol = 'usuario'`),
    queryOne(`SELECT SUM(monto) as total FROM recargas WHERE estado = 'aprobada'`),
    queryOne(`SELECT SUM(monto) as total FROM retiros WHERE estado = 'completado'`),
    queryOne(`SELECT COUNT(*) as total FROM actividad_tareas WHERE fecha_dia = ?`, [boliviaTime.todayStr()])
  ]);

  return {
    usuarios: userCount.total,
    recargas: Number(rechargeTotal.total || 0),
    retiros: Number(withdrawalTotal.total || 0),
    tareas_hoy: activeTasks.total
  };
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
    const userLevel = levels.find(l => String(l.id) === String(user.nivel_id));
    if (!userLevel) return;

    // REGLA OFICIAL: 
    // Nivel A (Directo) = 0% por tareas.
    // Nivel B = 2%, Nivel C = 1%
    const configs = [
      { key: 'A', percent: 0.00 },
      { key: 'B', percent: 0.02 },
      { key: 'C', percent: 0.01 }
    ];

    let currentUplineId = user.invitado_por;
    for (const config of configs) {
      if (!currentUplineId) break;
      
      // Si el porcentaje es 0, pasamos al siguiente nivel sin procesar transacción
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

        // REGLA DE JERARQUÍA: 
        // 1. Internares no cobran comisiones.
        // 2. El nivel del upline debe ser mayor o igual al nivel del usuario que genera la comisión.
        if (upline.nivel_codigo === 'internar' || Number(upline.nivel_orden) < Number(userLevel.orden)) {
          currentUplineId = upline.invitado_por;
          return;
        }

        const commission = Number((taskAmount * config.percent).toFixed(2));
        if (commission > 0) {
          const oldBalance = Number(upline.saldo_comisiones);
          const newBalance = oldBalance + commission;

          await conn.query(`UPDATE usuarios SET saldo_comisiones = ? WHERE id = ?`, [newBalance, upline.id]);
          
          await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
            VALUES (?, ?, 'comisiones', 'comision_tarea', ?, ?, ?, ?, ?)`, 
            [uuidv4(), upline.id, commission, oldBalance, newBalance, user.id, `Comisión Tarea Publicitaria Nivel ${config.key} de ${user.nombre_usuario}`]);
        }
        currentUplineId = upline.invitado_por;
      });
    }
  } catch (err) {
    logger.error(`[Task Commissions Error]: ${err.message}`);
  }
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

    // Obtener comisiones acumuladas por nivel de red
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
      WHERE usuario_id = ? AND tipo_movimiento IN ('comision_tarea', 'comision_inversion')
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
        comisiones_hoy: 0 // Podría calcularse si fuera necesario
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
    // 1. Limpiar actividad de tareas antigua (opcional, p.ej. más de 30 días)
    // await query(`DELETE FROM actividad_tareas WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`);
    
    // 2. Resetear contador de tareas si se usara un campo denormalizado en usuarios
    // Pero como lo calculamos dinámicamente con COUNT(*), no es necesario.
    
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
