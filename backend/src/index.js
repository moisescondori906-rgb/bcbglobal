import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger, { createModuleLogger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initTelegramHandlers } from './services/telegramInitializer.js';
import { query } from './config/db.js';
import { syncLevels } from './lib/queries.js';
import { safeAsync } from './lib/safeWrappers.js';

import validateEnv from './config/validateEnv.js';
import redis from './services/redisService.js';

// 1. BLINDAJE GLOBAL Y VALIDACIÓN DE ENTORNO v9.0.0
validateEnv();

// Blindaje total contra caídas por errores no capturados
process.on('uncaughtException', (err) => {
  logger.error('[CRITICAL-FATAL] Uncaught Exception:', { 
    message: err.message, 
    stack: err.stack,
    time: new Date().toISOString()
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[CRITICAL-FATAL] Unhandled Rejection:', { 
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : null,
    time: new Date().toISOString()
  });
});

// Endpoint de Healthcheck Profesional v9.0.0
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: 'unknown',
    redis: 'unknown'
  };

  try {
    await query('SELECT 1');
    health.db = 'connected';
  } catch (err) {
    health.db = 'error';
    health.status = 'degraded';
  }

  try {
    await redis.ping();
    health.redis = 'connected';
  } catch (err) {
    health.redis = 'error';
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
      await query('SELECT 1');
      health.db = true;
    } catch (err) {
      monitorLogger.error(`[CRÍTICO] Fallo de Base de Datos: ${err.message}`);
    }

    try {
      await redis.ping();
      health.redis = true;
    } catch (err) {
      monitorLogger.error(`[CRÍTICO] Fallo de Redis: ${err.message}`);
    }

    if (!health.db || !health.redis) {
      // Si algo falla, intentamos loggear el estado degradado pero no matamos el proceso
      // para permitir que la lógica de reconexión automática de los drivers actúe.
      monitorLogger.warn(`[HEALTH-DEGRADED] DB: ${health.db ? 'OK' : 'FAIL'}, Redis: ${health.redis ? 'OK' : 'FAIL'}`);
    }
  }, 'SystemHeartbeat');
}, 10000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de CORS dinámica y segura
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://bcb-global.com',
  'https://www.bcb-global.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (como apps móviles o curl) en desarrollo
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      logger.warn(`[CORS-REJECTED] Origin: ${origin}`);
      callback(new Error('CORS no permitido por política de seguridad.'));
    }
  },
  credentials: true
}));

// Límites de subida aumentados para vouchers de alta resolución (Senior Standard)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Servir archivos estáticos de forma segura
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// 2. IMPORTACIÓN DE RUTAS (CON ASYNC HANDLER INTEGRADO)
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import rechargeRoutes from './routes/recharges.js';
import withdrawalRoutes from './routes/withdrawals.js';
import adminRoutes from './routes/admin.js';
import telegramAdminRoutes from './routes/telegram_admin.js';
import telegramWebhookRoutes from './routes/telegram_webhook.js';
import sorteoRoutes from './routes/sorteo.js';
import saasRoutes from './routes/saas.js';
import levelRoutes from './routes/levels.js';

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
    // Sincronizar niveles institucionales
    await syncLevels().catch(e => logger.warn(`[SYNC] Falló sincronización inicial de niveles: ${e.message}`));

    const server = app.listen(PORT, () => {
      logger.info(`[SERVER] BCB Global Backend v9.1.0 estable en puerto ${PORT}`);
      logger.info(`[ENV] Modo: ${process.env.NODE_ENV}`);
    });

    // 4. INICIALIZACIÓN DE TELEGRAM (AISLAMIENTO TOTAL)
    // Se ejecuta tras un delay para no bloquear el inicio del server HTTP
    setTimeout(() => {
      initTelegramHandlers().catch(err => {
        logger.error('[TELEGRAM] Fallo crítico en inicialización de bots:', err);
      });
    }, 2000);

    // Graceful Shutdown (Senior Standard)
    const shutdown = (signal) => {
      logger.info(`[SERVER] Señal ${signal} recibida. Cerrando conexiones...`);
      server.close(() => {
        logger.info('[SERVER] Servidor HTTP cerrado.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error(`\x1b[41m[FATAL]\x1b[0m Error durante el arranque:`, err);
    process.exit(1);
  }
}

// Blindaje contra caídas por errores no capturados
// Se mantienen al final como red de seguridad adicional pero ya se declararon arriba
// process.on('uncaughtException', ...);
// process.on('unhandledRejection', ...);

startServer();
