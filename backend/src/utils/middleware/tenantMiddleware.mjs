import logger from '../../utils/logger.mjs';
import { queryOne } from '../../config/db.mjs';
import { BillingService } from '../../services/billingService.mjs';

/**
 * Middleware para identificar el Tenant en cada petición.
 */
export async function tenantContext(req, res, next) {
  const tenantId = req.headers['x-tenant-id'];
  const tenantSlug = req.headers['x-tenant-slug'];
  const host = req.headers['host'];

  try {
    let tenant = null;

    if (tenantId) {
      tenant = await queryOne('SELECT * FROM tenants WHERE id = ?', [tenantId]);
    } else if (tenantSlug) {
      tenant = await queryOne('SELECT * FROM tenants WHERE slug = ?', [tenantSlug]);
    } else {
      tenant = await queryOne('SELECT * FROM tenants WHERE domain = ?', [host]);
    }

    if (!tenant) {
      tenant = await queryOne('SELECT * FROM tenants WHERE slug = "bcb-global"');
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado', code: 'TENANT_NOT_FOUND' });
    }

    // 1. Verificación de Suscripción SaaS (SaaS Commercial v20)
    const isSubscribed = await BillingService.checkSubscription(tenant.id);
    if (!isSubscribed) {
      return res.status(402).json({ 
        error: 'Suscripción inactiva o suspendida. Revise su estado de facturación.',
        code: 'SUBSCRIPTION_REQUIRED',
        tenantStatus: tenant.subscription_status
      });
    }

    // Inyectar contexto del tenant
    req.tenantId = tenant.id;
    req.tenant = tenant;
    req.planId = tenant.plan_id;

    // 2. Control de Modo Degradado (Solo Lectura) con Allowlist
    const isDegraded = tenant.subscription_status === 'past_due' || (tenant.config && tenant.config.degraded_mode);
    
    if (isDegraded && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      // Allowlist de operaciones críticas (Ej: Pagos para salir de modo degradado, Soporte urgente)
      const allowlistPaths = ['/api/v1/billing/pay', '/api/v1/support/ticket'];
      const isAdminOverride = req.requestUser?.rol === 'admin'; // Override para Global Admin

      if (!allowlistPaths.some(path => req.path.startsWith(path)) && !isAdminOverride) {
        return res.status(403).json({
          error: 'SaaS en modo degradado. Las operaciones de escritura están deshabilitadas por falta de pago.',
          code: 'DEGRADED_MODE_ACTIVE'
        });
      }
    }

    next();
  } catch (error) {
    logger.error(`[TenantContext Error]: ${error.message}`);
    res.status(500).json({ error: 'Error interno al procesar el contexto del tenant' });
  }
}

/**
 * Middleware para asegurar que el usuario pertenece al tenant actual
 */
export function ensureTenantAccess(req, res, next) {
  if (!req.requestUser) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (req.requestUser.tenant_id !== req.tenantId) {
    logger.warn(`[TenantSecurity] Acceso denegado: Usuario ${req.requestUser.id} intentó acceder al tenant ${req.tenantId}`);
    return res.status(403).json({ 
      error: 'Acceso denegado: El usuario no pertenece a esta empresa',
      code: 'TENANT_MISMATCH'
    });
  }

  next();
}
