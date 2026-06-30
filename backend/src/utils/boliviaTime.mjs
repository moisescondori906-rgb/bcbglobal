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
 */
export function getBoliviaISOString(date = getBoliviaNow()) {
  const d = date instanceof Date ? date : new Date(date);
  const off = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() - off);
  return localDate.toISOString().replace('Z', '-04:00');
}

/**
 * Obtiene el día de la semana como texto en español (Domingo, Lunes, etc.).
 */
export function getBoliviaDayName(date = getBoliviaNow()) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[new Date(date).getDay()];
}

/**
 * Verifica si la hora está dentro de un intervalo.
 */
export function isTimeInWindow(timeStr, startTimeStr, endTimeStr) {
  if (startTimeStr <= endTimeStr) {
    return (timeStr >= startTimeStr && timeStr <= endTimeStr);
  }
  return (timeStr >= startTimeStr || timeStr <= endTimeStr);
}

// Aliases para compatibilidad hacia atrás
export const getPeruNow = getBoliviaNow;
export const getPeruDayOfWeek = getBoliviaDayOfWeek;
export const getPeruDateKey = getBoliviaDateKey;
export const getPeruTimeString = getBoliviaTimeString;
export const getPeruISOString = getBoliviaISOString;
export const getPeruDayName = getBoliviaDayName;
export const PERU_TIMEZONE = BOLIVIA_TIMEZONE;
