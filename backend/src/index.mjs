import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger, { createModuleLogger } from './utils/logger.mjs';
import { errorHandler } from './handlers/errorHandler.mjs';
import { initTelegramHandlers } from './services/telegramInitializer.mjs';
import { query } from './config/db.mjs';
import { syncLevels, preloadLevels, preloadConfig } from './services/dbService.mjs';
import { safeAsync } from './utils/safe.mjs';

import validateEnv from './config/validateEnv.mjs';
import redis from './services/redisService.mjs';

// 1. BLINDAJE GLOBAL Y VALIDACIÓN DE ENTORNO v9.0.0
validateEnv();

const app = express();

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
const API_VERSION = '11.0.0';

// Endpoint de Healthcheck Profesional v10.2.0 (Bajo /api para Nginx)
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    version: API_VERSION,
    db: 'ok',
    redis: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  };

  try {
    await query('SELECT 1');
  } catch (err) {
    health.db = 'down';
    health.status = 'degraded';
  }

  try {
    await redis.ping();
  } catch (err) {
    health.redis = 'down';
    health.status = 'degraded';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

// Registro de salud de servicios críticos al arranque
const checkSystemHealth = async () => {
  try {
    await query('SELECT 1');
    logger.info('[HEALTH] MySQL: OK');
    await redis.ping();
    logger.info('[HEALTH] Redis: OK');
    return true;
  } catch (err) {
    logger.error('[FATAL] Fallo de salud en servicios críticos:', err.message);
    process.exit(1);
  }
};

await checkSystemHealth();

// 1.5 SISTEMA DE MONITOREO CONTINUO (HEARTBEAT 10s) v9.3.0 (SaaS Ready)
const monitorLogger = createModuleLogger('MONITOR');

setInterval(async () => {
  await safeAsync(async () => {
    const health = {
      db: false,
      redis: false,
      timestamp: new Date().toISOString()
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
  'https://bcb-global.com',
  'https://www.bcb-global.com',
  'capacitor://localhost',
  'http://localhost'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.bcb-global.com') || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      logger.warn(`[CORS-REJECTED] Origin: ${origin}`);
      callback(new Error('CORS no permitido por política de seguridad.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug']
}));

// Límites de subida aumentados para vouchers de alta resolución (Senior Standard)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

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
      console.log(`[SERVER] BCB Global Backend v9.1.0 estable en puerto ${PORT}`);
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
