import logger from '../utils/logger.mjs';
import { response } from '../utils/response.mjs';

/**
 * Higher-Order Function para envolver controladores y capturar errores asíncronos.
 * Elimina la necesidad de usar try/catch en cada controlador.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    logger.error(`[ASYNC-HANDLER] Error capturado: ${err.message}`, {
      url: req.originalUrl,
      method: req.method,
      stack: err.stack,
      userId: req.user?.id
    });
    
    // Si la respuesta ya fue enviada, no intentamos enviar otra
    if (res.headersSent) {
      return next(err);
    }

    return response.error(
      res, 
      process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor. El equipo técnico ha sido notificado.' 
        : err.message, 
      err.status || 500
    );
  });
};
