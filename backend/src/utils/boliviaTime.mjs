/**
 * Helper para manejar el tiempo en la zona horaria de Bolivia (America/La_Paz).
 */

export const BOLIVIA_TIMEZONE = 'America/La_Paz';

/**
 * Obtiene la fecha y hora actual en Bolivia como objeto Date.
 * Si process.env.TZ ya es America/La_Paz, new Date() ya devuelve la hora correcta,
 * pero esta función asegura que sea así independientemente del entorno.
 * @returns {Date}
 */
export function getBoliviaNow() {
  const now = new Date();
  // toLocaleString garantiza la conversión a la zona horaria especificada
  return new Date(now.toLocaleString('en-US', { timeZone: BOLIVIA_TIMEZONE }));
}

/**
 * Obtiene el día de la semana actual en Bolivia (0-6, donde 0 es Domingo).
 */
export function getBoliviaDayOfWeek() {
  return getBoliviaNow().getDay();
}

/**
 * Obtiene una cadena de fecha formateada (YYYY-MM-DD) para el día actual en Bolivia.
 */
export function getBoliviaDateKey(date = getBoliviaNow()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la hora actual formateada (HH:mm:ss) para Bolivia.
 */
export function getBoliviaTimeString(date = getBoliviaNow()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toTimeString().split(' ')[0];
}

/**
 * Obtiene un ISO String que representa la hora local de Bolivia (no UTC).
 * Útil para logs y visualización.
 */
export function getBoliviaISOString(date = getBoliviaNow()) {
  const d = date instanceof Date ? date : new Date(date);
  const off = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() - off);
  return localDate.toISOString().replace('Z', '-04:00');
}
