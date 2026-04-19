import redis from '../services/redisService.js';
import logger from '../lib/logger.js';

/**
 * Middleware de rate limiting distribuido usando Redis.
 * Cae a memoria local si Redis no está disponible.
 */
const localRateLimitMap = new Map();

export const rateLimiter = (windowMs = 60000, max = 30) => {
  return async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const key = `ratelimit:ip:${ip}:${req.originalUrl}`;

    try {
      // 1. Intento con Redis (Soporta Cluster Mode de PM2)
      if (redis && redis.status === 'ready') {
        const current = await redis.incr(key);
        if (current === 1) await redis.expire(key, Math.ceil(windowMs / 1000));
        
        if (current > max) {
          logger.warn(`[RATE-LIMIT] IP ${ip} excedió límite en ${req.originalUrl} (Redis)`);
          return res.status(429).json({ error: 'Demasiadas solicitudes. Reintenta en un momento.' });
        }
        return next();
      }
    } catch (err) {
      logger.error(`[RATE-LIMIT-REDIS-ERROR]: ${err.message}`);
    }

    // 2. Fallback a Memoria Local (Si Redis falla o no está listo)
    const now = Date.now();
    let userRequests = localRateLimitMap.get(ip) || [];
    userRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (userRequests.length >= max) {
      logger.warn(`[RATE-LIMIT] IP ${ip} excedió límite (Local Fallback)`);
      return res.status(429).json({ error: 'Demasiadas solicitudes. Reintenta pronto.' });
    }
    
    userRequests.push(now);
    localRateLimitMap.set(ip, userRequests);
    next();
  };
};

// Limpieza periódica de memoria local
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of localRateLimitMap.entries()) {
    if (requests.every(ts => now - ts > 300000)) localRateLimitMap.delete(ip);
  }
}, 300000);
