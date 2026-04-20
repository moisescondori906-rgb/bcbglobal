import Redis from 'ioredis';
import Redlock from 'redlock';
import logger from '../utils/logger.mjs';
import 'dotenv/config';

/**
 * Enterprise Redis Cluster & Separation of Responsibilities.
 * - Cache: Almacenamiento temporal y Feature Flags.
 * - Locks: Redlock para concurrencia.
 * - Queues: BullMQ.
 * - State: Sesiones y Rate Limiting.
 */
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: times => Math.min(times * 50, 2000),
  maxRetriesPerRequest: null,
};

// 1. Cliente para Cache y Estado (Instancia principal)
const redis = new Redis({
  ...redisConfig,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.slice(0, targetError.length) === targetError) {
      return true; // Reconnect on READONLY error (cluster failover)
    }
    return false;
  }
});

// Eventos de Resiliencia v9.0.0
redis.on('reconnecting', (delay) => logger.warn(`[REDIS-RECONNECT] Reintentando en ${delay}ms...`));
redis.on('error', (err) => logger.error(`[REDIS-FATAL]: ${err.message}`));
redis.on('ready', () => logger.info('[REDIS] Sistema listo y operativo.'));

// 2. Cliente para Colas (Dedicado para evitar bloqueos)
const queueRedis = new Redis(redisConfig);

// 3. Soporte para Cluster Real (Si se define en ENV)
let cluster = null;
if (process.env.REDIS_CLUSTER_NODES) {
  const clusterNodes = JSON.parse(process.env.REDIS_CLUSTER_NODES);
  cluster = new Redis.Cluster(clusterNodes, {
    redisOptions: { password: process.env.REDIS_PASSWORD }
  });
}

// 4. Configuración de Redlock (Quorum)
// Se pueden usar múltiples clientes si hay varios nodos independientes.
const redlock = new Redlock([redis], {
  driftFactor: 0.01,
  retryCount: 20,
  retryDelay: 100,
  retryJitter: 100,
  automaticExtensionThreshold: 2000,
});

redis.on('connect', () => logger.info('[REDIS] Cache/State Conectado.'));
queueRedis.on('connect', () => logger.info('[REDIS] Queue Dedicated Conectado.'));

/**
 * Adquiere un Lock Distribuido Enterprise con soporte multi-tenant.
 */
export const acquireLock = async (resource, ttl = 10000, tenantId = null) => {
  const lockKey = tenantId ? `lock:${tenantId}:${resource}` : `lock:${resource}`;
  try {
    return await redlock.acquire([lockKey], ttl);
  } catch (err) {
    return null;
  }
};

export const releaseLock = async (lock) => {
  if (!lock) return;
  try {
    await lock.release();
  } catch (err) {
    // Ya liberado o expirado
  }
};

/**
 * Rate Limit segmentado por Tenant.
 */
export const checkGlobalRateLimit = async (userId, traceId = 'enterprise', tenantId = null) => {
  const key = tenantId ? `ratelimit:${tenantId}:${userId}` : `ratelimit:${userId}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, 60);
  return current <= 20; // Umbral aumentado para Enterprise
};

export const checkIdempotencyRedis = async (id, tenantId = null) => {
  const key = tenantId ? `idem:${tenantId}:${id}` : `idem:${id}`;
  const exists = await redis.get(key);
  if (exists) return true;
  await redis.set(key, '1', 'EX', 172800); // 48h
  return false;
};

/**
 * Cierre limpio.
 */
export const closeRedis = async () => {
  logger.info('[REDIS] Cerrando conexiones de cluster...');
  await Promise.all([redis.quit(), queueRedis.quit()]);
  if (cluster) await cluster.quit();
};

export { redis as default, queueRedis, cluster };
