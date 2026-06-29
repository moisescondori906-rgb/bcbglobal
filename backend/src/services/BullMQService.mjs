import { Queue, Worker } from 'bullmq';
import { queueRedis } from './redisService.mjs';
import logger from '../utils/logger.mjs';
import { query } from '../config/db.mjs';
import { safeTelegram } from '../utils/safe.mjs';
import 'dotenv/config';

// 1. Configuración de Cola Principal con Dead Letter Queue (DLQ)
const telegramQueue = new Queue('telegram-notifications', {
  connection: queueRedis,
  defaultJobOptions: {
    attempts: 10, // Reintentos agresivos nivel enterprise
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: { age: 30 * 24 * 3600 }, // Auditoría DLQ por 30 días
  },
});

// 2. Circuit Breaker Empresarial
const CB_CONFIG = {
  threshold: 20,
  pauseDuration: 5 * 60 * 1000,
  halfOpenRetries: 3
};
let consecutiveFailures = 0;
let isPaused = false;

const telegramWorker = new Worker('telegram-notifications', async (job) => {
  if (isPaused) throw new Error('Enterprise Circuit Breaker: Telegram API in cooldown.');

  const { botToken, chatId, message, options, traceId } = job.data;
  
  try {
    const { default: TelegramBot } = await import('node-telegram-bot-api');
    const bot = new TelegramBot(botToken);
    
    const res = await safeTelegram(async () => {
      return await bot.sendMessage(chatId, message, options);
    }, `BullMQ-Job-${job.id}`);
    
    if (!res) throw new Error('SafeTelegram returned null - Job failed.');
    
    consecutiveFailures = Math.max(0, consecutiveFailures - 1);
    return res;
  } catch (err) {
    consecutiveFailures++;
    logger.error(`[BULLMQ-DLQ] Job ${job.id} falló.`, { traceId, error: err.message });

    if (consecutiveFailures >= CB_CONFIG.threshold && !isPaused) {
      isPaused = true;
      logger.error(`[CIRCUIT-BREAKER] ACTIVADO. Pausando workers.`);
      setTimeout(() => { 
        isPaused = false;
        consecutiveFailures = CB_CONFIG.halfOpenRetries;
      }, CB_CONFIG.pauseDuration);
    }
    throw err;
  }
}, { connection: queueRedis, concurrency: 50 });

// 3. Sistema de Replay Automático para DLQ (MySQL Sync)
telegramWorker.on('failed', async (job, err) => {
  try {
    await query(
      `INSERT INTO dlq_audit (job_id, trace_id, payload, error_message, retry_count) 
       VALUES (?, ?, ?, ?, ?)`,
      [job.id, job.data.traceId, JSON.stringify(job.data), err.message, job.attemptsMade]
    );
  } catch (dbErr) {
    logger.error('[BULLMQ-DLQ] Error guardando auditoría:', dbErr.message);
  }
});

/**
 * Replay Manual/Automático de Jobs Fallidos.
 */
export const replayFailedJobs = async () => {
  const failed = await telegramQueue.getFailed();
  logger.info(`[BULLMQ-REPLAY] Reintentando ${failed.length} jobs fallidos.`);
  for (const job of failed) {
    await job.retry();
    await query(`UPDATE dlq_audit SET status='replayed', replayed_at=NOW() WHERE job_id=?`, [job.id]);
  }
};

export const enqueueTelegramMessage = async (botToken, chatId, message, options = {}, traceId = 'enterprise') => {
  return await telegramQueue.add('send-message', {
    botToken, chatId, message, options: { parse_mode: 'HTML', ...options }, traceId
  });
};

/**
 * Cierre Limpio (Graceful Shutdown)
 */
export const closeBullMQ = async () => {
  logger.info('[BULLMQ] Cerrando workers y colas...');
  await telegramWorker.close();
  await telegramQueue.close();
};

export default telegramQueue;
