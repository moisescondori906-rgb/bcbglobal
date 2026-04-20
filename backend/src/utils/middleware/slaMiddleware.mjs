import { recordSLADatum } from '../../services/resilienceService.mjs';
import logger from '../../utils/logger.mjs';

/**
 * Middleware para capturar métricas de SLA en cada petición.
 */
export const slaMiddleware = (req, res, next) => {
  const start = Date.now();
  const region = process.env.REGION || 'LATAM-BO-1';

  // Al terminar la respuesta, registrar métricas
  res.on('finish', () => {
    const duration = Date.now() - start;
    const success = res.statusCode < 400;
    const serviceName = req.baseUrl || 'api';
    const tenantId = req.tenantId || null;

    // Registrar de forma asíncrona sin bloquear
    recordSLADatum(serviceName, region, duration, success, tenantId).catch(err => {
      logger.error(`[SLA-MIDDLEWARE] Error recording metrics: ${err.message}`);
    });
  });

  next();
};
