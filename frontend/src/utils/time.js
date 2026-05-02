/**
 * Utilidades de tiempo para el Frontend de BCB Global.
 * Centraliza el manejo de la zona horaria de Bolivia (America/La_Paz).
 */

export const BOLIVIA_TIMEZONE = 'America/La_Paz';

/**
 * Obtiene la fecha y hora actual ajustada a Bolivia.
 * @returns {Date}
 */
export const getBoliviaNow = (date = new Date()) => {
  const boliviaTime = date.toLocaleString('en-US', { timeZone: BOLIVIA_TIMEZONE });
  return new Date(boliviaTime);
};

/**
 * Formatea una fecha para mostrar en la interfaz.
 */
export const formatBoliviaDate = (date, options = {}) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BOLIVIA_TIMEZONE,
    ...options
  });
};

/**
 * Obtiene solo la hora formateada (HH:mm).
 */
export const getBoliviaTimeShort = (date = new Date()) => {
  const now = getBoliviaNow(date);
  return now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
};
