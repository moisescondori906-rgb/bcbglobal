import { getPublicContent } from '../services/dbService.mjs';
import { processTelegramUpdate } from '../handlers/telegramLogic.mjs';
import logger from '../utils/logger.mjs';
import { safeTelegram } from '../utils/safe.mjs';

let pollingActive = false;
let lastUpdateIds = new Map(); // token -> lastUpdateId

async function getUpdates(token) {
  if (!token) return [];
  const lastId = lastUpdateIds.get(token) || 0;
  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastId + 1}&timeout=30`;
  
  return await safeTelegram(async () => {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.ok ? data.result : [];
  }, `getUpdates-${token.substring(0, 5)}`) || [];
}

export async function startTelegramPolling() {
  if (pollingActive) return;
  pollingActive = true;
  logger.info('[TELEGRAM-POLLING] Polling system started v8.1.0.');

  const poll = async () => {
    try {
      const config = await getPublicContent();
      
      const tokens = [
        config.telegram_recargas_token || process.env.TELEGRAM_RECARGAS_TOKEN,
        config.telegram_retiros_token || process.env.TELEGRAM_RETIROS_TOKEN
      ].filter(t => t && t.includes(':'));

      if (tokens.length === 0) {
        if (pollingActive) setTimeout(poll, 30000);
        return;
      }

      for (const token of tokens) {
        const updates = await getUpdates(token);
        for (const update of updates) {
          lastUpdateIds.set(token, update.update_id);
          
          if (update.callback_query) {
            logger.info(`[TELEGRAM-POLLING] CLICK: ${update.callback_query.data} bot:${token.substring(0,5)}`);
          }
          
          await processTelegramUpdate(update);
        }
      }
    } catch (err) {
      logger.error('[TELEGRAM-POLLING] Critical loop error:', err.message);
    }
    
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
