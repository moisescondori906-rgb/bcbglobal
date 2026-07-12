import { setupAdminBot, sendToSecretaria, setupRetirosBot } from './telegramBot.mjs';
import { safeTelegramCall, safeAsync } from '../utils/safe.mjs';
import { query, queryOne, transaction } from '../config/db.mjs';
import { 
  peruTime, 
  approveLevelPurchase, 
  approveRetiro, 
  rejectRetiro,
  getRetiroById,
  getRecargaById,
  getLevels,
  findUserById,
  distributeInvestmentCommissions,
  getDailyWithdrawalSummary,
  getDailyOperatorSummary
} from './dbService.mjs';
import { checkIdempotencyRedis, acquireLock, releaseLock } from './redisService.mjs';
import logger from '../utils/logger.mjs';
import { CronJob } from 'cron';
import * as qrService from './qrService.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function sendDailyOperatorReport(bot, chatId) {
  try {
    const data = await getDailyOperatorSummary();
    const dateStr = peruTime.todayStr();
    const t = data.totales;

    let message = `📊 <b>RESUMEN DIARIO DE OPERADORES</b>\n` +
                  `━━━━━━━━━━━━━━━━━━\n` +
                  `📅 <b>Fecha:</b> ${dateStr}\n` +
                  `🔁 <b>Recargas procesadas:</b> ${t.recargas_procesadas}\n` +
                  `💵 <b>Total recargas:</b> ${t.total_recargas} Bs\n` +
                  `🏧 <b>Retiros procesados:</b> ${t.retiros_procesadas}\n` +
                  `💵 <b>Total retiros solicitados:</b> ${t.total_retiros_solicitados} Bs\n` +
                  `✅ <b>Neto pagado retiros:</b> ${t.total_neto_pagado} Bs\n` +
                  `📉 <b>Descuento total 15%:</b> ${t.total_descuento_15} Bs\n` +
                  `🤝 <b>Comisión operadores 5%:</b> ${t.total_comision_operadores_5} Bs\n` +
                  `🏦 <b>Comisión plataforma 10%:</b> ${t.total_comision_plataforma_10} Bs\n` +
                  `━━━━━━━━━━━━━━━━━━\n\n` +
                  `👥 <b>DETALLE POR OPERADOR</b>\n` +
                  `━━━━━━━━━━━━━━━━━━\n`;

    if (data.operadores.length === 0) {
      message += `<i>No hubo actividad de operadores hoy.</i>`;
    } else {
      data.operadores.forEach(op => {
        const username = op.username ? ` (@${op.username})` : '';
        message += `🤝 <b>Operador:</b> ${op.nombre}${username}\n` +
                   `🆔 <b>Registro:</b> <code>${op.telegram_id}</code>\n` +
                   `🔁 <b>Recargas tomadas:</b> ${op.recargas_tomadas}\n` +
                   `💵 <b>Total recargas:</b> ${op.total_recargas} Bs\n` +
                   `🏧 <b>Retiros tomados:</b> ${op.retiros_tomadas}\n` +
                   `💵 <b>Total retiros:</b> ${op.total_retiros} Bs\n` +
                   `✅ <b>Neto pagado:</b> ${op.neto_pagado} Bs\n` +
                   `💰 <b>Comisión retiros 5%:</b> ${op.comision_5} Bs\n` +
                   `━━━━━━━━━━━━━━━━━━\n`;
      });
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (err) {
    logger.error(`[TELEGRAM-REPORT-OP] Error: ${err.message}`);
  }
}

async function sendDailyUnpaidQRReport(bot, chatId) {
  try {
    const pendingRetiros = await query(`
      SELECT 
        r.*, 
        u.nombre_usuario as usuario_nombre, 
        u.telefono as usuario_telefono,
        JSON_EXTRACT(r.datos_bancarios, '$.nombre_banco') as banco,
        JSON_EXTRACT(r.datos_bancarios, '$.numero_cuenta') as cuenta
      FROM retiros r
      LEFT JOIN usuarios u ON r.usuario_id = u.id
      WHERE r.estado = 'Verificando'
      ORDER BY r.created_at DESC
    `);
    const dateStr = peruTime.todayStr();
    
    if (pendingRetiros.length === 0) {
      const message = `✅ <b>REPORTE DIARIO RETIROS PENDIENTES</b>\n` +
                      `━━━━━━━━━━━━━━━━━━\n` +
                      `📅 <b>Fecha:</b> ${dateStr}\n` +
                      `🎉 <b>¡Excelente!</b> No hay retiros Verificando de pago.\n` +
                      `━━━━━━━━━━━━━━━━━━`;
      await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      return;
    }

    const filename = `retiros_Verificando_${dateStr}.csv`;
    const filePath = generateCSV(pendingRetiros, filename, 'retiros');
    
    const caption = `🔴 <b>REPORTE DIARIO RETIROS PENDIENTES</b>\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `📅 <b>Fecha:</b> ${dateStr}\n` +
                    `📊 <b>Total Verificando:</b> ${pendingRetiros.length}\n` +
                    `━━━━━━━━━━━━━━━━━━`;
    
    await bot.sendDocument(chatId, filePath, { caption, parse_mode: 'HTML' });
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    logger.error(`[TELEGRAM-REPORT-QR] Error: ${err.message}`);
  }
}

function maskPhone(phone) {
  const raw = String(phone || '');
  const digits = raw.replace(/\D/g, '');
  const last5 = digits.slice(-5);

  if (!last5) return 'Sin número';

  if (digits.startsWith('591')) {
    return `+591******${last5}`;
  }

  return `******${last5}`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateCSV(data, filename, type = 'qrs') {
  let headers, rows;
  
  if (type === 'retiros') {
    headers = ['ID', 'Usuario', 'Teléfono', 'Monto (Bs)', 'Monto Neto (Bs)', 'Banco', 'Cuenta', 'Estado', 'Fecha Creación'];
    rows = data.map(retiro => [
      retiro.id,
      retiro.usuario_nombre || 'N/A',
      retiro.usuario_telefono || 'N/A',
      retiro.monto || 'N/A',
      retiro.monto_neto || 'N/A',
      retiro.banco || 'N/A',
      retiro.cuenta || 'N/A',
      retiro.estado || 'Pendiente',
      peruTime.getTimeString(new Date(retiro.created_at))
    ]);
  } else {
    headers = ['ID', 'Usuario', 'Monto (Bs)', 'Estado', 'Fecha Creación', 'Procesado Por', 'Imagen QR'];
    rows = data.map(qr => [
      qr.id,
      qr.usuario_nombre || 'N/A',
      qr.monto || 'N/A',
      qr.pagado ? 'Pagado' : 'No Pagado',
      peruTime.getTimeString(new Date(qr.created_at)),
      qr.procesado_por_nombre || 'N/A',
      qr.imagen_url || 'N/A'
    ]);
  }

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, csvContent, 'utf8');
  return filePath;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBoliviaDateTime(value) {
  if (!value) return 'Sin hora';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('es-BO', {
    timeZone: 'America/La_Paz',
    hour12: false
  });
}

async function getDailyOperationsReportData(dateStr = peruTime.todayStr()) {
  const recargas = await query(`
    SELECT
      c.id,
      c.monto,
      COALESCE(c.procesado_at, c.created_at) AS fecha_operacion,
      u.nombre_usuario,
      u.telefono,
      n.nombre AS nivel_nombre
    FROM compras_nivel c
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    LEFT JOIN niveles n ON n.id = c.nivel_id
    WHERE DATE(COALESCE(c.procesado_at, c.created_at)) = ?
      AND c.estado = 'Aceptado'
    ORDER BY COALESCE(c.procesado_at, c.created_at) ASC, c.created_at ASC, c.id ASC
  `, [dateStr]);

  const vipRetiros = await query(`
    SELECT
      r.id,
      r.monto,
      r.monto_neto,
      COALESCE(r.procesado_at, r.created_at) AS fecha_operacion,
      u.nombre_usuario,
      u.telefono,
      n.nombre AS nivel_nombre,
      n.codigo AS nivel_codigo
    FROM retiros r
    LEFT JOIN usuarios u ON u.id = r.usuario_id
    LEFT JOIN niveles n ON n.id = u.nivel_id
    WHERE r.fecha_dia = ?
      AND r.estado = 'Aceptado'
      AND COALESCE(LOWER(n.codigo), '') NOT IN ('internar', 'pasantia')
    ORDER BY COALESCE(r.procesado_at, r.created_at) ASC, r.created_at ASC, r.id ASC
  `, [dateStr]);

  const pasantiaRetiros = await query(`
    SELECT
      r.id,
      r.monto,
      r.monto_neto,
      COALESCE(r.procesado_at, r.created_at) AS fecha_operacion,
      u.nombre_usuario,
      u.telefono,
      n.nombre AS nivel_nombre,
      n.codigo AS nivel_codigo
    FROM retiros r
    LEFT JOIN usuarios u ON u.id = r.usuario_id
    LEFT JOIN niveles n ON n.id = u.nivel_id
    WHERE r.fecha_dia = ?
      AND r.estado = 'Aceptado'
      AND COALESCE(LOWER(n.codigo), '') IN ('internar', 'pasantia')
    ORDER BY COALESCE(r.procesado_at, r.created_at) ASC, r.created_at ASC, r.id ASC
  `, [dateStr]);

  const sumField = (items, field) => items.reduce((total, item) => total + Number(item?.[field] || 0), 0);

  return {
    fecha: dateStr,
    recargas,
    vipRetiros,
    pasantiaRetiros,
    totals: {
      recargasCantidad: recargas.length,
      recargasMonto: sumField(recargas, 'monto'),
      vipRetirosCantidad: vipRetiros.length,
      vipRetirosMonto: sumField(vipRetiros, 'monto'),
      vipRetirosNeto: sumField(vipRetiros, 'monto_neto'),
      pasantiaRetirosCantidad: pasantiaRetiros.length,
      pasantiaRetirosMonto: sumField(pasantiaRetiros, 'monto'),
      pasantiaRetirosNeto: sumField(pasantiaRetiros, 'monto_neto')
    }
  };
}

async function sendChunkedTelegramSection(bot, chatId, title, lines, emptyMessage) {
  if (!lines.length) {
    await bot.sendMessage(chatId, `${title}\n<i>${emptyMessage}</i>`, { parse_mode: 'HTML' });
    return;
  }

  let chunk = `${title}\n`;
  let continuation = false;

  for (const line of lines) {
    const candidate = `${chunk}${line}\n`;
    if (candidate.length > 3800) {
      await bot.sendMessage(chatId, chunk.trimEnd(), { parse_mode: 'HTML' });
      chunk = `${title}${continuation ? ' (continuación)' : ''}\n${line}\n`;
      continuation = true;
      continue;
    }
    chunk = candidate;
  }

  if (chunk.trim()) {
    await bot.sendMessage(chatId, chunk.trimEnd(), { parse_mode: 'HTML' });
  }
}

async function sendDailyOperationsReport(bot, chatId) {
  try {
    const report = await getDailyOperationsReportData();
    const totals = report.totals;

    const summaryMessage =
      `📘 <b>INFORME DIARIO OPERATIVO</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>Fecha:</b> ${report.fecha}\n` +
      `🕙 <b>Hora de corte:</b> 22:00 (Bolivia)\n\n` +
      `💳 <b>Recargas realizadas:</b> ${totals.recargasCantidad}\n` +
      `💰 <b>Total recargas:</b> ${totals.recargasMonto.toFixed(2)} Bs\n\n` +
      `👑 <b>Retiros VIP realizados:</b> ${totals.vipRetirosCantidad}\n` +
      `💰 <b>Total VIP solicitado:</b> ${totals.vipRetirosMonto.toFixed(2)} Bs\n` +
      `✅ <b>Total VIP neto:</b> ${totals.vipRetirosNeto.toFixed(2)} Bs\n\n` +
      `🎓 <b>Retiros pasantía realizados:</b> ${totals.pasantiaRetirosCantidad}\n` +
      `💰 <b>Total pasantía solicitado:</b> ${totals.pasantiaRetirosMonto.toFixed(2)} Bs\n` +
      `✅ <b>Total pasantía neto:</b> ${totals.pasantiaRetirosNeto.toFixed(2)} Bs`;

    await bot.sendMessage(chatId, summaryMessage, { parse_mode: 'HTML' });

    const recargaLines = report.recargas.map((item, index) =>
      `${index + 1}. <b>${escapeHtml(item.nombre_usuario || 'Sin nombre')}</b> | <code>${escapeHtml(item.telefono || 'Sin teléfono')}</code> | ${escapeHtml(item.nivel_nombre || 'Sin nivel')} | <b>${Number(item.monto || 0).toFixed(2)} Bs</b> | ${escapeHtml(formatBoliviaDateTime(item.fecha_operacion))}`
    );

    const vipRetiroLines = report.vipRetiros.map((item, index) =>
      `${index + 1}. <b>${escapeHtml(item.nombre_usuario || 'Sin nombre')}</b> | <code>${escapeHtml(item.telefono || 'Sin teléfono')}</code> | ${escapeHtml(item.nivel_nombre || 'VIP')} | Sol: <b>${Number(item.monto || 0).toFixed(2)} Bs</b> | Neto: <b>${Number(item.monto_neto || 0).toFixed(2)} Bs</b> | ${escapeHtml(formatBoliviaDateTime(item.fecha_operacion))}`
    );

    const pasantiaRetiroLines = report.pasantiaRetiros.map((item, index) =>
      `${index + 1}. <b>${escapeHtml(item.nombre_usuario || 'Sin nombre')}</b> | <code>${escapeHtml(item.telefono || 'Sin teléfono')}</code> | ${escapeHtml(item.nivel_nombre || 'Pasantía')} | Sol: <b>${Number(item.monto || 0).toFixed(2)} Bs</b> | Neto: <b>${Number(item.monto_neto || 0).toFixed(2)} Bs</b> | ${escapeHtml(formatBoliviaDateTime(item.fecha_operacion))}`
    );

    await sendChunkedTelegramSection(
      bot,
      chatId,
      '💳 <b>DETALLE DE RECARGAS ACEPTADAS</b>',
      recargaLines,
      'No se registraron recargas aceptadas en el corte de hoy.'
    );

    await sendChunkedTelegramSection(
      bot,
      chatId,
      '👑 <b>DETALLE DE RETIROS VIP ACEPTADOS</b>',
      vipRetiroLines,
      'No se registraron retiros VIP aceptados en el corte de hoy.'
    );

    await sendChunkedTelegramSection(
      bot,
      chatId,
      '🎓 <b>DETALLE DE RETIROS PASANTÍA ACEPTADOS</b>',
      pasantiaRetiroLines,
      'No se registraron retiros de pasantía aceptados en el corte de hoy.'
    );
  } catch (err) {
    logger.error(`[TELEGRAM-DAILY-OPERATIONS] Error: ${err.message}`);
  }
}

export async function setupTelegramLogic() {
  const bot = await setupAdminBot();
  const botRet = await setupRetirosBot();
  
  if (!bot) return;

  logger.info('[TELEGRAM] Cargando Lógica de Eventos Resiliente v10.0.0...');

  const registerBotListeners = (botInstance, botName) => {
    if (!botInstance) return;

    botInstance.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const fromId = msg.from?.id;
      const fromUsername = msg.from?.username;
      const chatType = msg.chat.type;
      const text = msg.text || '';
      const hasPhoto = !!msg.photo;

      logger.info(`[TELEGRAM][${botName}] Mensaje recibido - Chat: ${chatId} (${chatType}), From: ${fromId} (@${fromUsername}), HasPhoto: ${hasPhoto}, Text: "${text}"`);
    });

    botInstance.on('callback_query', async (callbackQuery) => {
      const { data, message, from, id: callbackId } = callbackQuery;
      if (!data || !from) return;

      logger.info(`[TELEGRAM][${botName}] Callback recibido: data=${data}, fromId=${from.id}, username=${from.username}`);

      const targetSecretariaId = process.env.TELEGRAM_CHAT_SECRETARIA || '-1003900884989';
      if (String(message.chat.id) === targetSecretariaId) {
        return safeTelegramCall(() => botInstance.answerCallbackQuery(callbackId, { 
          text: '⚠️ Acciones deshabilitadas en este grupo. Use los grupos operativos.', 
          show_alert: true 
        }), 'answerCallbackQuery-secretariaBlock');
      }

      if (data.startsWith('menu:')) {
        await handleMenuCallback(callbackQuery, botInstance, botName);
        return;
      }

      let action, type, refId;
      if (data.includes(':')) {
        [action, type, refId] = data.split(':');
      } else if (data.includes('_')) {
        const parts = data.split('_');
        if (parts[0] === 'retiro' || parts[0] === 'recarga') {
          type = parts[0];
          action = parts[1] === 'pagar' || parts[1] === 'aprobar' ? 'aceptar' : parts[1];
          refId = parts.slice(2).join('_');
        } else {
          [action, type, refId] = parts;
        }
      }

      if (!action || !refId) {
        logger.warn(`[TELEGRAM][${botName}] Callback data malformado: ${data}`);
        return safeTelegramCall(() => botInstance.answerCallbackQuery(callbackId, { 
          text: '⚠️ Este botón pertenece a una versión antigua y ya no es válido.', 
          show_alert: true 
        }), 'answerCallbackQuery-malformed');
      }

      const telegramUserId = String(from.id);
      const telegramUsername = from.username || 'User_' + telegramUserId.substring(0, 5);

      const isProcessed = await checkIdempotencyRedis(callbackId);
      if (isProcessed) {
        return safeTelegramCall(() => botInstance.answerCallbackQuery(callbackId, { text: '⚠️ Acción ya procesada.' }), 'answerCallback-Idempotency');
      }

      try {
        logger.info(`[TELEGRAM][${botName}] Identificando admin: telegramUserId=${telegramUserId}, username=${from.username}`);
        let webAdmin = await queryOne(`
          SELECT id, nombre_usuario as nombre 
          FROM usuarios 
          WHERE (telegram_user_id = ? OR telegram_user_id = ? OR telegram_username = ?) AND rol = 'admin'
        `, [telegramUserId, from.id, from.username]);

        if (!webAdmin) {
          logger.info(`[TELEGRAM][${botName}] Admin no vinculado, buscando admin fallback...`);
          webAdmin = await queryOne('SELECT id, nombre_usuario as nombre FROM usuarios WHERE rol = "admin" LIMIT 1');
          
          if (!webAdmin) {
            logger.error(`[TELEGRAM][${botName}] No se encontró ningún administrador en la tabla usuarios.`);
            return safeTelegramCall(() => botInstance.answerCallbackQuery(callbackId, { 
              text: '❌ Error crítico: No hay administradores configurados en el sistema.', 
              show_alert: true 
            }), 'answerCallbackQuery-NoAdmins');
          }

          webAdmin.nombre = telegramUsername;
          logger.info(`[TELEGRAM][${botName}] Operador externo detectado: ${telegramUsername} (${telegramUserId}). Usando Admin ID: ${webAdmin.id} para auditoría.`);
        }

        const adminId = webAdmin.id;
        const adminName = webAdmin.nombre;
        logger.info(`[TELEGRAM][${botName}] Admin identificado: id=${adminId}, nombre=${adminName}`);

        const lock = await acquireLock(`telegram:${refId}`, 15000);
        if (!lock) {
          return safeTelegramCall(() => botInstance.answerCallbackQuery(callbackId, { text: '⏳ Procesando en otra instancia, espera...' }), 'answerCallbackQuery-Lock');
        }

        try {
          logger.info(`[TELEGRAM][${botName}] Iniciando transacción para refId: ${refId}, acción: ${action}`);
          await transaction(async (conn) => {
            const [casoRows] = await conn.query(
              `SELECT * FROM telegram_casos_bloqueo WHERE referencia_id = ? FOR UPDATE`,
              [refId]
            );
            let caso = casoRows[0];

            if (!caso) {
              let opType = type;
              if (!opType) {
                if (data.includes('retiro')) {
                  opType = 'retiro';
                } else if (data.includes('recarga')) {
                  opType = 'recarga';
                } else {
                  const [isRetiro] = await conn.query('SELECT id FROM retiros WHERE id = ?', [refId]);
                  opType = isRetiro.length > 0 ? 'retiro' : 'recarga';
                }
              }

              logger.info(`[TELEGRAM][${botName}] Creando registro de bloqueo para refId: ${refId}, tipo: ${opType}`);
              try {
                await conn.query(
                  'INSERT INTO telegram_casos_bloqueo (referencia_id, tipo_operacion, estado_operativo) VALUES (?, ?, "Verificando")',
                  [refId, opType]
                );
              } catch (insErr) {
                if (insErr.code !== 'ER_DUP_ENTRY') throw insErr;
                logger.info(`[TELEGRAM][${botName}] Registro de bloqueo ya existía (carrera), continuando...`);
              }
              const [retryRows] = await conn.query('SELECT * FROM telegram_casos_bloqueo WHERE referencia_id = ? FOR UPDATE', [refId]);
              caso = retryRows[0];
            }

            const opType = caso.tipo_operacion;

            if (action === 'tomar') {
              if (caso.estado_operativo === 'tomado' || caso.estado_operativo === 'resuelto') {
                const tomadoPor = caso.tomado_por_username ? `@${caso.tomado_por_username}` : (caso.tomado_por_nombre || 'otro operador');
                return safeTelegramCall(() => botInstance.answerCallbackQuery(callbackId, { 
                  text: `❌ Este caso ya fue tomado por ${tomadoPor}.`,
                  show_alert: true 
                }), 'answerCallbackQuery-alreadyTaken');
              }

              logger.info(`[TELEGRAM][${botName}] Actualizando bloqueo a 'tomado' para ${refId}`);
              await conn.query(`
                UPDATE telegram_casos_bloqueo 
                SET estado_operativo = 'tomado', 
                    tomado_por = ?, 
                    tomado_por_nombre = ?,
                    tomado_por_username = ?,
                    tomado_at = ?, 
                    telegram_message_id = ?,
                    chat_id = ?,
                    operador_telegram_id = ?,
                    operador_nombre = ?,
                    operador_username = ?
                WHERE referencia_id = ?
              `, [
                telegramUserId, 
                adminName,
                from.username || null,
                peruTime.now(), 
                String(message.message_id), 
                String(message.chat.id),
                telegramUserId,
                adminName,
                from.username || null,
                refId
              ]);

              const realOpType = caso.tipo_operacion;
              logger.info(`[TELEGRAM][${botName}] Actualizando tabla real: ${realOpType} para refId: ${refId}`);
              
              if (realOpType === 'retiro') {
                const [res] = await conn.query(`
                  UPDATE retiros 
                  SET estado_operativo = 'tomado', 
                      operador_telegram_id = ?, 
                      operador_nombre = ?, 
                      operador_username = ?, 
                      tomado_en = ? 
                  WHERE id = ?
                    AND (
                      estado_operativo IS NULL
                      OR estado_operativo IN ('Verificando', 'pendiente', 'Pendiente')
                    )
                `, [telegramUserId, adminName, from.username || null, peruTime.now(), refId]);
                logger.info(`[TELEGRAM][${botName}] Resultado update retiros: ${res.affectedRows} filas.`);
                if (res.affectedRows === 0) {
                  throw new Error(`Este caso ya fue tomado por otro operador o no está en Verificando.`);
                }
              } else {
                const [res] = await conn.query(`
                  UPDATE compras_nivel 
                  SET estado_operativo = 'tomado',
                      operador_telegram_id = ?,
                      operador_nombre = ?,
                      operador_username = ?,
                      tomado_en = ?
                  WHERE id = ?
                    AND (
                      estado_operativo IS NULL
                      OR estado_operativo IN ('Verificando', 'pendiente', 'Pendiente')
                    )
                `, [telegramUserId, adminName, from.username || null, peruTime.now(), refId]);
                logger.info(`[TELEGRAM][${botName}] Resultado update compras_nivel: ${res.affectedRows} filas.`);
                if (res.affectedRows === 0) {
                  throw new Error(`Este caso ya fue tomado por otro operador o no está en Verificando.`);
                }
              }

              const displayerName = from.username ? `@${from.username}` : (from.first_name || 'Operador');
              logger.info(`[TELEGRAM][${botName}] Caso tomado exitosamente por ${displayerName}`);
              await safeTelegramCall(() => botInstance.answerCallbackQuery(callbackId, { text: `✅ Caso tomado correctamente.` }), 'answerCallbackQuery-tomar-success');
              await updateTelegramMessage(botInstance, message, 'tomado', displayerName, refId, realOpType, telegramUserId);

              if (realOpType === 'retiro') {
                const botAdmin = await setupAdminBot();
                const botRetiros = await setupRetirosBot();
                const retirosChatId = process.env.TELEGRAM_CHAT_RETIROS;
                const adminChatId = process.env.TELEGRAM_CHAT_ADMIN;
                
                logger.info(`[TELEGRAM][${botName}] Notificación cruzada: msgChat=${message.chat.id}, adminChat=${adminChatId}, retirosChat=${retirosChatId}`);

                if (String(message.chat.id) === adminChatId && botRetiros && retirosChatId) {
                  await botRetiros.sendMessage(retirosChatId, `✍️ <b>Caso Tomado</b>\nEl retiro <code>${refId.substring(0,8)}</code> ha sido tomado por el administrador <b>${displayerName}</b> en el panel central.`, { parse_mode: 'HTML' });
                } else if (String(message.chat.id) === retirosChatId && botAdmin && adminChatId) {
                  await botAdmin.sendMessage(adminChatId, `✍️ <b>Caso Tomado</b>\nEl retiro <code>${refId.substring(0,8)}</code> ha sido tomado directamente en el grupo de retiros por <b>${displayerName}</b>.`, { parse_mode: 'HTML' });
                }
              }
            } else if (action === 'aceptar' || action === 'rechazar') {
              if (caso.estado_operativo === 'resuelto') {
                throw new Error('Este caso ya ha sido resuelto.');
              }
              
              const isAceptar = action === 'aceptar';

              if (opType === 'retiro') {
                if (isAceptar) {
                  await approveRetiro(refId, adminId);
                } else {
                  await rejectRetiro(refId, adminId, 'Rechazado desde Telegram');
                }
              } else {
                if (isAceptar) {
                  const levels = await getLevels();
                  const compra = await getRecargaById(refId);
                  if (!compra) throw new Error('Orden de recarga no encontrada.');

                  const targetLevel = levels.find(l => l.id === compra.nivel_id);
                  const [userRows] = await conn.query('SELECT * FROM usuarios WHERE id = ?', [compra.usuario_id]);
                  const user = userRows[0];
                  const currentLevel = levels.find(l => l.id === user.nivel_id);

                  if (currentLevel && targetLevel && targetLevel.orden < currentLevel.orden) {
                    throw new Error(`No se puede bajar de nivel. El usuario ya es ${currentLevel.nombre}.`);
                  }

                  await approveLevelPurchase(refId, adminId);
                  if (compra) {
                    await distributeInvestmentCommissions(compra.usuario_id, compra.monto, refId);
                  }
                } else {
                  await conn.query(
                    `UPDATE compras_nivel SET estado = 'rechazada', procesado_por = ?, procesado_at = NOW() WHERE id = ?`,
                    [adminId, refId]
                  );
                }
              }

              await conn.query(
                `UPDATE telegram_casos_bloqueo SET estado_operativo = 'resuelto', resuelto_at = ? WHERE referencia_id = ?`,
                [peruTime.now(), refId]
              );

              const table = opType === 'retiro' ? 'retiros' : 'compras_nivel';
              await conn.query(
                `UPDATE ${table} SET estado_operativo = ? WHERE id = ?`,
                [isAceptar ? 'aceptado' : 'rechazado', refId]
              );

              await safeTelegramCall(() => botInstance.answerCallbackQuery(callbackId, { text: `✅ Caso ${action}do correctamente.` }), 'answerCallbackQuery-resolver');
              await updateTelegramMessage(botInstance, message, 'resuelto', adminName, refId, opType, telegramUserId, action);

              if (isAceptar) {
                const resText = opType === 'retiro' ? 'RETIRO PAGADO' : 'RECARGA COMPLETADA';
                let userInfo = '';
                
                if (opType === 'recarga' || opType === 'retiro') {
                  const table = opType === 'retiro' ? 'retiros' : 'compras_nivel';
                  const [dataRows] = await conn.query(`
                    SELECT u.telefono, u.nombre_real, r.monto
                    FROM ${table} r
                    LEFT JOIN usuarios u ON u.id = r.usuario_id
                    WHERE r.id = ?
                  `, [refId]);
                  const data = dataRows[0];

                  if (data) {
                    const masked = maskPhone(data.telefono);
                    userInfo = `📱 <b>Usuario:</b> <code>${masked}</code>\n` +
                               `👤 <b>Nombre:</b> ${data.nombre_real || 'No especificado'}\n` +
                               `💵 <b>Monto:</b> ${data.monto} Bs\n`;
                  }
                }

                const secMsg = `<b>✅ ${resText}</b>\n` +
                              `━━━━━━━━━━━━━━━━━━\n` +
                              `👤 <b>Operador:</b> ${adminName}\n` +
                              userInfo +
                              `🆔 <b>Ref:</b> <code>${refId.substring(0, 8)}</code>\n` +
                              `🕒 <b>Finalizado:</b> ${peruTime.getTimeString()}\n` +
                              `━━━━━━━━━━━━━━━━━━\n` +
                              `<i>El caso ha sido procesado exitosamente.</i>`;
                
                sendToSecretaria(secMsg);
              }
            }
          });
        } finally {
          await releaseLock(lock);
        }
      } catch (err) {
        logger.error(`[TELEGRAM][${botName}] Callback Error: ${err.message}`, { 
          stack: err.stack,
          data,
          fromId: from.id,
          username: from.username
        });
        safeTelegramCall(() => botInstance.answerCallbackQuery(callbackId, { 
          text: `❌ ERROR: ${err.message}`, 
          show_alert: true 
        }), 'answerCallbackQuery-error');
      }
    });

    botInstance.on('photo', async (msg) => {
      const chatId = msg.chat.id;
      const fromId = msg.from?.id;

      logger.info(`[TELEGRAM][${botName}] Imagen recibida en chat ${chatId} de ${fromId}`);

      const adminChatId = process.env.TELEGRAM_CHAT_ADMIN;
      const retirosChatId = process.env.TELEGRAM_CHAT_RETIROS;
      const secretariaChatId = process.env.TELEGRAM_CHAT_SECRETARIA || '-1003900884989';

      const isAuthorizedChat = 
        String(chatId) === String(adminChatId) || 
        String(chatId) === String(retirosChatId) || 
        String(chatId) === String(secretariaChatId) || 
        msg.chat.type === 'private';

      if (!isAuthorizedChat) {
        logger.info(`[TELEGRAM][${botName}] Imagen ignorada: chat no autorizado ${chatId}`);
        return;
      }

      const photo = msg.photo[msg.photo.length - 1];
      const fileId = photo.file_id;

      try {
        const file = await botInstance.getFile(fileId);
        const botToken = process.env[`TELEGRAM_BOT_TOKEN_${botName.toUpperCase()}`];
        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;

        logger.info(`[TELEGRAM][${botName}] File URL for QR: ${fileUrl}`);

        const qr = await qrService.registrarQR({
          imagen_url: fileUrl,
          telegram_chat_id: String(chatId),
          telegram_message_id: String(msg.message_id)
        });

        logger.info(`[TELEGRAM][${botName}] QR registrado con ID: ${qr.id}`);

        const replyMarkup = {
          inline_keyboard: [
            [
              { text: '✅ Marcar como Pagado', callback_data: `menu:pagado:${qr.id}` }
            ],
            [
              { text: '📋 Ver Menú', callback_data: 'menu:main' }
            ]
          ]
        };

        const qrMessage = `
📱 <b>NUEVO QR RECIBIDO</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ID:</b> <code>${qr.id.substring(0, 8)}</code>
🕐 <b>Fecha:</b> ${peruTime.getTimeString()}
📄 <b>Estado:</b> NO PAGADO
        `;

        await botInstance.sendPhoto(chatId, fileUrl, {
          caption: qrMessage,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        });

        logger.info(`[TELEGRAM][${botName}] Confirmación de QR enviada`);

      } catch (error) {
        logger.error(`[TELEGRAM][${botName}] Error al procesar imagen: ${error.message}`, error.stack);
        await safeTelegramCall(() => 
          botInstance.sendMessage(chatId, '❌ Error al procesar la imagen. Por favor, intenta de nuevo.'), 
          'send-error-message'
        );
      }
    });

    botInstance.on('text', async (msg) => {
      const chatId = msg.chat.id;
      const fromId = msg.from?.id;
      const fromUsername = msg.from?.username;
      const rawText = msg.text || '';
      const text = rawText.toLowerCase().trim();

      logger.info(`[TELEGRAM][${botName}] Texto recibido en chat ${chatId}: "${rawText}" (normalizado: "${text}")`);

      // Comando especial para aprobar QR (formato: 12345 ap / 12345_ap / 12345ap)
      const qrPattern = /^(\d+)\s*_?\s*ap$/i;
      const qrMatch = text.match(qrPattern);
      if (qrMatch) {
        const qrId = qrMatch[1];
        logger.info(`[TELEGRAM][${botName}] Detectado comando para aprobar QR ID: ${qrId}`);

        try {
          let webAdmin = await queryOne(`
            SELECT id, nombre_usuario as nombre 
            FROM usuarios 
            WHERE (telegram_user_id = ? OR telegram_user_id = ? OR telegram_username = ?) AND rol = 'admin'
          `, [fromId, fromId, fromUsername]);

          if (!webAdmin) {
            webAdmin = await queryOne('SELECT id, nombre_usuario as nombre FROM usuarios WHERE rol = "admin" LIMIT 1');
          }

          if (webAdmin) {
            await qrService.marcarQRComoPagado(qrId, webAdmin.id);
            const qr = await qrService.obtenerQRPorId(qrId);

            const successMessage = `
✅ <b>QR APROBADO EXITOSAMENTE!</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ID:</b> <code>${qr.id.substring(0, 8)}</code>
👤 <b>Usuario:</b> ${qr.usuario_nombre || 'N/A'}
💰 <b>Monto:</b> ${qr.monto ? `${qr.monto} Bs` : 'N/A'}
🕐 <b>Fecha:</b> ${peruTime.getTimeString()}
👤 <b>Procesado por:</b> ${webAdmin.nombre}
━━━━━━━━━━━━━━━━━━
            `;

            await safeTelegramCall(() => 
              botInstance.sendMessage(chatId, successMessage, { parse_mode: 'HTML' }), 
              'send-qr-approved-message'
            );
            logger.info(`[TELEGRAM][${botName}] QR ${qrId} aprobado exitosamente por ${webAdmin.nombre}`);
          }
        } catch (error) {
          logger.error(`[TELEGRAM][${botName}] Error al aprobar QR ${qrId}: ${error.message}`, error.stack);
          await safeTelegramCall(() => 
            botInstance.sendMessage(chatId, `❌ Error al aprobar QR: ${error.message}`), 
            'send-qr-error-message'
          );
        }
        return;
      }

      // Comando especial para aprobar retiro (formato: 12345 apr / 12345_apr / 12345apr)
      const retiroAprPattern = /^(\d+)\s*_?\s*apr$/i;
      const retiroAprMatch = text.match(retiroAprPattern);
      if (retiroAprMatch) {
        const retiroId = retiroAprMatch[1];
        logger.info(`[TELEGRAM][${botName}] Detectado comando para aprobar retiro ID: ${retiroId}`);

        try {
          let webAdmin = await queryOne(`
            SELECT id, nombre_usuario as nombre 
            FROM usuarios 
            WHERE (telegram_user_id = ? OR telegram_user_id = ? OR telegram_username = ?) AND rol = 'admin'
          `, [fromId, fromId, fromUsername]);

          if (!webAdmin) {
            webAdmin = await queryOne('SELECT id, nombre_usuario as nombre FROM usuarios WHERE rol = "admin" LIMIT 1');
          }

          if (webAdmin) {
            // Función para aprobar retiro
            await transaction(async (conn) => {
              const [retiroRows] = await conn.query('SELECT * FROM retiros WHERE id = ? OR SUBSTRING(id, 1, 8) = ?', [retiroId, retiroId]);
              if (!retiroRows || retiroRows.length === 0) {
                throw new Error('Retiro no encontrado');
              }
              const retiro = retiroRows[0];
              
              await conn.query(`
                UPDATE retiros 
                SET estado = 'aprobado', procesado_por = ?, procesado_at = ?, admin_notas = 'Aprobado via comando rápido'
                WHERE id = ?
              `, [webAdmin.id, peruTime.now(), retiro.id]);
            });

            const successMessage = `
✅ <b>RETIRO APROBADO EXITOSAMENTE!</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ID:</b> <code>${retiroId}</code>
🕐 <b>Fecha:</b> ${peruTime.getTimeString()}
👤 <b>Procesado por:</b> ${webAdmin.nombre}
━━━━━━━━━━━━━━━━━━
            `;

            await safeTelegramCall(() => 
              botInstance.sendMessage(chatId, successMessage, { parse_mode: 'HTML' }), 
              'send-retiro-aprobado-message'
            );
            logger.info(`[TELEGRAM][${botName}] Retiro ${retiroId} aprobado exitosamente por ${webAdmin.nombre}`);
          }
        } catch (error) {
          logger.error(`[TELEGRAM][${botName}] Error al aprobar retiro ${retiroId}: ${error.message}`, error.stack);
          await safeTelegramCall(() => 
            botInstance.sendMessage(chatId, `❌ Error al aprobar retiro: ${error.message}`), 
            'send-retiro-aprobado-error-message'
          );
        }
        return;
      }

      // Comando especial para rechazar retiro (formato: 12345 re / 12345_re / 12345re)
      const retiroPattern = /^(\d+)\s*_?\s*re$/i;
      const retiroMatch = text.match(retiroPattern);
      if (retiroMatch) {
        const retiroId = retiroMatch[1];
        logger.info(`[TELEGRAM][${botName}] Detectado comando para rechazar retiro ID: ${retiroId}`);

        try {
          let webAdmin = await queryOne(`
            SELECT id, nombre_usuario as nombre 
            FROM usuarios 
            WHERE (telegram_user_id = ? OR telegram_user_id = ? OR telegram_username = ?) AND rol = 'admin'
          `, [fromId, fromId, fromUsername]);

          if (!webAdmin) {
            webAdmin = await queryOne('SELECT id, nombre_usuario as nombre FROM usuarios WHERE rol = "admin" LIMIT 1');
          }

          if (webAdmin) {
            // Función para rechazar retiro
            await transaction(async (conn) => {
              const [retiroRows] = await conn.query('SELECT * FROM retiros WHERE id = ? OR SUBSTRING(id, 1, 8) = ?', [retiroId, retiroId]);
              if (!retiroRows || retiroRows.length === 0) {
                throw new Error('Retiro no encontrado');
              }
              const retiro = retiroRows[0];
              
              await conn.query(`
                UPDATE retiros 
                SET estado = 'rechazado', procesado_por = ?, procesado_at = ?, admin_notas = 'Rechazado via comando rápido'
                WHERE id = ?
              `, [webAdmin.id, peruTime.now(), retiro.id]);
            });

            const successMessage = `
❌ <b>RETIRO RECHAZADO EXITOSAMENTE!</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ID:</b> <code>${retiroId}</code>
🕐 <b>Fecha:</b> ${peruTime.getTimeString()}
👤 <b>Procesado por:</b> ${webAdmin.nombre}
━━━━━━━━━━━━━━━━━━
            `;

            await safeTelegramCall(() => 
              botInstance.sendMessage(chatId, successMessage, { parse_mode: 'HTML' }), 
              'send-retiro-rechazado-message'
            );
            logger.info(`[TELEGRAM][${botName}] Retiro ${retiroId} rechazado exitosamente por ${webAdmin.nombre}`);
          }
        } catch (error) {
          logger.error(`[TELEGRAM][${botName}] Error al rechazar retiro ${retiroId}: ${error.message}`, error.stack);
          await safeTelegramCall(() => 
            botInstance.sendMessage(chatId, `❌ Error al rechazar retiro: ${error.message}`), 
            'send-retiro-error-message'
          );
        }
        return;
      }

      if (text === 'menu' || text === 'menú' || text === '/menu' || text.includes('menu') || text.includes('menú')) {
        logger.info(`[TELEGRAM][${botName}] Enviando menú principal a chat ${chatId}`);
        await sendMainMenu(botInstance, chatId);
      }
    });
  };

  async function sendMainMenu(botInstance, chatId) {
    const menuMessage = `
📌 <b>MENÚ PRINCIPAL - GESTIÓN DE RETIROS</b>
━━━━━━━━━━━━━━━━━━━━━━━━
Selecciona una opción:
    `;

    const replyMarkup = {
      inline_keyboard: [
        [{ text: '✅ Ver Retiros Aprobados', callback_data: 'menu:ver_pagados' }],
        [{ text: '🔴 Ver Retiros Pendientes', callback_data: 'menu:ver_no_pagados' }],
        [{ text: '📥 Exportar Retiros Aprobados', callback_data: 'menu:export_pagados' }],
        [{ text: '📤 Exportar Retiros Pendientes', callback_data: 'menu:export_no_pagados' }]
      ]
    };

    await safeTelegramCall(() => 
      botInstance.sendMessage(chatId, menuMessage, { parse_mode: 'HTML', reply_markup: replyMarkup }), 
      'send-main-menu'
    );
  }

  async function handleMenuCallback(callbackQuery, botInstance, botName) {
    const { data, message, from, id: callbackId } = callbackQuery;
    const chatId = message?.chat.id;

    if (!chatId) {
      await botInstance.answerCallbackQuery(callbackId, { text: '⚠️ Error interno' });
      return;
    }

    const [action, subAction, qrId] = data.split(':');

    try {
      logger.info(`[TELEGRAM][${botName}] Menú callback: subAction=${subAction}, qrId=${qrId}`);

      let webAdmin = await queryOne(`
        SELECT id, nombre_usuario as nombre 
        FROM usuarios 
        WHERE (telegram_user_id = ? OR telegram_user_id = ? OR telegram_username = ?) AND rol = 'admin'
      `, [from.id, from.id, from.username]);

      if (!webAdmin) {
        webAdmin = await queryOne('SELECT id, nombre_usuario as nombre FROM usuarios WHERE rol = "admin" LIMIT 1');
      }

      switch (subAction) {
        case 'main':
          const menuMessage = `
📌 <b>MENÚ PRINCIPAL - GESTIÓN DE RETIROS</b>
━━━━━━━━━━━━━━━━━━━━━━━━
Selecciona una opción:
          `;
          const replyMarkup = {
            inline_keyboard: [
              [{ text: '✅ Ver Retiros Aprobados', callback_data: 'menu:ver_pagados' }],
              [{ text: '🔴 Ver Retiros Pendientes', callback_data: 'menu:ver_no_pagados' }],
              [{ text: '📥 Exportar Retiros Aprobados', callback_data: 'menu:export_pagados' }],
              [{ text: '📤 Exportar Retiros Pendientes', callback_data: 'menu:export_no_pagados' }]
            ]
          };
          try {
            await botInstance.editMessageText(menuMessage, {
              chat_id: chatId,
              message_id: message.message_id,
              parse_mode: 'HTML',
              reply_markup: replyMarkup
            });
          } catch (editErr) {
            logger.warn(`[TELEGRAM][${botName}] No se pudo editar el mensaje, enviando nuevo: ${editErr.message}`);
            await botInstance.sendMessage(chatId, menuMessage, { parse_mode: 'HTML', reply_markup: replyMarkup });
          }
          await botInstance.answerCallbackQuery(callbackId);
          break;

        case 'pagado':
          if (qrId && webAdmin) {
            // Marcamos el retiro como aprobado
            await approveRetiro(qrId, webAdmin.id);
            await botInstance.answerCallbackQuery(callbackId, { text: '✅ Retiro marcado como aprobado!' });
            
            const retiro = await getRetiroById(qrId);
            const user = await findUserById(retiro.usuario_id);
            
            const updatedMessage = `
🏧 <b>RETIRO PROCESADO</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ID:</b> <code>${retiro.id.substring(0, 8)}</code>
👤 <b>Usuario:</b> ${user?.nombre_usuario || 'N/A'}
💰 <b>Monto:</b> ${retiro.monto ? `${retiro.monto} Bs` : 'N/A'}
🕐 <b>Fecha:</b> ${peruTime.getTimeString()}
📄 <b>Estado:</b> ✅ APROBADO
👤 <b>Procesado por:</b> ${webAdmin.nombre}
            `;
            try {
              await botInstance.editMessageText(updatedMessage, {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'HTML'
              });
            } catch (editErr) {
              logger.warn(`[TELEGRAM][${botName}] No se pudo editar el mensaje, enviando nuevo: ${editErr.message}`);
              await botInstance.sendMessage(chatId, updatedMessage, { parse_mode: 'HTML' });
            }
          }
          break;

        case 'ver_pagados':
          const approvedRetiros = await query(`
            SELECT 
              r.*, 
              u.nombre_usuario as usuario_nombre, 
              u.telefono as usuario_telefono
            FROM retiros r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            WHERE r.estado IN ('aprobado', 'pagado')
            ORDER BY r.created_at DESC
          `);
          let approvedMessage = approvedRetiros.length > 0 
            ? `✅ <b>RETIROS APROBADOS</b> (${approvedRetiros.length})\n━━━━━━━━━━━━━━━━━━\n\n` 
            : `✅ <b>RETIROS APROBADOS</b>\n━━━━━━━━━━━━━━━━━━\nNo hay retiros aprobados todavía.\n`;

          if (approvedRetiros.length > 0) {
            approvedRetiros.slice(0, 10).forEach(retiro => {
              approvedMessage += `
🆔 <b>ID:</b> <code>${retiro.id.substring(0, 8)}</code>
👤 <b>Usuario:</b> ${retiro.usuario_nombre || 'N/A'}
📞 <b>Teléfono:</b> ${retiro.usuario_telefono || 'N/A'}
💰 <b>Monto:</b> ${retiro.monto ? `${retiro.monto} Bs` : 'N/A'}
🕐 <b>Fecha:</b> ${new Date(retiro.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}
━━━━━━━━━━━━━━━━━━
              `;
            });
            if (approvedRetiros.length > 10) {
              approvedMessage += `\n<i>... y ${approvedRetiros.length - 10} más</i>`;
            }
          }

          const backButton = {
            inline_keyboard: [[{ text: '🔙 Volver al Menú', callback_data: 'menu:main' }]]
          };

          try {
            await botInstance.editMessageText(approvedMessage, {
              chat_id: chatId,
              message_id: message.message_id,
              parse_mode: 'HTML',
              reply_markup: backButton
            });
          } catch (editErr) {
            logger.warn(`[TELEGRAM][${botName}] No se pudo editar el mensaje, enviando nuevo: ${editErr.message}`);
            await botInstance.sendMessage(chatId, approvedMessage, { parse_mode: 'HTML', reply_markup: backButton });
          }
          await botInstance.answerCallbackQuery(callbackId);
          break;

        case 'ver_no_pagados':
          const pendingRetiros = await query(`
            SELECT 
              r.*, 
              u.nombre_usuario as usuario_nombre, 
              u.telefono as usuario_telefono
            FROM retiros r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            WHERE r.estado = 'Verificando'
            ORDER BY r.created_at DESC
          `);
          let pendingMessage = pendingRetiros.length > 0 
            ? `🔴 <b>RETIROS PENDIENTES</b> (${pendingRetiros.length})\n━━━━━━━━━━━━━━━━━━\n\n` 
            : `🔴 <b>RETIROS EN VERIFICACIÓN</b>\n━━━━━━━━━━━━━━━━━━\nNo hay retiros en verificación.\n`;

          let buttons = [];
          if (pendingRetiros.length > 0) {
            pendingRetiros.slice(0, 10).forEach(retiro => {
              pendingMessage += `
🆔 <b>ID:</b> <code>${retiro.id.substring(0, 8)}</code>
👤 <b>Usuario:</b> ${retiro.usuario_nombre || 'N/A'}
📞 <b>Teléfono:</b> ${retiro.usuario_telefono || 'N/A'}
💰 <b>Monto:</b> ${retiro.monto ? `${retiro.monto} Bs` : 'N/A'}
🕐 <b>Fecha:</b> ${new Date(retiro.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}
━━━━━━━━━━━━━━━━━━
              `;
              buttons.push([{ text: `✅ Aprobar ${retiro.id.substring(0, 8)}`, callback_data: `menu:pagado:${retiro.id}` }]);
            });
          }
          buttons.push([{ text: '🔙 Volver al Menú', callback_data: 'menu:main' }]);

          if (pendingRetiros.length > 10) {
            pendingMessage += `\n<i>... y ${pendingRetiros.length - 10} más</i>`;
          }

          try {
            await botInstance.editMessageText(pendingMessage, {
              chat_id: chatId,
              message_id: message.message_id,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: buttons }
            });
          } catch (editErr) {
            logger.warn(`[TELEGRAM][${botName}] No se pudo editar el mensaje, enviando nuevo: ${editErr.message}`);
            await botInstance.sendMessage(chatId, pendingMessage, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
          }
          await botInstance.answerCallbackQuery(callbackId);
          break;

        case 'export_pagados':
        case 'export_no_pagados':
          const isApproved = subAction === 'export_pagados';
          const statusFilter = isApproved ? "estado IN ('Aceptado', 'pagado')" : "estado = 'Verificando'";
          
          const data = await query(`
            SELECT 
              r.*, 
              u.nombre_usuario as usuario_nombre, 
              u.telefono as usuario_telefono,
              JSON_EXTRACT(r.datos_bancarios, '$.nombre_banco') as banco,
              JSON_EXTRACT(r.datos_bancarios, '$.numero_cuenta') as cuenta
            FROM retiros r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            WHERE ${statusFilter}
            ORDER BY r.created_at DESC
          `);
          
          const dateStr = peruTime.todayStr().replace(/\//g, '-');
          const filename = isApproved 
            ? `retiros_aprobados_${dateStr}.csv` 
            : `retiros_Verificando_${dateStr}.csv`;
          
          const filePath = generateCSV(data, filename, 'retiros');
          
          await botInstance.answerCallbackQuery(callbackId, { text: '📦 Generando archivo...' });
          
          try {
            await botInstance.sendDocument(chatId, filePath, {
              caption: isApproved 
                ? `✅ <b>EXPORTACIÓN: RETIROS APROBADOS</b>\nTotal: ${data.length} registros` 
                : `🔴 <b>EXPORTACIÓN: RETIROS PENDIENTES</b>\nTotal: ${data.length} registros`,
              parse_mode: 'HTML'
            });
          } finally {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
          break;
      }
    } catch (error) {
      logger.error(`[TELEGRAM][${botName}] Error en callback del menú: ${error.message}`, error.stack);
      await botInstance.answerCallbackQuery(callbackId, { 
        text: `❌ Error: ${error.message}`, 
        show_alert: true 
      });
    }
  }

  const secretariaChatId = process.env.TELEGRAM_CHAT_SECRETARIA || '-1003900884989';
  const adminChatId = process.env.TELEGRAM_CHAT_ADMIN;
  
  // Reporte diario de operadores a las 22:00
  new CronJob('0 22 * * *', () => {
    logger.info('[CRON] Enviando reporte diario de operadores (22:00 Bolivia)...');
    sendDailyOperatorReport(bot, secretariaChatId);
  }, null, true, 'America/La_Paz');

  // Informe diario operativo detallado a las 22:00 para el grupo admin
  new CronJob('0 22 * * *', () => {
    logger.info('[CRON] Enviando informe diario operativo (22:00 Bolivia)...');
    if (adminChatId) {
      sendDailyOperationsReport(bot, adminChatId);
    } else {
      sendDailyOperationsReport(bot, secretariaChatId);
    }
  }, null, true, 'America/La_Paz');

  bot.onText(/\/resumen_operadores/, async (msg) => {
    const chatId = msg.chat.id;
    sendDailyOperatorReport(bot, chatId);
  });

  bot.onText(/\/resumen_retiros/, async (msg) => {
    const chatId = msg.chat.id;
    sendDailyOperatorReport(bot, chatId);
  });

  bot.onText(/\/retiros_Verificando/, async (msg) => {
    const chatId = msg.chat.id;
    sendDailyUnpaidQRReport(bot, chatId);
  });
  bot.onText(/\/qr_pendientes/, async (msg) => {
    const chatId = msg.chat.id;
    sendDailyUnpaidQRReport(bot, chatId);
  });

  bot.onText(/\/informe_diario/, async (msg) => {
    const chatId = msg.chat.id;
    sendDailyOperationsReport(bot, chatId);
  });

  registerBotListeners(bot, 'Admin');
  registerBotListeners(botRet, 'Retiros');
}

async function updateTelegramMessage(bot, message, estado, operador, refId, tipo, operadorId = '', resolucion = '') {
  const chatId = message.chat.id;
  const messageId = message.message_id;
  const oldText = message.caption || message.text || '';

  logger.info(`[TELEGRAM] Actualizando mensaje ${messageId} a estado ${estado}`);

  let baseText = oldText;
  if (baseText.includes('\n\n---')) {
    baseText = baseText.split('\n\n---')[0];
  }

  let newText = baseText;
  let buttons = [];

  if (estado === 'tomado') {
    const actionLabel = tipo === 'retiro' ? 'Aceptar/Pagar' : 'Aceptar/Activar';
    newText += `\n\n--- ⏳ EN PROCESO ---\n🤝 Operador: ${operador}\n🆔 Registro Telegram: ${operadorId}\n🕒 Tomado a las: ${peruTime.getTimeString()}`;
    buttons = [
      [
        { text: `✅ ${actionLabel}`, callback_data: `aceptar:${tipo}:${refId}` },
        { text: '❌ Rechazar', callback_data: `rechazar:${tipo}:${refId}` }
      ]
    ];
  } else if (estado === 'resuelto') {
    const emoji = resolucion === 'aceptar' ? '✅' : '❌';
    const actionLabel = resolucion === 'aceptar' ? (tipo === 'retiro' ? 'PAGADO' : 'APROBADO') : 'RECHAZADO';
    newText += `\n\n--- ${emoji} ${actionLabel} ---\n🤝 Por: ${operador}\n🕒 A las: ${peruTime.getTimeString()}`;
    buttons = [];
  }

  await safeTelegramCall(() => {
    if (message.caption) {
      return bot.editMessageCaption(newText, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      return bot.editMessageText(newText, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: buttons }
      });
    }
  }, 'editTelegramMessage');
}
