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

// 1. VALIDACIÓN DE ENTORNO CRÍTICA
dotenv.config();

const requiredEnv = ['PORT', 'JWT_SECRET', 'MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
const missingEnv = requiredEnv.filter(k => !process.env[k]);

if (missingEnv.length > 0) {
  logger.error(`[FATAL] Faltan variables de entorno críticas: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de CORS dinámica
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://bcb-global.com',
  'https://www.bcb-global.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS no permitido por política de seguridad.'));
    }
  },
  credentials: true
}));

// Límites de subida aumentados para vouchers de alta resolución
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// 2. IMPORTACIÓN DE RUTAS (CON ASYNC HANDLER YA INTEGRADO EN LAS RUTAS)
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import rechargeRoutes from './routes/recharges.js';
import withdrawalRoutes from './routes/withdrawals.js';
import adminRoutes from './routes/admin.js';
import telegramAdminRoutes from './routes/telegram_admin.js';
import telegramWebhookRoutes from './routes/telegram_webhook.js';
import sorteoRoutes from './routes/sorteo.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/recharges', rechargeRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/telegram', telegramAdminRoutes);
app.use('/api/telegram-webhook', telegramWebhookRoutes);
app.use('/api/sorteo', sorteoRoutes);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// 3. MANEJO DE ERRORES GLOBAL
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Verificar conexión DB
    await query('SELECT 1');
    logger.info('[DB] Conexión establecida correctamente.');

    // Sincronizar niveles al iniciar
    await syncLevels().catch(e => logger.warn(`[SYNC] Falló sincronización inicial de niveles: ${e.message}`));

    const server = app.listen(PORT, () => {
      logger.info(`[SERVER] BCB Global Backend v7.0.4 corriendo en puerto ${PORT}`);
      logger.info(`[ENV] Modo: ${process.env.NODE_ENV || 'development'}`);
    });

    // 4. INICIALIZACIÓN DE TELEGRAM (DESACOPLADA Y SEGURA)
    // Se envuelve en un pequeño delay para asegurar que el server HTTP esté listo
    setTimeout(() => {
      initTelegramHandlers().catch(err => {
        logger.error('[TELEGRAM] Error crítico en inicialización de bots:', err);
        // NO cerramos el server, permitimos que el backend siga funcionando sin bots
      });
    }, 1000);

    // Graceful Shutdown
    process.on('SIGTERM', () => {
      logger.info('[SERVER] SIGTERM recibido. Cerrando...');
      server.close(() => {
        logger.info('[SERVER] Proceso finalizado.');
        process.exit(0);
      });
    });

  } catch (err) {
    logger.error('[FATAL] Error durante el arranque del servidor:', err);
    process.exit(1);
  }
}

startServer();
