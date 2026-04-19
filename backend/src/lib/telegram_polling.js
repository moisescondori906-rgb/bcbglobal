import { getPublicContent } from './queries.js';
import { processTelegramUpdate } from './telegram_logic.js';
import logger from './logger.js';

let pollingActive = false;
let lastUpdateIds = new Map(); // token -> lastUpdateId

async function getUpdates(token) {
  if (!token) return [];
  const lastId = lastUpdateIds.get(token) || 0;
  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastId + 1}&timeout=30`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.ok ? data.result : [];
  } catch (err) {
    logger.error(`[Telegram Polling] Error fetching updates for ${token.substring(0, 10)}...:`, err.message);
    return [];
  }
}

export async function startTelegramPolling() {
  if (pollingActive) return;
  pollingActive = true;
  logger.info('[Telegram Polling] Polling system started.');

  const poll = async () => {
    try {
      // getPublicContent ahora lee de globalConfig en memoria (latencia cero)
      const config = await getPublicContent();
      
      const tokens = [
        config.telegram_recargas_token || process.env.TELEGRAM_RECARGAS_TOKEN,
        config.telegram_retiros_token || process.env.TELEGRAM_RETIROS_TOKEN
      ].filter(t => t && t.includes(':'));

      if (tokens.length === 0) {
        // Si no hay tokens, esperar un poco más antes de reintentar
        if (pollingActive) setTimeout(poll, 30000);
        return;
      }

      for (const token of tokens) {
        const updates = await getUpdates(token);
        if (updates.length > 0) {
          logger.debug(`[Telegram Polling] Recibidas ${updates.length} actualizaciones para el bot ${token.substring(0, 10)}...`);
        }
        for (const update of updates) {
          lastUpdateIds.set(token, update.update_id);
          
          if (update.callback_query) {
            logger.info(`[Telegram Polling] CLICK DETECTADO: ${update.callback_query.data} de ${update.callback_query.from.username || update.callback_query.from.id}`);
          }
          
          await processTelegramUpdate(update);
        }
      }
    } catch (err) {
      logger.error('[Telegram Polling] Critical error in poll loop:', err.message);
    }
    
    // Esperar 2 segundos antes de la siguiente vuelta
    if (pollingActive) {
      setTimeout(poll, 2000);
    }
  };

  poll();
}

export function stopTelegramPolling() {
  pollingActive = false;
  logger.info('[Telegram Polling] Polling system stopped.');
}
