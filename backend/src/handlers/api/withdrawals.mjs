import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { 
  getPublicContent, boliviaTime, findUserWithAuthSecrets,
  canWithdraw, requestWithdrawal
} from '../../services/dbService.mjs';
import { query } from '../../config/db.mjs';
import { authenticate } from '../../utils/middleware/auth.mjs';
import { attachRequestUser } from '../../utils/middleware/requestContext.mjs';
import { dynamicControlMiddleware } from '../../utils/middleware/dynamicControl.mjs';
import { 
  sendToRetiros, 
  sendToAdmin, 
  sendToSecretaria, 
  formatRetiroMessage 
} from '../../services/telegramBot.mjs';
import logger from '../../utils/logger.mjs';
import redis from '../../services/redisService.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();

// Rate Limit Config: 2 intentos de retiro por minuto
const WITHDRAW_RATE_LIMIT = 2;
const RATE_LIMIT_WINDOW = 60;

const withdrawRateLimit = async (req, res, next) => {
  const userId = req.requestUser?.id;
  if (!userId) return next();
  const key = `ratelimit:withdraw:${userId}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, RATE_LIMIT_WINDOW);
    if (current > WITHDRAW_RATE_LIMIT) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
    }
    next();
  } catch (err) { next(); }
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
  const { monto, tipo_billetera, password_fondo, tarjeta_id, idempotency_key, qr_retiro } = req.body;
  const user = req.requestUser;

  const iKey = idempotency_key || req.headers['x-idempotency-key'];
  if (!iKey) return res.status(400).json({ error: 'Falta clave de idempotencia' });

  const m = parseFloat(monto);
  if (!MONTOS_PERMITIDOS.includes(m)) return res.status(400).json({ error: 'Monto no permitido' });

  // 1. Verificar contraseña de fondo
  const userAuth = await findUserWithAuthSecrets(user.id);
  if (!userAuth.password_fondo_hash) return res.status(400).json({ error: 'Configura tu contraseña de fondo primero.' });
  const passOk = await bcrypt.compare(password_fondo, userAuth.password_fondo_hash);
  if (!passOk) return res.status(401).json({ error: 'Contraseña de fondo incorrecta.' });

  // 2. VALIDACIÓN CENTRALIZADA (CALENDARIO, DÍAS POR NIVEL)
  const opStatus = await canWithdraw(user.id);
  if (!opStatus.ok) return res.status(403).json({ error: opStatus.message });

  // 3. Ejecución Blindada en Service (ACID + 1 Retiro/Día + SELECT FOR UPDATE)
  const result = await requestWithdrawal(user.id, { 
    monto: m, 
    tipo_billetera, 
    tarjeta_id, 
    idempotencyKey: iKey 
  });

  // 4. Alerta de Telegram (Resiliente y desacoplada)
  // Obtener datos bancarios para el mensaje de Telegram
  const tarjetas = await query(`SELECT * FROM tarjetas_bancarias WHERE id = ?`, [tarjeta_id]);
  const tb = tarjetas[0] || {};

  const message = formatRetiroMessage({
    telefono: user.nombre_usuario || user.telefono,
    nivel: 'Usuario', 
    monto: m,
    banco: tb.nombre_banco,
    cuenta: tb.numero_cuenta,
    hora: boliviaTime.getTimeString()
  });
  
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📝 Tomar Caso", callback_data: `tomar:retiro:${result.retiroId}` }
        ]
      ]
    }
  };

  // Si hay QR, enviarlo como foto
  if (qr_retiro && qr_retiro.startsWith('data:image')) {
    try {
      const base64Data = qr_retiro.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      options.photo = buffer;
    } catch (err) {
      logger.error('[TELEGRAM] Error al procesar QR para retiro:', err.message);
    }
  }

  // Notificar de forma asíncrona y resiliente con safeTelegram
  sendToRetiros(message, options);
  sendToAdmin(message, options);

  res.json({ success: true, message: 'Retiro solicitado con éxito.' });
}));

export default router;
