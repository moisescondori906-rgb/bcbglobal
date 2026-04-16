import { botAdmin, botRetiros, botSecretaria, sendToAdmin, sendToRetiros, sendToSecretaria } from '../services/telegramBot.js';
import { WithdrawalRepository } from '../repositories/telegramRepository.js';
import worker from '../services/TelegramWorker.js';
import { transaction, query, queryOne } from '../config/db.js';

export const setupJobs = () => {
  // 1. Liberación por Timeout
  setInterval(async () => {
    try {
      const expirados = await query(`SELECT id, msg_id_admin, msg_id_retiros, msg_id_secretaria, tomado_por_nombre FROM retiros WHERE estado_operativo='tomado' AND fecha_toma < NOW() - INTERVAL 10 MINUTE`);
      for (const ret of expirados) {
        await transaction(async (conn) => {
          await conn.query(`UPDATE retiros SET estado_operativo='pendiente', tomado_por=NULL, tomado_por_nombre=NULL, fecha_toma=NULL WHERE id=?`, [ret.id]);
          await conn.query(`INSERT INTO historial_retiros (retiro_id, accion, detalles) VALUES (?, 'liberado_timeout', 'Liberado automáticamente por inactividad')`, [ret.id]);
        });
        const alertMsg = `⚠️ <b>RETIRO LIBERADO</b>\n\nEl caso <b>${ret.id}</b> ha sido liberado porque <b>${ret.tomado_por_nombre || 'desconocido'}</b> no lo procesó en 10 minutos.`;
        await sendToAdmin(alertMsg); await sendToRetiros(alertMsg); await sendToSecretaria(alertMsg);
        await worker.sendCriticalAlert(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, "Liberación por Inactividad", `ID: ${ret.id}\nOperador: ${ret.tomado_por_nombre || 'N/A'}`);
      }
    } catch (err) { console.error("[CRON-TIMEOUT] Error:", err.message); }
  }, 5 * 60 * 1000);

  // 2. Alerta de Retiros sin tomar > 5 minutos
  setInterval(async () => {
    try {
      const pendientes = await query(`SELECT id, monto, telefono_usuario FROM retiros WHERE estado_operativo='pendiente' AND created_at < NOW() - INTERVAL 5 MINUTE`);
      for (const ret of pendientes) {
        await worker.sendCriticalAlert(botAdmin, process.env.TELEGRAM_CHAT_ADMIN, "Retiro Sin Atender", `ID: ${ret.id}\nMonto: ${ret.monto} Bs\nUsuario: ${ret.telefono_usuario}\n\n⚠️ Este retiro lleva más de 5 minutos sin ser tomado.`);
      }
    } catch (err) { console.error("[CRON-ALERT] Error:", err.message); }
  }, 2 * 60 * 1000);

  // 3. Reporte Diario Automático (23:30 Bolivia)
  setInterval(async () => {
    const now = new Date();
    const boliviaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    if (boliviaTime.getHours() === 23 && boliviaTime.getMinutes() === 30) {
      try {
        const hoy = boliviaTime.toISOString().split('T')[0];
        const yaEjecutado = await queryOne(`SELECT id FROM control_cron WHERE tipo='reporte_diario' AND fecha=?`, [hoy]);
        if (yaEjecutado) return;
        await query(`INSERT IGNORE INTO control_cron (tipo, fecha) VALUES ('reporte_diario', ?)`, [hoy]);

        const stats = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN estado_operativo='aprobado' THEN 1 ELSE 0 END) as aprobados, SUM(CASE WHEN estado_operativo='rechazado' THEN 1 ELSE 0 END) as rechazados, AVG(TIMESTAMPDIFF(SECOND, fecha_toma, fecha_procesado)) as avg_time FROM retiros WHERE DATE(fecha_procesado) = CURDATE()`);
        const ranking = await query(`SELECT nombre_operador, total_tomados, (total_aprobados + total_rechazados) as total_procesados, total_aprobados, total_rechazados, CASE WHEN (total_aprobados + total_rechazados) > 0 THEN ROUND((total_aprobados / (total_aprobados + total_rechazados)) * 100, 1) ELSE 0 END as tasa_aprobacion, ROUND(tiempo_total_proceso_seg / NULLIF(total_aprobados + total_rechazados, 0), 1) as avg_proceso_seg FROM estadisticas_operadores WHERE fecha = CURDATE() ORDER BY total_procesados DESC`);
        const inactivos = await query(`SELECT nombre FROM usuarios_telegram WHERE activo=1 AND rol != 'secretaria' AND telegram_id NOT IN (SELECT telegram_id FROM estadisticas_operadores WHERE fecha = CURDATE())`);

        let reportMsg = `📊 <b>REPORTE DE DESEMPEÑO (${boliviaTime.toLocaleDateString()})</b>\n\n` +
          `📈 <b>General:</b>\nTotal procesados: <b>${stats?.total || 0}</b>\n✅ Aprobados: ${stats?.aprobados || 0}\n❌ Rechazados: ${stats?.rechazados || 0}\n⏱ Tiempo Promedio: ${stats?.avg_time ? (stats.avg_time / 60).toFixed(1) : 0} min\n\n`;

        if (ranking.length > 0) {
          reportMsg += `🏆 <b>TOP OPERADORES (Volumen):</b>\n`;
          ranking.slice(0, 3).forEach((op, i) => { reportMsg += `${i+1}. ${op.nombre_operador}: <b>${op.total_procesados}</b> (Eficiencia: ${op.tasa_aprobacion}% | ${op.avg_proceso_seg}s)\n`; });
          const lentos = ranking.filter(op => op.avg_proceso_seg > 120);
          if (lentos.length > 0) { reportMsg += `\n🐢 <b>OPERADORES LENTOS (>2min):</b>\n`; lentos.forEach(op => { reportMsg += `- ${op.nombre_operador}: ${op.avg_proceso_seg}s promedio\n`; }); }
        }
        if (inactivos.length > 0) { reportMsg += `\n💤 <b>OPERADORES INACTIVOS:</b>\n`; reportMsg += inactivos.map(u => u.nombre).join(', '); }
        await sendToAdmin(reportMsg);
      } catch (err) { console.error("[CRON-REPORT] Error:", err.message); }
    }
  }, 60 * 1000);
};
