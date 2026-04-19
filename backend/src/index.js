import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './lib/logger.js';
import { setupWebhooks } from './services/telegramBot.js';
import { initTelegramHandlers } from './services/telegramInitializer.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import levelRoutes from './routes/levels.js';
import rechargeRoutes from './routes/recharges.js';
import withdrawalRoutes from './routes/withdrawals.js';
import telegramRoutes from './routes/telegram.js';
import adminRoutes from './routes/admin.js';
import telegramAdminRoutes from './routes/telegram_admin.js';
import sorteoRoutes from './routes/sorteo.js';
import saasRoutes from './routes/saas.js';
import telegramWebhookRoutes from './routes/telegram_webhook.js';
import { setupJobs } from './jobs/telegramJobs.js'; // Importar setupJobs
import { preloadConfig, preloadLevels, boliviaTime } from './lib/queries.js';
import { query } from './config/db.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { tenantContext } from './middleware/tenantMiddleware.js';
import { slaMiddleware } from './middleware/slaMiddleware.js';

// Forzar Zona Horaria de Bolivia
process.env.TZ = 'America/La_Paz';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// 0. Robustez Global: Blindaje Anti-Caídas (Nivel Senior)
process.on('uncaughtException', (err) => {
  logger.error('[FATAL] Uncaught Exception:', {
    message: err.message,
    stack: err.stack
  });
  // En producción, no cerramos el proceso a menos que sea crítico
  if (process.env.NODE_ENV === 'production') {
    logger.warn('[SHIELD] Manteniendo el servidor vivo a pesar del error crítico.');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[FATAL] Unhandled Rejection:', {
    promise,
    reason: reason?.message || reason
  });
});

// Validación de dependencias críticas al iniciar con reporte detallado
const criticalEnv = [
  'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 
  'REDIS_HOST', 'REDIS_PORT', 'JWT_SECRET',
  'BACKEND_URL', 'TELEGRAM_BOT_TOKEN_ADMIN'
];

const missingEnv = criticalEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  logger.error('[CRITICAL] Faltan variables de entorno obligatorias:', missingEnv);
  if (process.env.NODE_ENV === 'production') {
    logger.error('[SHUTDOWN] No se puede iniciar en producción sin variables críticas. Verifique .env');
    process.exit(1);
  } else {
    logger.warn('[DEBUG] Iniciando en modo limitado (Faltan variables .env)');
  }
}

// 1. Seguridad & Middleware de Producción
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '20mb' })); // Aumentado para vouchers de alta resolución
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Configuración de CORS estricta y optimizada
const whitelist = [
  'https://sav-lat.vercel.app',
  'https://bcb-global.com',
  'https://www.bcb-global.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  maxAge: 86400, // Cache de preflight por 24 horas para reducir carga
};
app.use(cors(corsOptions));

// 2. Webhooks de Telegram (Endpoint dedicado antes de las rutas generales)
// initTelegramHandlers(); // Movido a startServer()
// setupWebhooks(); // Movido a startServer()

// 3. Health Check Avanzado (Métricas de Resiliencia)
app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', time: boliviaTime.getTimeString(), uptime: process.uptime() });
});

// 4. Rutas de API
const apiV1 = express.Router();

// Inyectar contexto de Tenant y métricas de SLA
apiV1.use(tenantContext);
apiV1.use(slaMiddleware);

// Endpoint de Contenido Público (Configuraciones, Banners, etc.)
apiV1.get('/public-content', async (req, res) => {
  try {
    const content = await preloadConfig();
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar contenido público' });
  }
});

apiV1.use('/auth', rateLimiter(60000, 15), authRoutes);
apiV1.use('/users', userRoutes);
apiV1.use('/tasks', rateLimiter(60000, 40), taskRoutes);
apiV1.use('/levels', levelRoutes);
apiV1.use('/recharges', rechargeRoutes);
apiV1.use('/withdrawals', withdrawalRoutes);
apiV1.use('/telegram', telegramRoutes);
apiV1.use('/admin/telegram', telegramAdminRoutes);
apiV1.use('/admin', adminRoutes);
apiV1.use('/sorteo', sorteoRoutes);
apiV1.use('/saas', saasRoutes);

// Registrar Versiones de API
app.use('/api/v1', apiV1);
app.use('/api', apiV1); // Retrocompatibilidad para clientes antiguos

// Rutas de V2 (Sistema Autónomo Inteligente)
const apiV2 = express.Router();
apiV2.use(tenantContext);
// apiV2.use('/fraud', fraudV2Routes); // A implementar
app.use('/api/v2', apiV2);

// Servir archivos estáticos
const publicPath = path.join(__dirname, '../../frontend/public');
const backendPublicPath = path.join(__dirname, '../public');
app.use('/uploads', express.static(path.join(backendPublicPath, 'uploads')));
app.use('/imag', express.static(path.join(publicPath, 'imag')));
app.use('/video', express.static(path.join(publicPath, 'video')));
app.use('/', express.static(publicPath));

const startServer = async () => {
  try {
    // 0. Validación de Conexión a Base de Datos
    try {
      await query('SELECT 1');
      logger.info('[DATABASE] MySQL conectado correctamente.');
    } catch (dbErr) {
      logger.error('[CRITICAL] Fallo de conexión a Base de Datos:', dbErr.message);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }

    // 1. Pre-carga de Cachés Críticas
    await preloadConfig().catch(() => logger.warn('[STARTUP] No se pudo cargar config inicial.'));
    await preloadLevels().catch(() => logger.warn('[STARTUP] No se pudo cargar niveles iniciales.'));
    
    const server = app.listen(PORT, () => {
      logger.info(`[SUCCESS] Servidor BCB Global v7.0.0 estable en puerto ${PORT}`);
    });

    // 2. Manejo de Webhooks tras iniciar el servidor
    initTelegramHandlers();
    setupWebhooks().catch(err => logger.error('[TELEGRAM] Error configurando webhooks:', err.message));

    // 2.1 Inicializar Tareas Programadas (Jobs)
    try {
      setupJobs();
    } catch (err) {
      logger.error('[JOBS] Error inicializando Jobs:', err.message);
    }

    // 3. Graceful Shutdown
    const shutdown = async (signal) => {
      logger.info(`[SHUTDOWN] Recibida señal ${signal}. Cerrando de forma segura...`);
      server.close(() => logger.info('[HTTP] Servidor detenido.'));
      
      try {
        const { closeRedis } = await import('./services/redisService.js');
        const { pool } = await import('./config/db.js');
        await closeRedis();
        if (pool) await pool.end();
        logger.info('[SUCCESS] Conexiones cerradas. Bye!');
        process.exit(0);
      } catch (err) {
        logger.error('[ERROR] Durante shutdown:', err.message);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('[FATAL-STARTUP] El servidor no pudo iniciar:', err);
    process.exit(1);
  }
};

app.use(errorHandler);

startServer();
