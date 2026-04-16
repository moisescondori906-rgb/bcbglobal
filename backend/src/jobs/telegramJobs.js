import { botAdmin, botRetiros, botSecretaria, sendToAdmin, sendToRetiros, sendToSecretaria } from '../services/telegramBot.js';
import { WithdrawalRepository, CronRepository } from '../repositories/telegramRepository.js';
import worker from '../services/TelegramWorker.js';
import { transaction, query, queryOne } from '../config/db.js';

/**
 * setupJobs - Orquestador de tareas automáticas con blindaje cron.
 */
export const setupJobs = () => {
  
  // 1. Job de Liberación por Timeout (Cada 2 minutos)
  setInterval(async () => {
    try {
      // Buscar retiros tomados hace > 10 min
      const expirados = await query(
        `SELECT id, tomado_por_nombre FROM retiros 
         WHERE estado_operativo='tomado' AND tomado_en < NOW() - INTERVAL 10 MINUTE`
      );

      for (const ret of expirados) {
        await transaction(async (conn) => {
          // Validar estado nuevamente dentro de la transacción
          const [check] = await conn.query(`SELECT estado_operativo FROM retiros WHERE id=? FOR UPDATE`, [ret.id]);
          if (check.estado_operativo !== 'tomado') return;

          await conn.query(`UPDATE retiros SET estado_operativo='pendiente', tomado_por_telegram_user_id=NULL, tomado_por_nombre=NULL, tomado_en=NULL WHERE id=?`, [ret.id]);
          await conn.query(`INSERT INTO historial_retiros (retiro_id, accion, detalles) VALUES (?, 'liberado_timeout', 'Excedió límite de 10 minutos')`, [ret.id]);
        });

        const msg = `⚠️ <b>RETIRO LIBERADO POR INACTIVIDAD</b>\n\nEl caso <b>${ret.id}</b> ha sido liberado porque el operador <b>${ret.tomado_por_nombre}</b> no lo procesó en el tiempo límite.`;
        await sendToAdmin(msg); await sendToRetiros(msg); await sendToSecretaria(msg);
      }
    } catch (err) { console.error("[JOBS] Error en Liberación:", err.message); }
  }, 2 * 60 * 1000);

  // 2. Job de Alertas Inteligentes (Cada 3 minutos)
  setInterval(async () => {
    try {
      const pendientes = await WithdrawalRepository.findPendingForAlert(5); // Sin tomar > 5 min
      
      if (pendientes.length > 0) {
        let alertMsg = `📢 <b>MONITOR DE RETIROS PENDIENTES (>5 MIN)</b>\n\n`;
        for (const ret of pendientes) {
          alertMsg += `🔸 ID: ${ret.id} - <b>${ret.monto} Bs</b> (${ret.telefono_usuario})\n`;
          await WithdrawalRepository.markAsAlerted(ret.id);
        }
        alertMsg += `\n⚠️ <i>Por favor, un operador disponible tome estos casos.</i>`;
        await sendToAdmin(alertMsg);
      }
    } catch (err) { console.error("[JOBS] Error en Alertas:", err.message); }
  }, 3 * 60 * 1000);

  // 3. Reporte Diario 23:30 (Con Blindaje Cron)
  setInterval(async () => {
    const now = new Date();
    const boliviaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    
    if (boliviaTime.getHours() === 23 && boliviaTime.getMinutes() === 30) {
      const hoy = boliviaTime.toISOString().split('T')[0];
      
      try {
        // Verificar ejecución única
        const yaEjecutado = await CronRepository.isExecuted('reporte_diario', hoy);
        if (yaEjecutado) return;

        // Estadísticas Generales
        const stats = await queryOne(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN estado_operativo='aprobado' THEN 1 ELSE 0 END) as aprobados,
            SUM(CASE WHEN estado_operativo='rechazado' THEN 1 ELSE 0 END) as rechazados,
            AVG(TIMESTAMPDIFF(SECOND, created_at, resuelto_en)) as avg_resolucion
          FROM retiros WHERE DATE(resuelto_en) = CURDATE()
        `);

        // Ranking
        const ranking = await query(`
          SELECT 
            nombre_operador, total_tomados, (total_aprobados + total_rechazados) as total_procesados,
            ROUND((total_aprobados / NULLIF(total_aprobados + total_rechazados, 0)) * 100, 1) as eficiencia,
            ROUND(tiempo_total_proceso_seg / NULLIF(total_aprobados + total_rechazados, 0), 0) as avg_seg
          FROM estadisticas_operadores WHERE fecha = CURDATE() ORDER BY total_procesados DESC
        `);

        let report = `📊 <b>REPORTE FINTECH DEL DÍA (${hoy})</b>\n\n` +
          `📈 <b>General:</b>\n` +
          `Total: <b>${stats.total}</b> | ✅ ${stats.aprobados || 0} | ❌ ${stats.rechazados || 0}\n` +
          `⏱ Promedio Resolución: ${Math.round((stats.avg_resolucion || 0) / 60)} min\n\n` +
          `🏆 <b>Ranking de Operadores:</b>\n`;

        ranking.forEach((op, i) => {
          const icon = op.avg_seg > 120 ? '🐢' : '⚡';
          report += `${i+1}. ${op.nombre_operador}: <b>${op.total_procesados}</b> (${op.eficiencia}% | ${icon} ${op.avg_seg}s)\n`;
        });

        const inactivos = await query(`SELECT nombre FROM usuarios_telegram WHERE activo=1 AND rol != 'secretaria' AND telegram_id NOT IN (SELECT telegram_id FROM estadisticas_operadores WHERE fecha = CURDATE())`);
        if (inactivos.length > 0) {
          report += `\n💤 <b>Inactivos:</b> ${inactivos.map(u => u.nombre).join(', ')}`;
        }

        await sendToAdmin(report);
        await CronRepository.registerExecution('reporte_diario', hoy);
        
      } catch (err) {
        console.error("[JOBS] Error en Reporte:", err.message);
        await CronRepository.registerExecution('reporte_diario', hoy, { resultado: 'error', detalles: err.message });
      }
    }
  }, 60 * 1000);
};
