import { Router } from 'express';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { 
  getGlobalContent, peruTime, findUserWithAuthSecrets,
  canWithdraw, requestWithdrawal, getLevels, createNotification
} from '../../services/dbService.mjs';
import { query, queryOne } from '../../config/db.mjs';
import { authenticate } from '../../utils/middleware/auth.mjs';
import { attachRequestUser } from '../../utils/middleware/requestContext.mjs';
import { dynamicControlMiddleware } from '../../utils/middleware/dynamicControl.mjs';
import { WITHDRAWAL_ALLOWED_AMOUNTS } from '../../utils/operationSchedules.mjs';
import { 
  sendToRetiros, 
  sendToTelegramUser,
  formatRetiroMessage 
} from '../../services/telegramBot.mjs';
import logger from '../../utils/logger.mjs';
import redis from '../../services/redisService.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';
import { uploadImageBuffer } from '../../utils/fileStorage.mjs';
import { validateRequiredWithdrawalQrImage } from '../../utils/withdrawalRules.mjs';

const router = Router();

const reportWithdrawalQrDebug = (hypothesisId, location, msg, data = {}) => {
  let debugServerUrl = 'http://127.0.0.1:7777/event';
  let sessionId = 'withdrawal-qr-telegram';
  try {
    const env = fs.readFileSync(`${process.cwd()}\\.dbg\\withdrawal-qr-telegram.env`, 'utf8');
    debugServerUrl = env.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || debugServerUrl;
    sessionId = env.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || sessionId;
  } catch {}
  fetch(debugServerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, runId: 'pre-fix', hypothesisId, location, msg, data, ts: Date.now() })
  }).catch(() => {});
};

// Rate Limit Config: 5 intentos de retiro por minuto
const WITHDRAW_RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 60;

function normalizePasantiaMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'direct_admin') return 'direct_admin';
  if (mode === 'blocked') return 'blocked';
  return 'sponsor_vip';
}

async function notifyWithdrawalAdmins(message, options, retiroId) {
  const results = await Promise.allSettled([
    sendToRetiros(message, options)
  ]);

  results.forEach((result) => {
    const target = 'retiros';
    if (result.status === 'rejected') {
      logger.error(`[WITHDRAW][TELEGRAM] Falló envío a ${target} para retiro ${retiroId}: ${result.reason?.message || result.reason}`);
    }
  });
}

const withdrawRateLimit = async (req, res, next) => {
  const userId = req.requestUser?.id;
  if (!userId) return next();
  const key = `ratelimit:withdraw:${userId}`;
  try {
    // Check current count without incrementing
    const current = await redis.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= WITHDRAW_RATE_LIMIT) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
    }
    
    // Store key on request for later increment on success
    req.withdrawalRateKey = key;
    next();
  } catch (err) { 
    // If Redis fails, just let the request proceed
    next(); 
  }
};

router.use(authenticate);
router.use(attachRequestUser);

router.get('/montos', (req, res) => {
  res.json(WITHDRAWAL_ALLOWED_AMOUNTS);
});

router.get('/', asyncHandler(async (req, res) => {
  const list = await query(`SELECT * FROM retiros WHERE usuario_id = ? ORDER BY created_at DESC`, [req.user.id]);
  res.json(list);
}));

