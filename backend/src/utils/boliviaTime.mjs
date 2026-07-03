/**
 * Helper para manejar el tiempo en la zona horaria de Bolivia (America/La_Paz).
 */

export const BOLIVIA_TIMEZONE = 'America/La_Paz';
const BOLIVIA_UTC_OFFSET = '-04:00';
const WEEKDAY_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};
const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const formatterCache = new Map();

function normalizeDateInput(date = new Date()) {
  const normalized = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  if (Number.isNaN(normalized.getTime())) {
    throw new TypeError('Invalid date provided');
  }
  return normalized;
}

function getFormatter(options) {
  const cacheKey = JSON.stringify(options);
  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(cacheKey, new Intl.DateTimeFormat('en-US', {
      timeZone: BOLIVIA_TIMEZONE,
      ...options
    }));
  }
  return formatterCache.get(cacheKey);
}

export function getBoliviaDateTimeParts(date = new Date()) {
  const normalized = normalizeDateInput(date);
  const formatter = getFormatter({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false
  });

  const rawParts = formatter.formatToParts(normalized).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  const weekdayKey = String(rawParts.weekday || '').slice(0, 3);
  const dayOfWeek = WEEKDAY_INDEX[weekdayKey];

  return {
    year: String(rawParts.year),
    month: String(rawParts.month),
    day: String(rawParts.day),
    hour: String(rawParts.hour),
    minute: String(rawParts.minute),
    second: String(rawParts.second),
    dayOfWeek: dayOfWeek ?? 0,
    dayName: WEEKDAY_NAMES[dayOfWeek ?? 0]
  };
}

/**
 * Obtiene la fecha y hora actual en Bolivia como objeto Date.
 * @returns {Date}
 */
export function getBoliviaNow(date = new Date()) {
  const { year, month, day, hour, minute, second } = getBoliviaDateTimeParts(date);
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${BOLIVIA_UTC_OFFSET}`);
}

/**
 * Obtiene el día de la semana actual en Bolivia (0-6, donde 0 es Domingo).
 */
export function getBoliviaDayOfWeek(date = new Date()) {
  return getBoliviaDateTimeParts(date).dayOfWeek;
}

/**
 * Obtiene una cadena de fecha formateada (YYYY-MM-DD) para el día actual en Bolivia.
 */
export function getBoliviaDateKey(date = getBoliviaNow()) {
  const { year, month, day } = getBoliviaDateTimeParts(date);
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la hora actual formateada (HH:mm:ss) para Bolivia.
 */
export function getBoliviaTimeString(date = getBoliviaNow()) {
  const { hour, minute, second } = getBoliviaDateTimeParts(date);
  return `${hour}:${minute}:${second}`;
}

/**
 * Obtiene un ISO String que representa la hora local de Bolivia (no UTC).
 */
export function getBoliviaISOString(date = getBoliviaNow()) {
  const { year, month, day, hour, minute, second } = getBoliviaDateTimeParts(date);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${BOLIVIA_UTC_OFFSET}`;
}

/**
 * Obtiene el día de la semana como texto en español (Domingo, Lunes, etc.).
 */
export function getBoliviaDayName(date = getBoliviaNow()) {
  return getBoliviaDateTimeParts(date).dayName;
}

/**
 * Obtiene la ventana diaria del limite de retiros usando el calendario Bolivia.
 */
export function getBoliviaWithdrawalDayWindow(date = new Date()) {
  const normalized = normalizeDateInput(date);
  const dateKey = getBoliviaDateKey(normalized);
  const startIso = `${dateKey}T00:00:00${BOLIVIA_UTC_OFFSET}`;
  const endIso = `${dateKey}T23:59:59${BOLIVIA_UTC_OFFSET}`;
  const nextPeriodStart = new Date(new Date(startIso).getTime() + (24 * 60 * 60 * 1000));

  return {
    dateKey,
    resetTime: '23:59',
    startsAt: startIso,
    endsAt: endIso,
    nextDateKey: getBoliviaDateKey(nextPeriodStart)
  };
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
