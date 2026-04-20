import { findUserById } from '../../services/dbService.mjs';

export const DEMO_USER_ID = 'DEMO-USER-ID';
export const DEMO_USER_DATA = {
  id: DEMO_USER_ID,
  telefono: '+59174344916',
  nombre_usuario: 'demo_user',
  nombre_real: 'Usuario de Demostración',
  codigo_invitacion: 'DEMO-ABC',
  invitado_por: null,
  nivel_id: 'l2', // Global 1
  saldo_principal: 1500.00,
  saldo_comisiones: 250.50,
  rol: 'usuario',
  bloqueado: 0,
  tickets_ruleta: 5,
  created_at: new Date().toISOString()
};

export const ADMIN_DEMO_ID = 'ADMIN-DEMO-ID';
export const ADMIN_DEMO_DATA = {
  id: ADMIN_DEMO_ID,
  telefono: '+59170000000',
  nombre_usuario: 'admin_demo',
  nombre_real: 'Admin Demostración',
  codigo_invitacion: 'ADMIN-001',
  invitado_por: null,
  nivel_id: 'l2',
  saldo_principal: 999999,
  saldo_comisiones: 999999,
  rol: 'admin',
  bloqueado: 0,
  tickets_ruleta: 0,
  created_at: new Date().toISOString()
};

/**
 * Tras `authenticate`: carga el usuario una sola vez por petición HTTP.
 * Las rutas deben usar `req.requestUser` en lugar de volver a llamar a `findUserById`.
 */
export async function attachRequestUser(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // MODO DEMO: Bypass si el ID es el de demo (Usuario o Admin)
  if (req.user.id === DEMO_USER_ID) {
    req.requestUser = DEMO_USER_DATA;
    return next();
  }

  if (req.user.id === ADMIN_DEMO_ID) {
    req.requestUser = ADMIN_DEMO_DATA;
    return next();
  }

  try {
    req.requestUser = await findUserById(req.user.id);
    
    // Si no se encuentra el usuario, puede ser un token antiguo o usuario eliminado
    if (!req.requestUser) {
      return res.status(401).json({ error: 'Sesión inválida o usuario no encontrado' });
    }

    // Doble validación: El usuario debe pertenecer al tenant del contexto (si aplica)
    if (req.requestUser && req.tenantId && req.requestUser.tenant_id !== req.tenantId) {
      return res.status(403).json({ 
        error: 'Acceso denegado: El usuario no pertenece a este tenant',
        code: 'TENANT_MISMATCH'
      });
    }

    next();
  } catch (e) {
    next(e);
  }
}
