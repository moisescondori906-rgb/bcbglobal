import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { 
  getGlobalContent, peruTime, findUserWithAuthSecrets,
  canWithdraw, requestWithdrawal, getLevels
} from '../../services/dbService.mjs';
import { query, queryOne } from '../../config/db.mjs';
import { authenticate } from '../../utils/middleware/auth.mjs';
import { attachRequestUser } from '../../utils/middleware/requestContext.mjs';
import { dynamicControlMiddleware } from '../../utils/middleware/dynamicControl.mjs';
import { 
  sendToRetiros, 
  sendToAdmin, 
  sendToSecretaria, 
  sendToTelegramUser,
  formatRetiroMessage 
} from '../../services/telegramBot.mjs';
import logger from '../../utils/logger.mjs';
import redis from '../../services/redisService.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();

// Rate Limit Config: 5 intentos de retiro por minuto
const WITHDRAW_RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 60;

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

const MONTOS_PERMITIDOS = [25, 100, 500, 1500, 5000, 10000];

router.get('/montos', (req, res) => {
  res.json(MONTOS_PERMITIDOS);
});

router.get('/', asyncHandler(async (req, res) => {
  const list = await query(`SELECT * FROM retiros WHERE usuario_id = ? ORDER BY created_at DESC`, [req.user.id]);
  res.json(list);
}));

router.post('/', withdrawRateLimit, dynamicControlMiddleware('withdrawal'), asyncHandler(async (req, res) => {
  const { monto, tipo_billetera, password_fondo, tarjeta_id, idempotency_key } = req.body;
  const user = req.requestUser;

  const iKey = idempotency_key || req.headers['x-idempotency-key'];
  if (!iKey) return res.status(400).json({ error: 'Falta clave de idempotencia' });

  const m = parseFloat(monto);
  if (!m || isNaN(m)) return res.status(400).json({ error: 'Monto inválido' });

  // 1. Verificar contraseña de fondo
  if (!password_fondo) return res.status(400).json({ error: 'Ingresa tu contraseña de fondos para continuar' });
  
  const userAuth = await findUserWithAuthSecrets(user.id);
  if (!userAuth.password_fondo_hash) return res.status(400).json({ error: 'Debes configurar tu contraseña de fondos antes de retirar.' });
  
  const passOk = await bcrypt.compare(password_fondo, userAuth.password_fondo_hash);
  if (!passOk) return res.status(401).json({ error: 'Contraseña de fondos incorrecta.' });

  // 2. Verificar cuenta bancaria
  if (!tarjeta_id) return res.status(400).json({ error: 'Debes registrar una cuenta bancaria antes de solicitar un retiro.' });
  const bankAccount = await queryOne(`SELECT id FROM tarjetas_bancarias WHERE id = ? AND usuario_id = ? AND activa = 1`, [tarjeta_id, user.id]);
  if (!bankAccount) return res.status(400).json({ error: 'Cuenta bancaria inválida.' });

  // 3. VALIDACIÓN CENTRALIZADA (CALENDARIO, DÍAS POR NIVEL)
  const opStatus = await canWithdraw(user.id);
  if (!opStatus.ok) return res.status(403).json({ error: opStatus.message });

  // 4. Ejecución Blindaje en Service
  const result = await requestWithdrawal(user.id, { 
    monto: m, 
    tipo_billetera, 
    tarjeta_id, 
    idempotencyKey: iKey
  });

  // 5. Increment rate limit counter ONLY on success
  if (req.withdrawalRateKey) {
    try {
      const current = await redis.incr(req.withdrawalRateKey);
      if (current === 1) await redis.expire(req.withdrawalRateKey, RATE_LIMIT_WINDOW);
    } catch (err) {
      // Ignore Redis errors
    }
  }

  // 6. Alerta de Telegram (MÓDULO 9: Flujo de Retiro Pasantía)
  const tb = await queryOne(`SELECT * FROM tarjetas_bancarias WHERE id = ?`, [tarjeta_id]);
  const config = await getGlobalContent();
  const niveles = await getLevels();
  const userLevel = niveles.find(l => String(l.id) === String(user.nivel_id));

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

  if (userLevel && (userLevel.codigo === 'internar' || userLevel.codigo === 'pasantia')) {
    // Si es Pasantía, enviar al patrocinador
    if (user.invitado_por) {
      const sponsor = await queryOne(`SELECT telegram_user_id FROM usuarios WHERE id = ?`, [user.invitado_por]);
      if (sponsor && sponsor.telegram_user_id) {
        sendToTelegramUser(sponsor.telegram_user_id, message, options); 
        logger.info(`[TELEGRAM] Notificación de retiro Pasantía enviada a patrocinador ${sponsor.telegram_user_id}`);
      } else {
        logger.warn(`[TELEGRAM] Patrocinador de usuario ${user.id} no tiene Telegram ID o no encontrado. Enviando a admins.`);
        sendToRetiros(message, options);
        sendToAdmin(message, options);
      }
    } else {
      logger.warn(`[TELEGRAM] Usuario Pasantía ${user.id} sin patrocinador. Enviando a admins.`);
      sendToRetiros(message, options);
      sendToAdmin(message, options);
    }
    // Mensaje para el usuario
    res.json({ success: true, message: 'Tu solicitud fue enviada a tu patrocinador para su aprobación.' });
  } else {
    // Si no es Pasantía, enviar a los grupos de retiros y admins
    sendToRetiros(message, options);
    sendToAdmin(message, options);
    res.json({ success: true, message: 'Retiro solicitado con éxito.' });
  }
}));

export default router;
