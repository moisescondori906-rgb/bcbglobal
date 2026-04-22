import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { findUserByTelefono, createUser, getLevels, updateUser } from '../../services/dbService.mjs';
import { queryOne } from '../../config/db.mjs';
import { BillingService } from '../../services/billingService.mjs';
import { AuditService } from '../../services/auditService.mjs';
import redis from '../../services/redisService.mjs';
import { DEMO_USER_ID, DEMO_USER_DATA } from '../../utils/middleware/requestContext.mjs';
import logger from '../../utils/logger.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sav-demo-secret';

router.post('/register', asyncHandler(async (req, res) => {
  const { telefono, nombre_usuario, password, codigo_invitacion, deviceId, fingerprint } = req.body;
  if (!telefono || !nombre_usuario || !password || !codigo_invitacion) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // 1. Validaciones en paralelo con Fingerprinting
  const [exists, inviter, levels, ipCheck, fpCheck] = await Promise.all([
    findUserByTelefono(telefono),
    queryOne(`SELECT id FROM usuarios WHERE codigo_invitacion = ?`, [codigo_invitacion]),
    getLevels(),
    // Protección Anti-Abuso: IP + Fingerprint
    redis.get(`onboarding:ip:${req.ip}`),
    fingerprint ? redis.get(`onboarding:fp:${fingerprint}`) : null
  ]);

  if ((ipCheck && parseInt(ipCheck) >= 3) || (fpCheck && parseInt(fpCheck) >= 1)) {
    return res.status(429).json({ 
      error: 'Actividad sospechosa detectada. Por razones de seguridad, el registro ha sido bloqueado.',
      code: 'ANTI_ABUSE_LOCK'
    });
  }

  if (exists) return res.status(400).json({ error: 'Teléfono ya registrado' });
  if (!inviter) return res.status(400).json({ error: 'Código de invitación inválido' });

  // SaaS Check: Límite de usuarios por plan
  if (req.tenantId) {
    const canAddUser = await BillingService.checkLimits(req.tenantId, 'users_count');
    if (!canAddUser) return res.status(403).json({ error: 'Límite de usuarios alcanzado para su plan SaaS.' });
  }
  
  const internarLevel = levels.find(l => String(l.codigo).toLowerCase() === 'internar' || String(l.id) === 'l1');
  
  // REGLA ACTUALIZADA: Los usuarios AHORA pueden invitar, pero no recibirán comisiones (manejado en distributeInvestmentCommissions)
  const codigo = Math.random().toString(36).slice(2, 10).toUpperCase();
  const user = {
    id: uuidv4(),
    telefono,
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
    tickets_ruleta: 0,
    primer_ascenso_completado: false,
    last_device_id: deviceId || null,
    tenant_id: req.tenantId || 'default-tenant-uuid',
    status: 'pending_verification' // Nuevo estado para Onboarding
  };
  
  await createUser(user); 
  
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

router.post('/login', asyncHandler(async (req, res) => {
  const { telefono, password, deviceId } = req.body;
  
  // MODO DEMO: Bypass si es el número de prueba
  if (telefono === '70000000' && password === 'demo123') {
    const token = jwt.sign({ id: DEMO_USER_ID, rol: 'usuario' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ user: DEMO_USER_DATA, token });
  }

  const user = await findUserByTelefono(telefono);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  
  const passOk = await bcrypt.compare(password, user.password_hash);
  if (!passOk) return res.status(401).json({ error: 'Credenciales inválidas' });

  if (user.bloqueado) return res.status(403).json({ error: 'Cuenta bloqueada temporalmente. Contacte a soporte.' });

  // RESTRICCIÓN DE DISPOSITIVO ÚNICO (Senior Security Standard)
  if (user.rol === 'usuario') { // Los admins suelen saltarse esta restricción por conveniencia
    if (user.last_device_id && deviceId && user.last_device_id !== deviceId) {
      return res.status(403).json({ 
        error: 'Esta cuenta ya está vinculada a otro dispositivo móvil. Por seguridad, solo puede usar un dispositivo.',
        code: 'DEVICE_LOCKED'
      });
    }

    // Vincular dispositivo si es la primera vez
    if (!user.last_device_id && deviceId) {
      await updateUser(user.id, { last_device_id: deviceId });
    }
  }

  const levels = await getLevels();
  const token = jwt.sign({ 
    id: user.id, 
    rol: user.rol,
    tenantId: user.tenant_id
  }, JWT_SECRET, { expiresIn: '7d' });
  
  res.json({ user: sanitizeUser(user, levels), token });
}));

function sanitizeUser(u, levels) {
  const level = levels.find(l => String(l.id) === String(u.nivel_id));
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
  };
}

export default router;
