import { bot } from '../services/telegramBot.js';
import { query, queryOne, transaction } from '../config/db.js';
import { boliviaTime } from '../lib/queries.js';
import logger from '../lib/logger.js';
import { CronJob } from 'cron';

/**
 * Lógica Central de Telegram: UN CASO = UN RESPONSABLE. BLOQUEO TOTAL.
 */
if (bot) {
  // --- MIDDLEWARE DE VALIDACIÓN DE INTEGRANTE ---
  const validateMember = async (msg) => {
    const userId = String(msg.from.id);
    const member = await queryOne(`
      SELECT i.*, e.tipo as equipo_tipo, e.chat_id as equipo_chat_id 
      FROM telegram_integrantes i 
      JOIN telegram_equipos e ON i.equipo_id = e.id 
      WHERE i.telegram_user_id = ? AND i.activo = 1 AND e.activo = 1
    `, [userId]);
    return member;
  };

  // --- ESCUCHADOR DE CALLBACK QUERIES (Botones) ---
  bot.on('callback_query', async (callbackQuery) => {
    const { data, message, from } = callbackQuery;
    const [action, refId] = data.split(':');
    const telegramUserId = String(from.id);

    try {
      // 1. Validar que el usuario sea un integrante activo
      const member = await queryOne(`
        SELECT i.*, e.tipo as equipo_tipo 
        FROM telegram_integrantes i 
        JOIN telegram_equipos e ON i.equipo_id = e.id 
        WHERE i.telegram_user_id = ? AND i.activo = 1 AND e.activo = 1
      `, [telegramUserId]);

      if (!member) {
        return bot.answerCallbackQuery(callbackQuery.id, { 
          text: '❌ No tienes permisos o tu equipo está desactivado.', 
          show_alert: true 
        });
      }

      // 2. Ejecutar Acción con Bloqueo de Fila (SELECT FOR UPDATE)
      await transaction(async (conn) => {
        // Validar Horario Operativo para QR/Recargas
        const [configRows] = await conn.query('SELECT * FROM telegram_config_horarios WHERE id = 1');
        const config = configRows[0];

        // Bloqueo estricto del caso
        const [casoRows] = await conn.query(
          'SELECT * FROM telegram_casos_bloqueo WHERE referencia_id = ? FOR UPDATE', 
          [refId]
        );
        let caso = casoRows[0];

        // Si es Recarga, validar horario
        if (config && config.activo === 0 && caso?.tipo_operacion === 'recarga') {
           throw new Error('El sistema de recargas está desactivado temporalmente.');
        }

        if (config && caso?.tipo_operacion === 'recarga') {
          const now = boliviaTime.nowDate();
          const currentDay = now.getDay() === 0 ? 7 : now.getDay();
          const dias = JSON.parse(config.dias_operativos || '[1,2,3,4,5,6,7]');
          
          if (!dias.includes(currentDay)) {
            throw new Error('Hoy no es un día operativo para recargas.');
          }

          const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
          const [startH, startM, startS] = config.hora_inicio.split(':').map(Number);
          const [endH, endM, endS] = config.hora_fin.split(':').map(Number);
          const startTime = startH * 3600 + startM * 60 + startS;
          const endTime = endH * 3600 + endM * 60 + endS;

          if (currentTime < startTime || currentTime > endTime) {
            throw new Error(`Fuera de horario operativo (${config.hora_inicio} - ${config.hora_fin})`);
          }
        }

        // Si no existe, lo creamos como pendiente (debería existir al enviar el mensaje, pero por seguridad)
        if (!caso) {
          const type = data.includes('retiro') ? 'retiro' : 'recarga';
          await conn.query(
            'INSERT INTO telegram_casos_bloqueo (referencia_id, tipo_operacion, estado_operativo) VALUES (?, ?, "pendiente")',
            [refId, type]
          );
          [caso] = await conn.query('SELECT * FROM telegram_casos_bloqueo WHERE referencia_id = ? FOR UPDATE', [refId]);
        }

        // --- LÓGICA DE ACCIONES ---

        if (action === 'tomar') {
          if (caso.estado_operativo !== 'pendiente') {
            throw new Error(`Este caso ya fue ${caso.estado_operativo} por ${caso.tomado_por === telegramUserId ? 'ti' : 'otro operador'}.`);
          }

          await conn.query(`
            UPDATE telegram_casos_bloqueo 
            SET estado_operativo = 'tomado', tomado_por = ?, tomado_at = ?, telegram_message_id = ?
            WHERE referencia_id = ?
          `, [telegramUserId, boliviaTime.now(), String(message.message_id), refId]);

          // ACTUALIZAR TABLA OPERATIVA REAL
          const table = caso.tipo_operacion === 'retiro' ? 'retiros' : 'recargas';
          await conn.query(`
            UPDATE ${table} 
            SET estado_operativo = 'tomado', 
                tomado_por_telegram_user_id = ?, 
                tomado_por_nombre = ?, 
                tomado_en = ?
            WHERE id = ?
          `, [telegramUserId, member.nombre_visible, boliviaTime.now(), refId]);

          await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Caso tomado. Eres el único responsable.' });
          await updateTelegramMessage(bot, message, 'tomado', member.nombre_visible, refId);
        }

        else if (action === 'aceptar' || action === 'rechazar') {
          // VALIDACIÓN CRÍTICA: Solo el que tomó puede resolver
          if (caso.estado_operativo !== 'tomado') {
            throw new Error('Debes tomar el caso antes de resolverlo.');
          }
          if (caso.tomado_por !== telegramUserId) {
            throw new Error('Solo el operador que tomó el caso puede resolverlo. NO EXISTE OVERRIDE.');
          }

          const nuevoEstado = action === 'aceptar' ? 'aprobada' : 'rechazada'; // Mapeo a DB real
          const table = caso.tipo_operacion === 'retiro' ? 'retiros' : 'recargas';
          
          // Actualizar tabla real del sistema
          await conn.query(
            `UPDATE ${table} SET 
              estado = ?, 
              procesado_por_telegram = ?, 
              procesado_at = ?,
              estado_operativo = ?,
              resuelto_por_telegram_user_id = ?,
              resuelto_por_nombre = ?,
              resuelto_en = ?
             WHERE id = ?`,
            [
              action === 'aceptar' ? (table === 'retiros' ? 'pagado' : 'aprobada') : 'rechazada', 
              telegramUserId, 
              boliviaTime.now(),
              action === 'aceptar' ? 'aceptado' : 'rechazado',
              telegramUserId,
              member.nombre_visible,
              boliviaTime.now(),
              refId
            ]
          );

          // Marcar como resuelto en bloqueo
          await conn.query(
            `UPDATE telegram_casos_bloqueo SET estado_operativo = 'resuelto', resuelto_at = ? WHERE referencia_id = ?`,
            [boliviaTime.now(), refId]
          );

          // Log de operación
          await conn.query(
            `INSERT INTO telegram_operaciones_log (referencia_id, telegram_user_id, accion) VALUES (?, ?, ?)`,
            [refId, telegramUserId, action]
          );

          await bot.answerCallbackQuery(callbackQuery.id, { text: `✅ Caso ${action}do correctamente.` });
          await updateTelegramMessage(bot, message, 'resuelto', member.nombre_visible, refId, action);
        }
      });

    } catch (err) {
      logger.error(`[Telegram Callback Error]: ${err.message}`);
      bot.answerCallbackQuery(callbackQuery.id, { 
        text: `❌ ERROR: ${err.message}`, 
        show_alert: true 
      });
    }
  });
}

