import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { query, queryOne, transaction } from '../../config/db.mjs';
import { authenticate, requireGlobalAdmin, requireAdmin } from '../../utils/middleware/auth.mjs';
import { AuditService } from '../../services/auditService.mjs';
import { SupportService } from '../../services/supportService.mjs';
import logger from '../../utils/logger.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();

/**
 * Registro de nueva empresa (Onboarding SaaS)
 */
router.post('/register-tenant', asyncHandler(async (req, res) => {
  const { companyName, slug, adminPhone, adminName, password, planId } = req.body;

  if (!companyName || !slug || !adminPhone || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para el registro' });
  }

  const result = await transaction(async (conn) => {
    // 1. Verificar si el slug ya existe
    const existing = await conn.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
    if (existing[0].length > 0) throw new Error('El identificador de empresa (slug) ya está en uso');

    // 2. Crear Tenant
    const tenantId = uuidv4();
    await conn.query(
      `INSERT INTO tenants (id, name, slug, plan_id, status, subscription_status, trial_ends_at) 
       VALUES (?, ?, ?, ?, 'active', 'trial', DATE_ADD(NOW(), INTERVAL 14 DAY))`,
      [tenantId, companyName, slug, planId || 'plan-startup']
    );

    // 3. Crear Usuario Administrador para el Tenant
    const adminId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const inviteCode = Math.random().toString(36).slice(2, 10).toUpperCase();

    await conn.query(
      `INSERT INTO usuarios (id, tenant_id, telefono, nombre_usuario, nombre_real, password_hash, rol, codigo_invitacion) 
       VALUES (?, ?, ?, ?, ?, ?, 'admin', ?)`,
      [adminId, tenantId, adminPhone, adminName || 'Admin', passwordHash, inviteCode]
    );

    // 4. Inicializar métricas de uso
    await conn.query(
      `INSERT INTO tenant_usage (tenant_id, metric_name, current_value) VALUES (?, 'users_count', 1)`,
      [tenantId]
    );

    return { tenantId, adminId, slug };
  });

  logger.info(`[SaaS-Onboarding] Nuevo tenant creado: ${slug} (${result.tenantId})`);
  res.status(201).json({ 
    message: 'Empresa registrada correctamente', 
    tenant: result 
  });
}));

/**
 * Obtener estado de suscripción y límites (Dashboard SaaS)
 */
router.get('/tenant-status', authenticate, asyncHandler(async (req, res) => {
  const status = await queryOne(
    `SELECT t.*, p.name as plan_name, p.max_users, p.max_withdrawals_daily, p.features 
     FROM tenants t 
     JOIN saas_plans p ON t.plan_id = p.id 
     WHERE t.id = ?`,
    [req.tenantId]
  );

  const usage = await query(
    `SELECT metric_name, current_value FROM tenant_usage WHERE tenant_id = ?`,
    [req.tenantId]
  );

  res.json({ status, usage });
}));

/**
 * Listado de Planes (Público)
 */
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = await query('SELECT * FROM saas_plans WHERE is_active = 1');
  res.json(plans);
}));

/**
 * Logs de Auditoría (Dashboard SaaS)
 */
router.get('/audit-logs', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const logs = await AuditService.getTenantLogs(req.tenantId, parseInt(limit), parseInt(offset));
  res.json(logs);
}));

/**
 * Panel Global Admin - Debugging y Gestión de Tenants
 */
router.get('/admin/health/:tenantId', authenticate, requireGlobalAdmin, asyncHandler(async (req, res) => {
  const health = await SupportService.getTenantHealth(req.params.tenantId);
  res.json(health);
}));

router.post('/admin/reset-usage', authenticate, requireGlobalAdmin, asyncHandler(async (req, res) => {
  const { tenantId, metric } = req.body;
  await SupportService.resetTenantUsage(tenantId, metric);
  res.json({ message: 'Uso reseteado correctamente' });
}));

export default router;
