import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { asyncHandler } from './utils/asyncHandler.mjs';

// CONFIGURACIÓN GLOBAL DE ZONA HORARIA (Bolivia - America/La_Paz)
process.env.TZ = 'America/La_Paz';

import logger, { createModuleLogger } from './utils/logger.mjs';
import { errorHandler } from './handlers/errorHandler.mjs';
import { initTelegramHandlers } from './services/telegramInitializer.mjs';
import { query } from './config/db.mjs';
import { syncLevels, preloadLevels, preloadConfig, boliviaTime } from './services/dbService.mjs';
import { safeAsync } from './utils/safe.mjs';

import validateEnv from './config/validateEnv.mjs';
import redis from './services/redisService.mjs';

// 1. BLINDAJE GLOBAL Y VALIDACIÓN DE ENTORNO v9.0.0
validateEnv();

const app = express();

// Servir archivos estáticos locales
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// --- BLINDAJE Y OPTIMIZACIÓN DE ALTA CONCURRENCIA v11.5.0 ---

// 1. Seguridad de cabeceras (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Desactivar si causa problemas con uploads, o configurar finamente
}));

// 2. Compresión de respuestas (Gzip/Brotli) - Reduce latencia y ancho de banda
app.use(compression());

// 3. Desactivar cabecera de Express por seguridad y micro-optimización
app.disable('x-powered-by');

// 4. Rate Limiting Global (Protección contra inundaciones/DDoS básico)
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 500, // límite de 500 peticiones por minuto por IP
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.includes('/api/health') || req.path.includes('/uploads'), // No limitar health check ni archivos estáticos
});
app.use('/api/', globalLimiter);

// Blindaje contra caídas por errores no capturados
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err.stack);
});

process.on('unhandledRejection', (err) => {
  console.error('🔥 Unhandled Rejection:', err);
});

// 1.0 SISTEMA DE MONITOREO DE RENDIMIENTO (ADAPTATIVO v10.0.0)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) { // Loguear peticiones que tarden más de 500ms
      logger.warn(`[SLOW-REQUEST] ${req.method} ${req.originalUrl} - ${duration}ms`, {
        ip: req.ip,
        user: req.user?.id
      });
    }
  });
  next();
});

// Versión del API para forzar recargas en el frontend si es necesario
const API_VERSION = '11.4.2';

// Endpoint de Healthcheck Profesional v11.4.2 (Ultra Resiliente)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'ok';
  let redisStatus = 'ok';
  
  try {
    const dbPromise = query('SELECT 1');
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
    await Promise.race([dbPromise, timeoutPromise]);
  } catch (err) {
    dbStatus = 'error';
    logger.error(`[HEALTH-DB] ${err.message}`);
  }

  try {
    const redisPromise = redis.ping();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
    await Promise.race([redisPromise, timeoutPromise]);
  } catch (err) {
    redisStatus = 'error';
    logger.error(`[HEALTH-REDIS] ${err.message}`);
  }

  const health = {
    status: (dbStatus === 'ok' && redisStatus === 'ok') ? 'ok' : 'degraded',
    version: API_VERSION,
    db: dbStatus,
    redis: redisStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: boliviaTime.getISOString()
  };

  if (health.status === 'degraded') {
    res.status(207).json(health); 
  } else {
    // Cache control para evitar peticiones repetitivas innecesarias (v11.4.2)
    res.set('Cache-Control', 'public, max-age=10'); 
    res.json(health);
  }
});

// 1.5 SISTEMA DE MONITOREO CONTINUO (HEARTBEAT 10s) v9.3.0 (SaaS Ready)
const monitorLogger = createModuleLogger('MONITOR');

// Mover el check de salud al final del arranque para no bloquear el puerto
const checkSystemHealth = async () => {
  try {
    await query('SELECT 1');
    logger.info('[HEALTH] MySQL: OK');
    await redis.ping();
    logger.info('[HEALTH] Redis: OK');
    return true;
  } catch (err) {
    logger.error('[HEALTH-WARNING] Algunos servicios críticos no están listos:', err.message);
    return false;
  }
};

