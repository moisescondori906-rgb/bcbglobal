import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  getLevels, getTasks, getTaskById, completeTask,
  boliviaTime, canPerformTasks 
} from '../../services/dbService.mjs';
import { authenticate } from '../../utils/middleware/auth.mjs';
import { attachRequestUser, DEMO_USER_ID } from '../../utils/middleware/requestContext.mjs';
import { dynamicControlMiddleware } from '../../utils/middleware/dynamicControl.mjs';
import { query } from '../../config/db.mjs';
import logger from '../../utils/logger.mjs';
import redis from '../../services/redisService.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();

// Rate Limit Config: 10 acciones por minuto por usuario
const TASK_RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW = 60; // segundos

router.use(authenticate);
router.use(attachRequestUser);

/**
 * Middleware de Rate Limit Anti-Spam (Gamificación Segura)
 */
const taskRateLimit = async (req, res, next) => {
  const userId = req.requestUser?.id;
  if (!userId || userId === DEMO_USER_ID) return next();

  const key = `ratelimit:tasks:${userId}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, RATE_LIMIT_WINDOW);
    
    if (current > TASK_RATE_LIMIT) {
      logger.warn(`[RATE-LIMIT] Usuario ${userId} excedió límite de tareas: ${current}/${TASK_RATE_LIMIT}`);
      return res.status(429).json({ 
        error: 'Demasiadas peticiones. Por favor, espera un minuto.',
        code: 'RATE_LIMIT_EXCEEDED' 
      });
    }
    next();
  } catch (err) {
    logger.error(`[RATE-LIMIT-ERROR]: ${err.message}`);
    next(); // Fallback: permitir si Redis falla para no bloquear el negocio
  }
};

router.get('/', dynamicControlMiddleware('task_list'), asyncHandler(async (req, res) => {
  const user = req.requestUser;
  if (!user?.id) return res.status(404).json({ error: 'Usuario no encontrado' });

  // MODO DEMO: Bypass si el ID es el de demo
  if (user.id === DEMO_USER_ID) {
    const levels = await getLevels();
    // El modo demo representa GLOBAL 1 (l2 en seed.js por defecto)
    const level = levels.find(l => String(l.codigo) === 'global1') || levels[1] || { nombre: 'GLOBAL 1', ganancia_tarea: 1.80, num_tareas_diarias: 4 };
    
    const numTareasDiarias = Number(level.num_tareas_diarias);
    const reward = Number(level.ganancia_tarea);
    const totalDaily = Number((numTareasDiarias * reward).toFixed(2));
    
    return res.json({
      nivel: level.nombre,
      tareas_restantes: numTareasDiarias,
      tareas_completadas: 0,
      num_tareas_diarias: numTareasDiarias,
      ingreso_diario: totalDaily,
      ganancia_tarea: reward,
      tareas: [
        { id: 't1', nombre: 'Tarea Demo 1', ganancia_tarea: reward, video_url: '/video/adidas1.mp4', descripcion: 'Visualización demo', pregunta: '¿Marca?', opciones: ['ADIDAS', 'NIKE'], respuesta_correcta: 'ADIDAS' },
        { id: 't2', nombre: 'Tarea Demo 2', ganancia_tarea: reward, video_url: '/video/nike1.mp4', descripcion: 'Visualización demo', pregunta: '¿Marca?', opciones: ['ADIDAS', 'NIKE'], respuesta_correcta: 'NIKE' }
      ]
    });
  }

  // 1. VALIDACIÓN CENTRALIZADA (CALENDARIO & FERIADOS)
  const opStatus = await canPerformTasks(user.id);
  if (!opStatus.ok) {
    return res.status(403).json({ error: opStatus.message });
  }

  const levels = await getLevels();
  const level = levels.find(l => String(l.id) === String(user.nivel_id));
  if (!level) return res.status(400).json({ error: 'Nivel inválido' });

  // Obtener contador de tareas completadas hoy mediante query directa
  const todayStr = boliviaTime.todayStr();
  const countResult = await query(`SELECT COUNT(*) as total FROM actividad_tareas WHERE usuario_id = ? AND fecha_dia = ?`, [user.id, todayStr]);
  const todayCompletedCount = countResult[0]?.total || 0;

  const numTareasDiarias = Number(level.num_tareas_diarias);
  const remaining = Math.max(0, numTareasDiarias - todayCompletedCount);
  
  logger.info(`[TASKS-DEBUG] User: ${user.nombre_usuario} (${user.id}), Level: ${level.nombre}, Diarias: ${numTareasDiarias}, Completadas: ${todayCompletedCount}, Restantes: ${remaining}`);

  let availableTasks = [];
  // 1. Obtener TODAS las tareas activas sin filtros (v11.3.0)
  const allTasks = await getTasks();
  logger.info(`[TASKS-DEBUG] User: ${user.nombre_usuario}, Level: ${level.nombre}, Diarias: ${numTareasDiarias}, Completadas: ${todayCompletedCount}, Restantes: ${remaining}, Total en Sistema: ${allTasks.length}`);
  
  // 2. Mostrar todas las tareas disponibles para que el usuario elija (Se pueden repetir)
  availableTasks = allTasks;

  res.json({
    nivel: level.nombre,
    tareas_restantes: remaining,
    tareas_completadas: todayCompletedCount,
    num_tareas_diarias: numTareasDiarias,
    ingreso_diario: level.ingreso_diario,
    ganancia_tarea: level.ganancia_tarea,
    tareas: availableTasks.map(t => ({
      id: t.id,
      nombre: t.nombre,
      ganancia_tarea: Number(level.ganancia_tarea), // El premio siempre depende del nivel del usuario
      video_url: t.video_url,
      descripcion: t.descripcion
    }))
  });
}));

router.post('/:id/responder', taskRateLimit, dynamicControlMiddleware('task_complete'), asyncHandler(async (req, res) => {
  const { idempotency_key } = req.body;
  const user = req.requestUser;
  if (!user?.id) return res.status(404).json({ error: 'Usuario no encontrado' });

  // 0. Idempotencia Preventiva (Header o Body)
  const iKey = idempotency_key || req.headers['x-idempotency-key'];
  if (!iKey) {
    return res.status(400).json({ error: 'Falta clave de idempotencia (idempotency_key)' });
  }

  // 1. VALIDACIÓN CENTRALIZADA (CALENDARIO & FERIADOS)
  const opStatus = await canPerformTasks(user.id);
  if (!opStatus.ok) {
    return res.status(403).json({ error: opStatus.message });
  }

  const task = await getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
  
  // Validar que la tarea esté activa (Gamificación Segura)
  if (task.activa === 0 || task.activa === false) {
    return res.status(400).json({ error: 'Esta tarea ya no está disponible.' });
  }

  // Acreditación Transaccional e Idempotente
  if (user.id === DEMO_USER_ID) {
    return res.json({ success: true, monto: 1.80 });
  }
  
  const result = await completeTask(user.id, task.id, iKey);
  
  res.json({ success: true, monto: result.amount, trace_id: result.traceId });
}));

export default router;
