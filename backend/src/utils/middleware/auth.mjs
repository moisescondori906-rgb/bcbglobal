import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'sav-demo-secret';
    const decoded = jwt.verify(token, secret);
    
    // Inyectar datos del token en la request
    req.user = {
      id: decoded.id,
      rol: decoded.rol,
      tenantId: decoded.tenantId,
      region: decoded.region
    };

    next();
  } catch (err) {
    return res.status(401).json({ 
      error: 'Token inválido o expirado',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

/**
 * Solo permite acceso a administradores del tenant actual o admins globales.
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== 'admin' && req.user?.rol !== 'global_admin') {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de Administrador' });
  }
  next();
};

/**
 * Solo para administradores de la plataforma SaaS (Dueños del sistema).
 */
export const requireGlobalAdmin = (req, res, next) => {
  if (req.user?.rol !== 'global_admin') {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de Administrador Global' });
  }
  next();
};
