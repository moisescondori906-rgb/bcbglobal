import operationalControl from '../../services/operationalControl.mjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.mjs';

/**
 * dynamicControlMiddleware: El portero dinámico del sistema.
 * Valida: Feature Flags, Región, Horarios y Mantenimiento.
 */
export const dynamicControlMiddleware = (operationType) => {
  return async (req, res, next) => {
    const traceId = uuidv4();
    const region = req.headers['x-region'] || req.user?.region || 'GLOBAL';
    const userId = req.user?.id;
    const userRole = req.user?.rol || 'usuario';
    const isOverride = req.headers['x-override-control'] === 'true';

    try {
      // 1. Validar Feature Flag
      const flag = await operationalControl.getFeatureFlag(operationType, region);
      if (!flag.enabled) {
        await operationalControl.logControlAction({
          traceId, userId, operation: operationType, region,
          result: 'bloqueado', reason: 'Feature Disabled'
        });
        return res.status(403).json({ error: 'Funcionalidad temporalmente desactivada.', code: 'FEATURE_DISABLED', traceId });
      }

      // 2. Validar Ventana de Mantenimiento
      const maintenance = await operationalControl.checkMaintenance(region);
      if (maintenance) {
        // Excepción: Super Admin puede saltar mantenimiento
        if (userRole === 'admin' && isOverride) {
          await operationalControl.logControlAction({
            traceId, userId, operation: operationType, region,
            result: 'override', reason: 'Admin Override Mantenimiento'
          });
          return next();
        }
        
        await operationalControl.logControlAction({
          traceId, userId, operation: operationType, region,
          result: 'bloqueado', reason: 'Maintenance Window'
        });
        return res.status(503).json({ 
          error: maintenance.motivo || 'Sistema en mantenimiento programado.', 
          code: 'MAINTENANCE_ACTIVE',
          traceId 
        });
      }

      // 3. Validar Horarios de Operación
      const scheduleStatus = await operationalControl.checkSchedule(operationType, region);
      if (!scheduleStatus.allowed) {
        // Excepción: Admin puede saltar horario
        if (userRole === 'admin' && isOverride) {
          await operationalControl.logControlAction({
            traceId, userId, operation: operationType, region,
            result: 'override', reason: 'Admin Override Horario'
          });
          return next();
        }

        await operationalControl.logControlAction({
          traceId, userId, operation: operationType, region,
          result: 'bloqueado', reason: scheduleStatus.reason
        });
        return res.status(403).json({ 
          error: scheduleStatus.reason, 
          code: 'OUT_OF_SCHEDULE',
          traceId 
        });
      }

      // Todo OK: Proceder a la lógica de negocio
      req.traceId = traceId;
      req.region = region;
      next();
    } catch (err) {
      logger.error(`[CONTROL-MIDDLEWARE-ERROR]: ${err.message}`, { stack: err.stack });
      next(); // Fallback: permitir para no romper el flujo si el control falla
    }
  };
};
