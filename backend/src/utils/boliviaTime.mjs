/**
 * Helper para manejar el tiempo en la zona horaria de Bolivia (America/La_Paz).
 */

export const BOLIVIA_TIMEZONE = 'America/La_Paz';

/**
 * Obtiene la fecha y hora actual en Bolivia como objeto Date.
 * @returns {Date}
 */
export function getBoliviaNow() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: BOLIVIA_TIMEZONE }));
}

/**
 * Obtiene el día de la semana actual en Bolivia (0-6, donde 0 es Domingo).
 * @returns {number}
 */
export function getBoliviaDayOfWeek() {
  const now = getBoliviaNow();
  return now.getDay();
}

/**
 * Obtiene una cadena de fecha formateada (YYYY-MM-DD) para el día actual en Bolivia.
 * @returns {string}
 */
export function getBoliviaDateKey() {
  const now = getBoliviaNow();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Verifica si hoy es un día permitido para retiros en Bolivia (Martes, Miércoles, Jueves).
 * Martes = 2, Miércoles = 3, Jueves = 4.
 * @returns {boolean}
 */
export function isBoliviaWithdrawalDay() {
  const day = getBoliviaDayOfWeek();
  return day >= 2 && day <= 4;
}

/**
 * Obtiene el rango de tiempo (inicio y fin) del día actual en Bolivia en formato UTC.
 * Útil para consultas SQL.
 * @returns {{ start: Date, end: Date }}
 */
export function getBoliviaDayRangeUTC() {
  const now = getBoliviaNow();
  
  // Inicio del día en Bolivia
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  // Fin del día en Bolivia
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  // Convertir a UTC para la base de datos
  // Como 'now' ya fue ajustado a la hora de Bolivia vía toLocaleString,
  // estas fechas representan el inicio y fin del día calendario en Bolivia.
  
  return {
    start: new Date(start.toLocaleString('en-US', { timeZone: 'UTC' })),
    end: new Date(end.toLocaleString('en-US', { timeZone: 'UTC' }))
  };
}
