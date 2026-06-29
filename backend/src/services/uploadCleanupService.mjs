import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(__dirname, '../../public/uploads');

const MAX_FILE_AGE_MS = 72 * 60 * 60 * 1000; // 72 horas
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

const WITHDRAWAL_KEYWORDS = ['retiro', 'retiros', 'withdrawal', 'withdrawals'];
const RECHARGE_KEYWORDS = ['recarga', 'recargas', 'recharge', 'payment', 'pago', 'pagos'];
const PROTECTED_KEYWORDS = [
  'qr', 'admin', 'banner', 'banners', 'logo', 'logos', 'avatar', 
  'sistema', 'system', 'apk', 'assets', 'frontend', 'dist', 
  'node_modules', 'backups', '.bak'
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];

/**
 * Ejecuta la limpieza de archivos de retiros y recargas una vez.
 */
export async function runUploadCleanupOnce() {
  const stats = { scanned: 0, deleted: 0, skipped: 0, protected: 0, errors: 0 };
  
  try {
    logger.info('[UPLOAD CLEANUP] started');
    
    // Verificar si existe la carpeta de uploads
    try {
      await fs.access(UPLOADS_ROOT);
    } catch (e) {
      logger.warn(`[UPLOAD CLEANUP] Root uploads directory not found: ${UPLOADS_ROOT}`);
      return stats;
    }

    await scanDirectory(UPLOADS_ROOT, stats);
    
    logger.info(`[UPLOAD CLEANUP] completed scanned=${stats.scanned} deleted=${stats.deleted} skipped=${stats.skipped} protected=${stats.protected} errors=${stats.errors}`);
  } catch (error) {
    logger.error(`[UPLOAD CLEANUP] Critical error: ${error.message}`);
  }
  return stats;
}

/**
 * Escanea un directorio de forma recursiva.
 */
async function scanDirectory(dir, stats) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const lowerPath = fullPath.toLowerCase();

      if (entry.isDirectory()) {
        // No eliminar carpetas, solo escanear contenido
        await scanDirectory(fullPath, stats);
      } else if (entry.isFile()) {
        stats.scanned++;
        
        // 1. Validar extensión
        const ext = path.extname(entry.name).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          stats.skipped++;
          continue;
        }

        // 2. Validar rutas protegidas
        const isProtected = PROTECTED_KEYWORDS.some(k => lowerPath.includes(k));
        if (isProtected) {
          stats.protected++;
          // logger.debug(`[UPLOAD CLEANUP] skipped protected: ${fullPath}`);
          continue;
        }

        // 3. Validar si es una ruta de retiro o recarga
        const isWithdrawal = WITHDRAWAL_KEYWORDS.some(k => lowerPath.includes(k));
        const isRecharge = RECHARGE_KEYWORDS.some(k => lowerPath.includes(k));
        if (!isWithdrawal && !isRecharge) {
          stats.skipped++;
          // logger.debug(`[UPLOAD CLEANUP] skipped non-withdrawal/non-recharge path: ${fullPath}`);
          continue;
        }

        // 4. Validar antigüedad
        try {
          const fileStat = await fs.stat(fullPath);
          const ageMs = Date.now() - fileStat.mtimeMs;
          
          if (ageMs > MAX_FILE_AGE_MS) {
            await fs.unlink(fullPath);
            stats.deleted++;
            logger.info(`[UPLOAD CLEANUP] deleted: ${fullPath}`);
          } else {
            stats.skipped++;
          }
        } catch (err) {
          stats.errors++;
          logger.error(`[UPLOAD CLEANUP] error stat/unlink ${fullPath}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    stats.errors++;
    logger.error(`[UPLOAD CLEANUP] error reading directory ${dir}: ${err.message}`);
  }
}

/**
 * Inicia el servicio de limpieza programado.
 */
export function startUploadCleanupService() {
  // Ejecutar inmediatamente al inicio
  runUploadCleanupOnce().catch(err => {
    logger.warn(`[UPLOAD CLEANUP] Initial run failed: ${err.message}`);
  });

  // Programar ejecución periódica
  setInterval(async () => {
    try {
      await runUploadCleanupOnce();
    } catch (err) {
      logger.error(`[UPLOAD CLEANUP] Scheduled run failed: ${err.message}`);
    }
  }, CLEANUP_INTERVAL_MS);
}