router.post('/', withdrawRateLimit, dynamicControlMiddleware('withdrawal'), asyncHandler(async (req, res) => {
  const { monto, tipo_billetera, password_fondo, tarjeta_id, idempotency_key, comprobante_url } = req.body;
  const user = req.requestUser;
  // #region debug-point A:withdraw-request-input
  reportWithdrawalQrDebug('A', 'withdrawals.mjs:82', '[DEBUG] Withdrawal request received', {
    userId: user?.id || null,
    tarjetaId: tarjeta_id || null,
    tipoBilletera: tipo_billetera || null,
    hasComprobanteUrl: !!comprobante_url,
    comprobantePrefix: typeof comprobante_url === 'string' ? comprobante_url.slice(0, 32) : null,
    comprobanteLength: typeof comprobante_url === 'string' ? comprobante_url.length : 0
  });
  // #endregion

  const iKey = idempotency_key || req.headers['x-idempotency-key'];
  if (!iKey) return res.status(400).json({ error: 'Falta clave de idempotencia' });

  const m = parseFloat(monto);
  if (!m || isNaN(m)) return res.status(400).json({ error: 'Monto inválido' });

  // 1. Verificar contraseña de fondo
  if (!password_fondo) return res.status(400).json({ error: 'Ingresa tu contraseña de fondos para continuar' });
  
  const userAuth = await findUserWithAuthSecrets(user.id);
  if (!userAuth.password_fondo_hash) return res.status(400).json({ error: 'Debes configurar tu contraseña de fondos antes de retirar.' });
  
  const passOk = await bcrypt.compare(password_fondo, userAuth.password_fondo_hash);
  if (!passOk) {
    return res.status(400).json({ error: 'Contraseña de fondos incorrecta.' });
  }

  // 2. Verificar cuenta bancaria
  if (!tarjeta_id) return res.status(400).json({ error: 'Debes registrar una cuenta bancaria antes de solicitar un retiro.' });
  const bankAccount = await queryOne(`SELECT id FROM tarjetas_bancarias WHERE id = ? AND usuario_id = ? AND activa = 1`, [tarjeta_id, user.id]);
  if (!bankAccount) return res.status(400).json({ error: 'Cuenta bancaria inválida.' });

  // 3. VALIDACIÓN CENTRALIZADA (CALENDARIO, DÍAS POR NIVEL)
  const opStatus = await canWithdraw(user.id);
  if (!opStatus.ok) return res.status(403).json({ error: opStatus.message });

  // 4. Procesar comprobante QR obligatorio
  let finalComprobanteUrl = null;
  let imageBuffer = null;

  const qrValidation = validateRequiredWithdrawalQrImage(comprobante_url);
  if (!qrValidation.ok) {
    return res.status(400).json({ error: qrValidation.message });
  }

  const dataUrlMatch = comprobante_url.match(/^data:(image\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
  // #region debug-point A:withdraw-request-parse
  reportWithdrawalQrDebug('A', 'withdrawals.mjs:114', '[DEBUG] Withdrawal comprobante parse attempt', {
    hasMatch: !!dataUrlMatch,
    mimeType: dataUrlMatch?.[1] || null
  });
  // #endregion
  if (!dataUrlMatch) {
    return res.status(400).json({ error: 'El comprobante QR debe ser una imagen válida.' });
  }

  const mimeType = dataUrlMatch[1];
  const base64Data = dataUrlMatch[2];
  imageBuffer = Buffer.from(base64Data, 'base64');
  const ext = `.${mimeType.split('/')[1]}` || '.jpg';

  try {
    const uploaded = await uploadImageBuffer(imageBuffer, { folder: 'comprobantes', ext });
    finalComprobanteUrl = uploaded.secure_url;
    // #region debug-point B:withdraw-upload-result
    reportWithdrawalQrDebug('B', 'withdrawals.mjs:129', '[DEBUG] Withdrawal comprobante uploaded', {
      uploadedUrl: finalComprobanteUrl,
      bufferBytes: imageBuffer.length,
      extension: ext
    });
    // #endregion
  } catch (err) {
    // #region debug-point B:withdraw-upload-error
    reportWithdrawalQrDebug('B', 'withdrawals.mjs:136', '[DEBUG] Withdrawal comprobante upload failed', {
      error: err?.message || String(err)
    });
    // #endregion
    logger.error(`[WITHDRAW] Error guardando comprobante QR: ${err.message}`);
    return res.status(500).json({ error: 'No se pudo guardar el comprobante QR.' });
  }

  // 5. Ejecución Blindaje en Service
  const result = await requestWithdrawal(user.id, { 
    monto: m, 
    tipo_billetera, 
    tarjeta_id, 
    idempotencyKey: iKey,
    comprobante_url: finalComprobanteUrl
  });

  // 6. Increment rate limit counter ONLY on success
  if (req.withdrawalRateKey) {
    try {
      const current = await redis.incr(req.withdrawalRateKey);
      if (current === 1) await redis.expire(req.withdrawalRateKey, RATE_LIMIT_WINDOW);
    } catch (err) {
      // Ignore Redis errors
    }
  }

  // 7. Alerta de Telegram (MÓDULO 9: Flujo de Retiro Pasantía)
  const tb = await queryOne(`SELECT * FROM tarjetas_bancarias WHERE id = ?`, [tarjeta_id]);
  const config = await getGlobalContent();
  const niveles = await getLevels();
  const userLevel = niveles.find(l => String(l.id) === String(user.nivel_id));
  const pasantiaMode = normalizePasantiaMode(config?.modo_retiro_pasantia);

  const message = formatRetiroMessage({
    id: result.retiroId,
    telefono: user.telefono,
    nombre_usuario: user.nombre_usuario,
    nivel: userLevel?.nombre || 'Usuario', 
    monto: m,
    banco: tb.nombre_banco,
    cuenta: tb.numero_cuenta,
    nombre_titular: tb.nombre_titular, // <-- Añadido
    hora: peruTime.getTimeString()
  }, config.comision_retiro);
  
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📝 Tomar Caso", callback_data: `retiro_tomar_${result.retiroId}` }
        ]
      ]
    }
  };
  const userLevelCode = String(userLevel?.codigo || '').toLowerCase();
  const notifyOptions = imageBuffer ? { ...options, photo: imageBuffer } : options;
  // #region debug-point C:withdraw-telegram-branch
  reportWithdrawalQrDebug('C', 'withdrawals.mjs:188', '[DEBUG] Withdrawal telegram branch prepared', {
    retiroId: result?.retiroId || null,
    userId: user?.id || null,
    userLevelCode,
    hasImageBuffer: !!imageBuffer,
    imageBufferBytes: Buffer.isBuffer(imageBuffer) ? imageBuffer.length : 0
  });
  // #endregion

  if (userLevelCode === 'internar' || userLevelCode === 'pasantia') {
    if (pasantiaMode === 'blocked') {
      return res.status(403).json({ error: 'Los retiros para usuarios de Pasantía están deshabilitados por administración en este momento.' });
    }

    if (pasantiaMode === 'sponsor_vip' && result.requiresSponsorApproval) {
      if (user.invitado_por) {
        const sponsor = await queryOne(`SELECT id, telegram_user_id FROM usuarios WHERE id = ?`, [user.invitado_por]);

        // Siempre crear una notificación interna para el invitador.
        await createNotification(
          user.invitado_por,
          'Aprobación de retiro requerida',
          `${user.nombre_usuario} solicitó un retiro de ${m.toFixed(2)} Bs y necesita tu aprobación.`
        );

        if (sponsor && sponsor.telegram_user_id) {
          try {
            await sendToTelegramUser(sponsor.telegram_user_id, message, notifyOptions);
            logger.info(`[TELEGRAM] Notificación de retiro Pasantía enviada a patrocinador ${sponsor.telegram_user_id}`);
          } catch (err) {
            logger.error(`[TELEGRAM] Falló el envío del retiro ${result.retiroId} al patrocinador ${sponsor.telegram_user_id}: ${err.message}`);
          }
        } else {
          logger.warn(`[TELEGRAM] Patrocinador de usuario ${user.id} no tiene Telegram ID o no fue encontrado. La solicitud queda pendiente para aprobación desde la web.`);
        }
      } else {
        logger.warn(`[TELEGRAM] Usuario Pasantía ${user.id} sin patrocinador. La solicitud queda registrada sin escalar a admins.`);
      }
      return res.json({ success: true, message: 'Tu solicitud fue enviada a tu patrocinador para su aprobación.' });
    }

    await notifyWithdrawalAdmins(message, notifyOptions, result.retiroId);
    return res.json({ success: true, message: 'Tu solicitud fue enviada directamente a administración para su revisión.' });
  }

  await notifyWithdrawalAdmins(message, notifyOptions, result.retiroId);
  res.json({ success: true, message: 'Retiro solicitado con éxito.' });
}));

export default router;