setInterval(async () => {
  await safeAsync(async () => {
    const health = {
      db: false,
      redis: false,
      timestamp: boliviaTime.getISOString()
    };

    try {
      // Intento de reconexión real mediante ping
      await query('SELECT 1');
      health.db = true;
    } catch (err) {
      monitorLogger.error(`[CRÍTICO] Fallo de Base de Datos detectado: ${err.message}. Intentando recuperar...`);
    }

    try {
      await redis.ping();
      health.redis = true;
    } catch (err) {
      monitorLogger.error(`[CRÍTICO] Fallo de Redis detectado: ${err.message}. Intentando recuperar...`);
    }

    if (!health.db || !health.redis) {
      monitorLogger.warn(`[HEALTH-DEGRADED] Estado actual -> DB: ${health.db ? 'OK' : 'FAIL'}, Redis: ${health.redis ? 'OK' : 'FAIL'}`);
    }
  }, 'SystemHeartbeat');
}, 10000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de CORS dinámica y segura
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://bcb-global.com',
  'https://www.bcb-global.com',
  'http://bcb-global.com',
  'http://www.bcb-global.com',
  'capacitor://localhost',
  'http://localhost',
  'http://173.249.55.143',
  'https://173.249.55.143'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir si no hay origen (como curl o apps móviles locales)
    if (!origin) return callback(null, true);
    
    // Verificar si el origen está en la lista blanca o es un subdominio de bcb-global.com
    if (allowedOrigins.includes(origin) || origin.endsWith('.bcb-global.com')) {
      return callback(null, true);
    }
    
    // Permitir todo en desarrollo (opcional, pero siguiendo la lógica actual)
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    logger.warn(`[CORS-REJECTED] Origin: ${origin}`);
    return callback(new Error('CORS no permitido por política de seguridad.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug']
}));

// Límites de subida aumentados para vouchers de alta resolución (Senior Standard)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// 1.8 OPTIMIZACIÓN DE CONEXIONES Y PERSISTENCIA (v11.3.5)
app.use((req, res, next) => {
  // Eliminamos Connection: keep-alive manual para dejar que Nginx lo gestione
  // res.set('Connection', 'keep-alive');
  
  // Blindaje contra abortos del cliente (Evitar fugas de memoria)
  req.on('aborted', () => {
    // Solo loguear si no es un health check común
    if (!req.originalUrl.includes('health')) {
      logger.warn(`[ABORTED-REQUEST] El cliente abortó la petición: ${req.method} ${req.originalUrl}`);
    }
  });
  
  next();
});

// Servir archivos estáticos de forma segura
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
app.use(express.static(path.join(process.cwd(), 'public')));

// 2. IMPORTACIÓN DE RUTAS (CON ASYNC HANDLER INTEGRADO)
import authRoutes from './handlers/api/auth.mjs';
import userRoutes from './handlers/api/users.mjs';
import taskRoutes from './handlers/api/tasks.mjs';
import rechargeRoutes from './handlers/api/recharges.mjs';
import withdrawalRoutes from './handlers/api/withdrawals.mjs';
import adminRoutes from './handlers/api/admin.mjs';
import telegramAdminRoutes from './handlers/api/telegram_admin.mjs';
import telegramWebhookRoutes from './handlers/api/telegram_webhook.mjs';
import sorteoRoutes from './handlers/api/sorteo.mjs';
import saasRoutes from './handlers/api/saas.mjs';
import levelRoutes from './handlers/api/levels.mjs';

import { getPublicContent } from './services/dbService.mjs';

app.get('/api/public-content', asyncHandler(async (req, res) => {
  const content = await getPublicContent();
  res.json(content);
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/recharges', rechargeRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/telegram', telegramAdminRoutes);
app.use('/api/telegram-webhook', telegramWebhookRoutes);
app.use('/api/sorteo', sorteoRoutes);
app.use('/api/saas', saasRoutes);
app.use('/api/levels', levelRoutes);

// 3. MANEJO DE ERRORES GLOBAL (Fallback final)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    console.log(`[STARTUP] Intentando iniciar servidor en puerto: ${PORT}`);
    // 1. ESCUCHAR PUERTO INMEDIATAMENTE (Evitar 502 Bad Gateway)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] BCB Global Backend v11.4.2 estable en puerto ${PORT}`);
      
      // 1.5 Validar salud básica una vez arriba (No bloqueante)
      checkSystemHealth();
    });

    // 2. INICIALIZACIONES ASÍNCRONAS (No bloqueantes)
    // Sincronizar niveles y pre-cargar caches
    syncLevels().catch(e => console.warn(`[SYNC] Falló: ${e.message}`));
    preloadLevels().catch(e => console.warn(`[CACHE-LEVELS] Falló: ${e.message}`));
    preloadConfig().catch(e => console.warn(`[CACHE-CONFIG] Falló: ${e.message}`));

    // Telegram
    setTimeout(() => {
      initTelegramHandlers().catch(err => {
        console.error('[TELEGRAM] Fallo:', err);
      });
    }, 2000);

    const shutdown = (signal) => {
      console.log(`[SERVER] Señal ${signal} recibida.`);
      server.close(() => process.exit(0));
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error(`[FATAL] Error durante el arranque:`, err);
    process.exit(1);
  }
}

startServer();

// Blindaje contra caídas por errores no capturados
