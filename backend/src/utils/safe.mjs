import { createModuleLogger } from '../utils/logger.mjs';

const telegramLogger = createModuleLogger('TELEGRAM');
const asyncLogger = createModuleLogger('ASYNC');

/**
 * CIRCUIT BREAKER PARA TELEGRAM
 */
const TELEGRAM_CIRCUIT_STATE = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
  MAX_FAILURES: 5,
  COOLDOWN_MS: 30000 
};

/**
 * safeAsync - Wrapper universal para funciones asíncronas de negocio.
 */
export async function safeAsync(fn, context = 'GeneralAsync') {
  try {
    return await fn();
  } catch (err) {
    asyncLogger.error(`[SAFE-ASYNC-ERROR] ${context}: ${err.message}`, { 
      stack: err.stack,
      time: new Date().toISOString()
    });
    return null;
  }
}

/**
 * safeTelegram - Wrapper específico para llamadas a la API de Telegram.
 * Previene que fallos en los bots (throttling, red, tokens) afecten al servidor.
 */
export const safeTelegram = async (fn, context = 'TelegramAction') => { 
  try { 
    return await fn(); 
  } catch (e) { 
    console.error(`🤖 [TELEGRAM-ERROR] ${context}:`, e.message); 
    return null; 
  } 
};

export const safe = safeAsync;
export const safeTelegramCall = safeTelegram;

/**
 * Helper para normalizar los días de operación (recarga/retiro).
 * Acepta arrays de números, strings JSON o strings separados por comas.
 * Filtra y asegura que los días estén en el rango 0-6 (Domingo-Sábado).
 */
export function normalizeDias(value, fallback) {
  if (Array.isArray(value)) {
    return value.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
  }

  if (value == null || value === '') return fallback;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
      }
    } catch (e) {
      // Si falla el parseo JSON, intentamos parsear como string separado por comas
    }

    return value
      .split(',')
      .map(v => Number(String(v).trim()))
      .filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
  }

  return fallback;
}

