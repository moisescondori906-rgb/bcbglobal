import Redis from 'ioredis';
import Redlock from 'redlock';
import logger from '../utils/logger.mjs';
import 'dotenv/config';

const REDIS_FALLBACK_HOSTS = [
  'localhost',
  '127.0.0.1',
  'redis', // Common for Docker networks
  'host.docker.internal', // Common for Docker Desktop
];

async function testRedisConnection(config) {
  const client = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    connectTimeout: 5000, // Shorter timeout for probes
  });
  try {
    await client.ping();
    logger.info(`[REDIS-PROBE] Successfully connected to ${config.host}:${config.port}`);
    return true;
  } catch (error) {
    logger.warn(`[REDIS-PROBE] Failed to connect to ${config.host}:${config.port}: ${error.message}`);
    return false;
  } finally {
    await client.quit();
  }
}

async function getEffectiveRedisConfig() {
  const baseConfig = {
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  };

  const hostsToTry = [];
  if (process.env.REDIS_HOST) {
    hostsToTry.push(process.env.REDIS_HOST); // Prioritize user-defined host
  }
  hostsToTry.push(...REDIS_FALLBACK_HOSTS);

  for (const host of hostsToTry) {
    const currentConfig = { ...baseConfig, host };
    logger.info(`[REDIS-PROBE] Attempting connection test to host: ${host}`);
    if (await testRedisConnection(currentConfig)) {
      logger.info(`[REDIS-CONFIG] Using effective host: ${host}`);
      return { ...baseConfig, host };
    }
  }

  logger.error(`[REDIS-CONFIG] No Redis host responded. Falling back to default environment variables.`);
  return { ...baseConfig, host: process.env.REDIS_HOST || '127.0.0.1' };
}

/**
 * Enterprise Redis Cluster & Separation of Responsibilities.
 * - Cache: Almacenamiento temporal y Feature Flags.
 * - Locks: Redlock para concurrencia.
 * - Queues: BullMQ.
 * - State: Sesiones y Rate Limiting.
 */
const effectiveRedisConfig = await getEffectiveRedisConfig();
const redisConfig = {
  ...effectiveRedisConfig,
  retryStrategy: times => Math.min(times * 50, 2000),
  maxRetriesPerRequest: null,
};

logger.info(`[REDIS-CONFIG] Attempting to connect to Redis at ${redisConfig.host}:${redisConfig.port}`);

let redis;
let queueRedis;
let redlock;
let cluster = null;



try {
  // 1. Cliente para Cache y Estado (Instancia principal)
  redis = new Redis({
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
  queueRedis = new Redis(redisConfig);
  queueRedis.on('connect', () => logger.info('[REDIS] Queue Dedicated Conectado.'));

  // 3. Soporte para Cluster Real (Si se define en ENV)
  if (process.env.REDIS_CLUSTER_NODES) {
    const clusterNodes = JSON.parse(process.env.REDIS_CLUSTER_NODES);
    cluster = new Redis.Cluster(clusterNodes, {
      redisOptions: { password: process.env.REDIS_PASSWORD }
    });
  }

  // 4. Configuración de Redlock (Quorum)
  // Se pueden usar múltiples clientes si hay varios nodos independientes.
  redlock = new Redlock([redis], {
    driftFactor: 0.01,
    retryCount: 20,
    retryDelay: 100,
    retryJitter: 100,
    automaticExtensionThreshold: 2000,
  });
  
  redis.on('connect', () => logger.info('[REDIS] Cache/State Conectado.'));

} catch (e) {
  logger.error(`[REDIS-INIT-ERROR]: Fallo la inicialización de Redis. Las funciones de caché no estarán disponibles: ${e.message}`);
  // Fallback: Proveer un cliente Redis dummy para evitar que la aplicación falle
  redis = {
    get: async () => null,
    set: async () => 'OK',
    incr: async () => 1,
    expire: async () => 1,
    del: async () => 1,
    quit: async () => 'OK',
    on: () => {},
    // Asegúrate de que cualquier otro método usado en la app también tenga un no-op
  };
  queueRedis = redis;
  redlock = {
    acquire: async (resources, ttl) => ({ 
      unlock: async () => {},
      release: async () => {},
      extend: async () => {}
    }),
  };
  cluster = null; // Ensure cluster is null if Redis init fails
}

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

export { redis as default, queueRedis, cluster, redlock };
