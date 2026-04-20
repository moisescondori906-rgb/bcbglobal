import logger from '../utils/logger.mjs';
import { safeTelegram } from '../utils/safe.mjs';

/**
 * TelegramWorker - Sistema de Cola de Mensajes con Retry Exponencial.
 * Blindaje contra saturación de API y fallos de red.
 */
class TelegramWorker {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1s inicial
    this.activeBots = new Set();
  }

  /**
   * Añade un mensaje a la cola con prioridad y reintentos.
   */
  async addToQueue(bot, chatId, message, options = {}) {
    if (!bot || !chatId || !message) return false;

    // Validar límite de caracteres de Telegram (4096)
    if (message.length > 4000) {
      const parts = this.splitMessage(message);
      for (const part of parts) {
        await this.addToQueue(bot, chatId, part, options);
      }
      return true;
    }

    const job = {
      bot,
      chatId,
      message,
      options: { parse_mode: 'HTML', ...options },
      retries: 0,
      timestamp: Date.now()
    };

    this.queue.push(job);
    if (!this.isProcessing) this.processQueue();
    return true;
  }

  /**
   * Procesa la cola de forma secuencial con control de flujo.
   */
  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();

    try {
      await safeTelegram(async () => {
        await job.bot.sendMessage(job.chatId, job.message, job.options);
      }, `Worker-Send-${job.chatId}`);
      this.activeBots.add(job.bot.token); // Marcar bot como activo
      logger.info(`[WORKER] OK: ${job.chatId}`);
    } catch (err) {
      job.retries++;
      const delay = Math.pow(2, job.retries) * this.baseDelay; // 2s, 4s, 8s...
      
      if (job.retries <= this.maxRetries) {
        logger.warn(`[WORKER] Retry ${job.retries}/${this.maxRetries} en ${delay}ms para ${job.chatId}`);
        setTimeout(() => {
          this.queue.push(job);
          if (!this.isProcessing) this.processQueue();
        }, delay);
      } else {
        logger.error(`[WORKER] CRÍTICO: Fallo final tras ${this.maxRetries} reintentos en ${job.chatId}`);
      }
    }

    // Delay entre mensajes para evitar Rate Limit de Telegram (30 msg/sec global)
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * Divide mensajes largos automáticamente.
   */
  splitMessage(str, limit = 4000) {
    const parts = [];
    let current = str;
    while (current.length > 0) {
      if (current.length <= limit) {
        parts.push(current);
        break;
      }
      let splitIdx = current.lastIndexOf('\n', limit);
      if (splitIdx === -1) splitIdx = limit;
      parts.push(current.substring(0, splitIdx));
      current = current.substring(splitIdx).trim();
    }
    return parts;
  }

  /**
   * Envía una alerta crítica formateada y agrupada.
   */
  async sendCriticalAlert(bot, chatId, title, details) {
    const alertMsg = `🚨 <b>ALERTA CRÍTICA FINTECH</b>\n\n` +
      `📌 <b>Origen:</b> ${title}\n` +
      `⚠️ <b>Detalles:</b> ${details}\n` +
      `🕒 <b>Hora (BO):</b> ${new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}`;
    
    return this.addToQueue(bot, chatId, alertMsg);
  }

  /**
   * Verifica salud del worker y bots.
   */
  getHealth() {
    return {
      status: 'ok',
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
      botsActive: this.activeBots.size
    };
  }
}

const worker = new TelegramWorker();
export default worker;
