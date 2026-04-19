import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initTelegramHandlers } from './services/telegramInitializer.js';
import { query } from './config/db.js';
import { syncLevels } from './lib/queries.js';

// 1. VALIDACIÓN DE ENTORNO CRÍTICA v7.0.5
dotenv.config();

const requiredEnv = [
  'PORT', 'JWT_SECRET', 'MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE',
  'TELEGRAM_BOT_TOKEN_ADMIN', 'TELEGRAM_CHAT_ADMIN',
  'REDIS_HOST', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'
];
const missingEnv = requiredEnv.filter(k => !process.env[k]);

if (missingEnv.length > 0) {
  logger.error(`[FATAL] Faltan variables de entorno críticas: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// Forzar NODE_ENV=production si no está definido para seguridad
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

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

// Health Check avanzado para monitoreo
app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      uptime: process.uptime(),
      version: '7.0.5',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// 3. MANEJO DE ERRORES GLOBAL (Fallback final)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Verificar conexión DB al inicio
    await query('SELECT 1');
    logger.info('[DB] Conexión MySQL establecida correctamente.');

    // Sincronizar niveles institucionales
    await syncLevels().catch(e => logger.warn(`[SYNC] Falló sincronización inicial de niveles: ${e.message}`));

    const server = app.listen(PORT, () => {
      logger.info(`[SERVER] BCB Global Backend v7.0.5 estable en puerto ${PORT}`);
      logger.info(`[ENV] Modo: ${process.env.NODE_ENV || 'development'}`);
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
process.on('uncaughtException', (err) => {
  logger.error('[CRITICAL] Uncaught Exception:', { message: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[CRITICAL] Unhandled Rejection:', { reason });
});

startServer();
