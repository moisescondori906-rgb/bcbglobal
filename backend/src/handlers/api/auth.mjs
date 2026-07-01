import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { findUserByTelefono, createUser, getLevels, updateUser, getCanonicalTelefono, giveTicketsPorRegistro } from '../../services/dbService.mjs';
import { query, queryOne } from '../../config/db.mjs';
import { sendToAdmin } from '../../services/telegramBot.mjs';
import { BillingService } from '../../services/billingService.mjs';
import { AuditService } from '../../services/auditService.mjs';
import redis from '../../services/redisService.mjs';
import { DEMO_USER_ID, DEMO_USER_DATA } from '../../utils/middleware/requestContext.mjs';
import logger from '../../utils/logger.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';
import { rateLimiter } from '../../utils/middleware/rateLimiter.mjs';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

// Rate limits específicos para evitar ataques de fuerza bruta y saturación
const registerLimiter = rateLimiter(15 * 60 * 1000, 10); // Máximo 10 registros cada 15 min por IP
const loginLimiter = rateLimiter(5 * 60 * 1000, 20); // Máximo 20 intentos de login cada 5 min por IP

router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const { telefono, nombre_usuario, password, codigo_invitacion, deviceId, fingerprint } = req.body;
  if (!telefono || !nombre_usuario || !password || !codigo_invitacion) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const inviteCode = String(codigo_invitacion || '').trim().toUpperCase();
  const canonicalTelefono = getCanonicalTelefono(telefono);

  // 1. Validaciones en paralelo con Fingerprinting y Device ID check
  const [existingUser, inviter, levels, ipCheck, fpCheck, deviceUsers] = await Promise.all([
    findUserByTelefono(telefono),
    queryOne(`SELECT id FROM usuarios WHERE codigo_invitacion = ?`, [inviteCode]),
    getLevels(),
    // Protección Anti-Abuso: IP + Fingerprint
    redis.get(`onboarding:ip:${req.ip}`),
    fingerprint ? redis.get(`onboarding:fp:${fingerprint}`) : null,
    // Obtener usuarios existentes en el dispositivo para validar duplicados
    deviceId ? query(`SELECT id, telefono FROM usuarios WHERE last_device_id = ?`, [deviceId]) : []
  ]);

  if ((ipCheck && parseInt(ipCheck) >= 3) || (fpCheck && parseInt(fpCheck) >= 1)) {
    return res.status(429).json({ 
      error: 'Actividad sospechosa detectada. Por razones de seguridad, el registro ha sido bloqueado.',
      code: 'ANTI_ABUSE_LOCK'
    });
  }

  // Límite: solo 1 usuario por número de teléfono
  if (existingUser) {
    return res.status(400).json({ 
      error: 'Este número de teléfono ya está registrado.',
      code: 'DUPLICATE_PHONE'
    });
  }

  // Validadar límite de 2 cuentas por dispositivo
  const currentDeviceCount = Array.isArray(deviceUsers) ? deviceUsers.length : 0;
  if (currentDeviceCount >= 2) {
    // Bloquear este dispositivo permanentemente
    if (fingerprint) {
      await redis.set(`onboarding:fp:${fingerprint}`, '2', 'EX', 86400 * 365 * 10); // Bloquear por 10 años
    }
    if (deviceId) {
      await redis.set(`onboarding:device:${deviceId}`, '2', 'EX', 86400 * 365 * 10); // Bloquear por 10 años
    }
    return res.status(400).json({ 
      error: 'Este dispositivo ya alcanzó el límite máximo de cuentas permitidas.',
      code: 'DEVICE_LIMIT_REACHED'
    });
  }

  // Verificar si el dispositivo está bloqueado por límite anterior
  const deviceBlocked = deviceId ? await redis.get(`onboarding:device:${deviceId}`) : null;
  if (deviceBlocked && parseInt(deviceBlocked) >= 2) {
    return res.status(400).json({ 
      error: 'Este dispositivo está bloqueado para crear nuevas cuentas por haber alcanzado el límite.',
      code: 'DEVICE_BLOCKED'
    });
  }

  // Si ya hay una cuenta en el dispositivo, verificar que el teléfono sea diferente
  if (currentDeviceCount === 1 && deviceUsers && deviceUsers[0]) {
    const existingUserPhone = getCanonicalTelefono(deviceUsers[0].telefono);
    if (existingUserPhone === canonicalTelefono) {
      return res.status(400).json({ 
        error: 'Este número de teléfono ya está registrado en este dispositivo.',
        code: 'DUPLICATE_PHONE_ON_DEVICE'
      });
    }
  }

  if (!inviter) return res.status(400).json({ error: 'Código de invitación inválido' });

  // 1.1 Límite de 15 usuarios "Internar" por invitado (v12.2.0)
  const internarLevel = levels.find(l => String(l.codigo).toLowerCase() === 'internar' || String(l.id) === 'l1');
  if (internarLevel) {
    const internarCount = await queryOne(`
      SELECT COUNT(*) as total FROM usuarios 
      WHERE invitado_por = ? AND nivel_id = ?
    `, [inviter.id, internarLevel.id]);
    
    if (internarCount.total >= 15) {
      return res.status(400).json({ 
        error: 'El anfitrión ya tiene el límite de 15 usuarios Pasantes alcanzado. Debe liberar espacio para agregar nuevos.',
        code: 'INTERNAR_LIMIT_REACHED'
      });
    }
  }

  // SaaS Check: Límite de usuarios por plan
  if (req.tenantId) {
    const canAddUser = await BillingService.checkLimits(req.tenantId, 'users_count');
    if (!canAddUser) return res.status(403).json({ error: 'Límite de usuarios alcanzado para su plan SaaS.' });
  }
  
  // REGLA ACTUALIZADA: Los usuarios AHORA pueden invitar, pero no recibirán comisiones (manejado en distributeInvestmentCommissions)
  const codigo = Math.random().toString(36).slice(2, 10).toUpperCase();
  
  const user = {
    id: uuidv4(),
    telefono: canonicalTelefono,
    nombre_usuario,
    nombre_real: nombre_usuario,
    password_hash: await bcrypt.hash(password, 10),
    password_fondo_hash: null,
    codigo_invitacion: codigo,
    invitado_por: inviter.id || null,
    nivel_id: internarLevel ? internarLevel.id : (levels[0]?.id || 'l1'),
    saldo_principal: 0,
    saldo_comisiones: 0,
    rol: 'usuario',
    bloqueado: false,
    tickets_ruleta: 1,
    primer_ascenso_completado: false,
    last_device_id: deviceId || null,
    fingerprint: fingerprint || null,
    tenant_id: req.tenantId || 'default-tenant-uuid',
    status: 'pending_verification' // Nuevo estado para Onboarding
  };
  
  await createUser(user); 
  
  // Otorgar ticket por registro
  try {
    await giveTicketsPorRegistro(user.id);
    logger.info(`[Auth-Register] Ticket otorgado a nuevo usuario: ${user.id}`);
  } catch (ticketErr) {
    logger.error(`[Auth-Register] Error al otorgar ticket: ${ticketErr.message}`);
    // No bloqueamos el registro por error en tickets
  }
  
  // 3. Persistir Fingerprint y Bloquear IPs sospechosas
  await Promise.all([
    redis.incr(`onboarding:ip:${req.ip}`),
    fingerprint ? redis.set(`onboarding:fp:${fingerprint}`, '1', 'EX', 86400 * 30) : Promise.resolve()
  ]);
  await redis.expire(`onboarding:ip:${req.ip}`, 3600);

  // SaaS Usage: Incrementar contador de usuarios
  if (req.tenantId) {
    await BillingService.trackUsage(req.tenantId, 'users_count');
  }

  // Auditoría de Onboarding con Fingerprint
  await AuditService.log(req, 'USER_REGISTERED', 'user', user.id, { ip: req.ip, deviceId, fingerprint });

  const token = jwt.sign({ 
    id: user.id, 
    rol: user.rol, 
    tenantId: user.tenant_id,
    region: req.tenant?.region || 'global'
  }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: sanitizeUser(user, levels), token });
}));

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { telefono, password, deviceId } = req.body;
  
  // MODO DEMO: Bypass si es el número de prueba
  if (telefono === '900000000' && password === 'demo123') {
    const token = jwt.sign({ id: DEMO_USER_ID, rol: 'usuario' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ user: DEMO_USER_DATA, token });
  }

  const user = await findUserByTelefono(telefono);
  if (!user) {
    logger.warn(`[AUTH-DEBUG] Login fallido: Usuario no encontrado para teléfono: [${telefono}]`);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  
  const trimmedPassword = String(password || '').trim();
  logger.info(`[AUTH-DEBUG] Comparando contraseña para ${telefono}. Password recibida: [${trimmedPassword}] (Largo: ${trimmedPassword.length})`);
  
  const passOk = await bcrypt.compare(trimmedPassword, user.password_hash);
  if (!passOk) {
    logger.warn(`[AUTH-DEBUG] Login fallido: Contraseña incorrecta para ${telefono}. Hash en DB: ${user.password_hash.substring(0, 10)}...`);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (user.bloqueado) return res.status(403).json({ error: 'Cuenta bloqueada temporalmente. Contacte a soporte.' });

  // VINCULACIÓN DE DISPOSITIVO (Último dispositivo manda)
  const NUMERO_ADMIN_ESPECIAL = '+59174344916';
  if (user.telefono !== NUMERO_ADMIN_ESPECIAL && user.rol === 'usuario' && deviceId) {
    if (user.last_device_id !== deviceId) {
      await updateUser(user.id, { 
        last_device_id: deviceId,
        security_alert: null // Limpiamos alertas si se loguea exitosamente
      });
      logger.info(`[DEVICE-AUTO-SWITCH] Usuario ${user.id} sincronizado con nuevo dispositivo ${deviceId}`);
    }
  }

  const levels = await getLevels();
  const token = jwt.sign({ 
    id: user.id, 
    rol: user.rol,
    tenantId: user.tenant_id,
    deviceId: deviceId || user.last_device_id
  }, JWT_SECRET, { expiresIn: '7d' });
  
  res.json({ user: sanitizeUser(user, levels), token });
}));

function sanitizeUser(u, levels) {
  const safeLevels = Array.isArray(levels) ? levels : [];
  const level = safeLevels.find(l => String(l.id) === String(u.nivel_id));
  return {
    id: u.id,
    telefono: u.telefono,
    nombre_usuario: u.nombre_usuario,
    nombre_real: u.nombre_real,
    codigo_invitacion: u.codigo_invitacion,
    nivel: level?.nombre || 'Internar',
    nivel_id: u.nivel_id,
    nivel_codigo: level?.codigo || 'internar',
    saldo_principal: u.saldo_principal || 0,
    saldo_comisiones: u.saldo_comisiones || 0,
    rol: u.rol,
    avatar_url: u.avatar_url,
    tickets_ruleta: Number(u.tickets_ruleta) || 0,
    tiene_password_fondo: !!u.password_fondo_hash,
    last_device_id: u.last_device_id,
    security_alert: u.security_alert,
    grado_colaborador: u.grado_colaborador || 'ninguno',
    salario_colaborador: Number(u.salario_colaborador || 0),
  };
}

export default router;
