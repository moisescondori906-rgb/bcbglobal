import logger, { createModuleLogger } from './logger.js';

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
  COOLDOWN_MS: 30000 // 30 segundos de pausa si falla mucho
};

/**
 * safeAsync - Wrapper universal para funciones asíncronas de negocio.
 * Garantiza que ninguna excepción no capturada se propague al core.
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
 * Incluye Circuit Breaker para evitar saturación ante fallos persistentes.
 */
export async function safeTelegram(fn, context = 'TelegramAction') {
  // 1. Check Circuit Breaker
  if (TELEGRAM_CIRCUIT_STATE.isOpen) {
    const now = Date.now();
    if (now - TELEGRAM_CIRCUIT_STATE.lastFailureTime > TELEGRAM_CIRCUIT_STATE.COOLDOWN_MS) {
      telegramLogger.info(`[CIRCUIT-BREAKER] Reintentando conexión (Half-Open) en ${context}`);
      TELEGRAM_CIRCUIT_STATE.isOpen = false;
      TELEGRAM_CIRCUIT_STATE.failures = 0;
    } else {
      telegramLogger.warn(`[CIRCUIT-BREAKER] Saltando llamada: Circuito ABIERTO en ${context}`);
      return null;
    }
  }

  try {
    const result = await fn();
    // Éxito: Reset de fallos si logramos una conexión exitosa
    if (TELEGRAM_CIRCUIT_STATE.failures > 0) TELEGRAM_CIRCUIT_STATE.failures--;
    return result;
  } catch (err) {
    TELEGRAM_CIRCUIT_STATE.failures++;
    TELEGRAM_CIRCUIT_STATE.lastFailureTime = Date.now();

    const status = err.response?.status || 'UNKNOWN';
    const description = err.response?.description || err.message;
    
    telegramLogger.error(`[SAFE-TELEGRAM-ERROR] ${context} (Status: ${status}): ${description}`, {
      context,
      error: description,
      status
    });

    // Activar Circuit Breaker si superamos el máximo de fallos
    if (TELEGRAM_CIRCUIT_STATE.failures >= TELEGRAM_CIRCUIT_STATE.MAX_FAILURES) {
      TELEGRAM_CIRCUIT_STATE.isOpen = true;
      telegramLogger.error(`[CIRCUIT-BREAKER] Circuito ABIERTO por ${TELEGRAM_CIRCUIT_STATE.MAX_FAILURES} fallos consecutivos.`);
    }
    
    return null; 
  }
}

/**
 * Alias para compatibilidad legacy
 */
export const safe = safeAsync;
export const safeTelegramCall = safeTelegram;