/**
 * Helper para editar mensajes en Telegram según el estado
 */
async function updateTelegramMessage(bot, message, estado, operador, refId, resolucion = '') {
  const chatId = message.chat.id;
  const messageId = message.message_id;
  let text = message.text || '';

  // Limpiar texto anterior de estado si existe
  text = text.split('\n\n---')[0];

  let newText = text;
  let buttons = [];

  if (estado === 'tomado') {
    newText += `\n\n--- ⏳ EN PROCESO ---\n👨‍💼 Operador: ${operador}\n🕒 Tomado a las: ${boliviaTime.getTimeString()}`;
    buttons = [
      [
        { text: '✅ ACEPTAR', callback_data: `aceptar:${refId}` },
        { text: '❌ RECHAZAR', callback_data: `rechazar:${refId}` }
      ]
    ];
  } else if (estado === 'resuelto') {
    const color = resolucion === 'aceptar' ? '✅' : '❌';
    newText += `\n\n--- ${color} RESUELTO ---\n👨‍💼 Operador: ${operador}\n📌 Resultado: ${resolucion.toUpperCase()}\n🕒 Hora: ${boliviaTime.getTimeString()}`;
    buttons = []; // Sin botones al finalizar
  }

  try {
    await bot.editMessageText(newText, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: buttons }
    });

    // Actualizar también en Secretaría si tenemos el ID del mensaje
    const caso = await queryOne('SELECT telegram_secretaria_message_id FROM telegram_casos_bloqueo WHERE referencia_id = ?', [refId]);
    if (caso && caso.telegram_secretaria_message_id) {
      const secGroup = await queryOne("SELECT chat_id FROM telegram_equipos WHERE tipo = 'secretaria' AND activo = 1");
      if (secGroup) {
        await bot.editMessageText(newText, {
          chat_id: secGroup.chat_id,
          message_id: caso.telegram_secretaria_message_id
        }).catch(() => {}); // Ignorar si falla secretaría
      }
    }
  } catch (e) {
    logger.error(`[Telegram Edit Error]: ${e.message}`);
  }
}

