import { Queue, Worker, QueueEvents } from 'bullmq';
import redis from './redisService.js';
import logger from '../lib/logger.js';
import 'dotenv/config';

// 1. Configuración de Cola para Mensajes de Telegram
const telegramQueue = new Queue('telegram-notifications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s -> 4s -> 8s -> 16s -> 32s
    },
    removeOnComplete: true,
    removeOnFail: { age: 24 * 3600 }, // Guardar fallos por 24h
  },
});

const queueEvents = new QueueEvents('telegram-notifications', { connection: redis });

/**
 * Worker para procesar la cola de Telegram.
 * Separa el envío físico de la lógica de negocio.
 */
const telegramWorker = new Worker('telegram-notifications', async (job) => {
  const { botToken, chatId, message, options } = job.data;
  
  if (!botToken || !chatId || !message) {
    throw new Error('Faltan parámetros críticos para el envío.');
  }

  // Importar dinámicamente para evitar dependencias circulares
  const { default: TelegramBot } = await import('node-telegram-bot-api');
  const bot = new TelegramBot(botToken);

  try {
    const res = await bot.sendMessage(chatId, message, options);
    logger.info(`[BULLMQ] Job ${job.id} OK para ${chatId}`);
    return res;
  } catch (err) {
    logger.error(`[BULLMQ] Error en Job ${job.id} (${chatId}): ${err.message}`);
    throw err; // BullMQ manejará el reintento exponencial
  }
}, { 
  connection: redis,
  concurrency: 5, // 5 mensajes simultáneos
  limiter: {
    max: 30, // 30 mensajes por segundo (Telegram global limit)
    duration: 1000,
  }
});

telegramWorker.on('failed', (job, err) => {
  logger.error(`[BULLMQ] Job ${job.id} falló permanentemente: ${err.message}`);
});

/**
 * Añade un mensaje a la cola.
 */
export const enqueueTelegramMessage = async (botToken, chatId, message, options = {}) => {
  return await telegramQueue.add('send-message', {
    botToken,
    chatId,
    message,
    options: { parse_mode: 'HTML', ...options }
  });
};

export default telegramQueue;
