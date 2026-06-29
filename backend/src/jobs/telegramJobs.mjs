import { botAdmin, botRetiros, botSecretaria } from '../services/telegramBot.mjs';
import { WithdrawalRepository, CronRepository } from '../services/repositories/telegramRepository.mjs';
import { WithdrawalService } from '../services/withdrawalService.mjs';
import worker from '../services/TelegramWorker.mjs';
import { checkGlobalRateLimit, acquireLock, releaseLock } from '../services/redisService.mjs';
import { query } from '../config/db.mjs';
import logger from '../utils/logger.mjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * setupJobs - Orquestador con Resiliencia y Trazabilidad.
 */
export const setupJobs = () => {
  
  // 1. Job de Liberación por Timeout con Redlock (Resistente a Clusters)
  setInterval(async () => {
    const traceId = uuidv4();
    const lock = await acquireLock('job-liberacion', 60000); // 1 min lock
    if (!lock) return;

    try {
      const expirados = await query(
        `SELECT id, tomado_por_nombre FROM retiros 
         WHERE estado_operativo='tomado' AND tomado_en < NOW() - INTERVAL 10 MINUTE`
      );

      for (const ret of expirados) {
        await WithdrawalService.releaseByTimeout(ret.id, { traceId });
      }
    } catch (err) {
      logger.error(`[JOBS] Error en Liberación`, { traceId, error: err.message });
    } finally {
      await releaseLock(lock);
    }
  }, 2 * 60 * 1000);

  // 2. Job de Alertas Inteligentes con Redlock
  setInterval(async () => {
    const traceId = uuidv4();
    const lock = await acquireLock('job-alertas', 60000);
    if (!lock) return;

    try {
      const pendientes = await WithdrawalRepository.findPendingForAlert(5);
      if (pendientes.length > 0) {
        let alertMsg = `📢 <b>MONITOR RESILIENTE - RETIROS (>5 MIN)</b>\n\n`;
        for (const ret of pendientes) {
          alertMsg += `🔸 ID: ${ret.id} - <b>${ret.monto} Bs</b>\n`;
          await WithdrawalRepository.markAsAlerted(ret.id);
        }
        await worker.addToQueue(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, alertMsg, { traceId });
      }
    } catch (err) {
      logger.error(`[JOBS] Error en Alertas`, { traceId, error: err.message });
    } finally {
      await releaseLock(lock);
    }
  }, 3 * 60 * 1000);

  // 3. Reporte Diario 23:30 (Con Idempotencia Persistente)
  setInterval(async () => {
    const now = new Date();
    const boliviaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    
    if (boliviaTime.getHours() === 23 && boliviaTime.getMinutes() === 30) {
      const traceId = uuidv4();
      const hoy = boliviaTime.toISOString().split('T')[0];
      
      try {
        const lock = await acquireLock(`reporte:${hoy}`, 300000); // 5 min lock
        if (!lock) return;

        const yaEjecutado = await CronRepository.isExecuted('reporte_diario', hoy);
        if (yaEjecutado) {
          await releaseLock(lock);
          return;
        }

        // Generar reporte (Lógica delegada a un servicio si crece más)
        const stats = await query(`SELECT COUNT(*) as total FROM retiros WHERE DATE(resuelto_en) = ?`, [hoy]);
        const msg = `📊 <b>REPORTE RESILIENTE (${hoy})</b>\nTotal: ${stats[0].total}`;
        
        await worker.addToQueue(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, msg, { traceId });
        await CronRepository.registerExecution('reporte_diario', hoy, { traceId });
        
        await releaseLock(lock);
      } catch (err) {
        logger.error(`[JOBS] Error en Reporte Diario`, { traceId, error: err.message });
      }
    }
  }, 60 * 1000);
};
