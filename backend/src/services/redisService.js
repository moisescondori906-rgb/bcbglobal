import Redis from 'ioredis';
import logger from '../lib/logger.js';
import 'dotenv/config';

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null, // Necesario para BullMQ
};

const redis = new Redis(redisConfig);

redis.on('connect', () => logger.info('[REDIS] Conectado exitosamente.'));
redis.on('error', (err) => logger.error('[REDIS] Error de conexión:', err));

/**
 * Lock Distribuido para evitar condiciones de carrera en alta carga.
 */
export const acquireLock = async (key, ttl = 5000) => {
  const result = await redis.set(`lock:${key}`, 'locked', 'PX', ttl, 'NX');
  return result === 'OK';
};

export const releaseLock = async (key) => {
  return await redis.del(`lock:${key}`);
};

/**
 * Rate Limit Global (Redis) - 10 acciones por minuto.
 */
export const checkGlobalRateLimit = async (userId) => {
  const key = `ratelimit:${userId}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, 60);
  }
  
  return current <= 10;
};

export default redis;
