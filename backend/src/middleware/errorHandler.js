import { createModuleLogger } from '../lib/logger.js';
import { response } from '../lib/response.js';

const errorLogger = createModuleLogger('ERROR-HANDLER');

/**
 * Middleware central de manejo de errores
 */
export const errorHandler = (err, req, res, next) => {
  errorLogger.error(`${err.name}: ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    stack: err.stack,
    user: req.user?.id,
    ip: req.ip
  });

  // Si la respuesta ya fue enviada, no intentamos enviar otra
  if (res.headersSent) {
    return next(err);
  }

  // Manejo de errores específicos
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return response.error(res, 'Sesión expirada o no válida', 401);
  }

  if (err.name === 'ValidationError') {
    return response.error(res, err.message, 400);
  }

  // Error genérico blindado para producción
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor. El equipo técnico ha sido notificado.'
    : err.message;

  return response.error(
    res, 
    message, 
    err.status || 500,
    process.env.NODE_ENV === 'production' ? null : err
  );
};
