import { createModuleLogger } from '../utils/logger.js';

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