/**
 * Función principal para enviar alertas a los grupos
 */
export async function sendTelegramAlert(tipo, data) {
  if (!bot) return;

  try {
    const { refId, usuario, monto, nivel, extraInfo = '' } = data;
    const time = boliviaTime.getTimeString();
    
    // 1. Obtener Configuración de Visibilidad
    const config = await queryOne('SELECT visibilidad_numero FROM telegram_config_horarios WHERE id = 1');
    const visibilidad = config?.visibilidad_numero || 'parcial';

    // 2. Formatear Usuario según Configuración
    let usuarioDisplay = usuario;
    if (visibilidad === 'parcial' && usuario.includes(' ')) {
       // Si es nombre completo, no hacemos nada o truncamos. 
       // Si es número (ej: +59170001234), lo ocultamos
    } else if (visibilidad === 'parcial') {
       // Suponiendo que el usuario es un número de teléfono o ID
       if (usuario.length > 7) {
         usuarioDisplay = usuario.substring(0, usuario.length - 4) + '****';
       }
    }

    // 3. Construir Mensaje Base
    const message = `📌 NUEVA OPERACIÓN\n\n` +
                    `👤 Usuario: ${usuarioDisplay}\n` +
                    `🏅 VIP: ${nivel}\n` +
                    `💵 Monto: ${monto} BOB\n` +
                    `🧾 Tipo: ${tipo.toUpperCase()}\n` +
                    `📍 Estado: PENDIENTE\n` +
                    `🕒 Hora: ${time}\n` +
                    `${extraInfo}\n` +
                    `🆔 Ref: ${refId}`;

    // 4. Obtener Grupos
    const equipos = await query("SELECT * FROM telegram_equipos WHERE activo = 1");
    const secGroup = equipos.find(e => e.tipo === 'secretaria');
    const retGroup = equipos.find(e => e.tipo === 'retiros');
    const admGroup = equipos.find(e => e.tipo === 'administradores');

    // 3. Enviar a Secretaría (Lectura)
    let secMsgId = null;
    if (secGroup) {
      const sent = await bot.sendMessage(secGroup.chat_id, message);
      secMsgId = sent.message_id;
    }

    // 4. Enviar a Grupos Operativos (Con Botones)
    const buttons = [[{ text: '✋ TOMAR CASO', callback_data: `tomar:${refId}` }]];
    
    const targetGroups = [];
    if (tipo === 'retiro' && retGroup) targetGroups.push(retGroup.chat_id);
    if (admGroup) targetGroups.push(admGroup.chat_id);

    for (const chatId of targetGroups) {
      await bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    }

    // 5. Registrar en tabla de bloqueo
    await query(`
      INSERT INTO telegram_casos_bloqueo (referencia_id, tipo_operacion, telegram_secretaria_message_id)
      VALUES (?, ?, ?)
    `, [refId, tipo, String(secMsgId)]);

  } catch (err) {
    logger.error(`[Telegram Alert Error]: ${err.message}`);
  }
}

/**
 * Reporte Diario Automático (23:30)
 */
if (bot) {
  new CronJob('30 23 * * *', async () => {
    logger.info('[Telegram] Generando reporte diario...');
    try {
      const today = boliviaTime.todayStr();
      const stats = await query(`
        SELECT i.nombre_visible, 
               COUNT(CASE WHEN l.accion = 'tomar' THEN 1 END) as tomados,
               COUNT(CASE WHEN l.accion = 'aceptar' THEN 1 END) as aceptados,
               COUNT(CASE WHEN l.accion = 'rechazar' THEN 1 END) as rechazados
        FROM telegram_integrantes i
        LEFT JOIN telegram_operaciones_log l ON i.telegram_user_id = l.telegram_user_id
        WHERE DATE(l.fecha) = ?
        GROUP BY i.id
      `, [today]);

      let report = `📊 REPORTE DIARIO OPERATIVO (${today})\n\n`;
      if (stats.length === 0) {
        report += "Sin actividad registrada hoy.";
      } else {
        stats.forEach(s => {
          report += `👤 ${s.nombre_visible}:\n` +
                    `  📥 Tomados: ${s.tomados}\n` +
                    `  ✅ Aceptados: ${s.aceptados}\n` +
                    `  ❌ Rechazados: ${s.rechazados}\n\n`;
        });
      }

      const admGroup = await queryOne("SELECT chat_id FROM telegram_equipos WHERE tipo = 'administradores' AND activo = 1");
      if (admGroup) await bot.sendMessage(admGroup.chat_id, report);

    } catch (e) {
      logger.error(`[Telegram Report Error]: ${e.message}`);
    }
  }, null, true, 'America/La_Paz');
}

export default bot;
