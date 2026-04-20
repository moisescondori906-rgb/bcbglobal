import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger, { createModuleLogger } from './utils/logger.js';
import { errorHandler } from './handlers/errorHandler.js';
import { initTelegramHandlers } from './services/telegramInitializer.js';
import { query } from './config/db.js';
import { syncLevels } from './services/dbService.js';
import { safeAsync } from './utils/safe.js';

import validateEnv from './config/validateEnv.js';
import redis from './services/redisService.js';

// 1. BLINDAJE GLOBAL Y VALIDACIÓN DE ENTORNO v9.0.0
validateEnv();

const app = express();

// Blindaje total contra caídas por errores no capturados
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.stack);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Endpoint de Healthcheck Profesional v9.0.0
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
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
import authRoutes from './handlers/api/auth.js';
import userRoutes from './handlers/api/users.js';
import taskRoutes from './handlers/api/tasks.js';
import rechargeRoutes from './handlers/api/recharges.js';
import withdrawalRoutes from './handlers/api/withdrawals.js';
import adminRoutes from './handlers/api/admin.js';
import telegramAdminRoutes from './handlers/api/telegram_admin.js';
import telegramWebhookRoutes from './handlers/api/telegram_webhook.js';
import sorteoRoutes from './handlers/api/sorteo.js';
import saasRoutes from './handlers/api/saas.js';
import levelRoutes from './handlers/api/levels.js';

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
