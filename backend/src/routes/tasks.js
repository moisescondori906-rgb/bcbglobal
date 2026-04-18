import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  getLevels, getTasks, getTaskById, completeTask,
  boliviaTime, canPerformTasks 
} from '../lib/queries.js';
import { authenticate } from '../middleware/auth.js';
import { attachRequestUser, DEMO_USER_ID } from '../middleware/requestContext.js';
import { query } from '../config/db.js';
import logger from '../lib/logger.js';
import redis from '../services/redisService.js';

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

router.get('/', async (req, res) => {
  try {
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
    
    let availableTasks = [];
    if (remaining > 0) {
      const allTasks = await getTasks();
      // Mezclamos tareas de forma aleatoria para que no sean siempre las mismas
      availableTasks = allTasks.sort(() => 0.5 - Math.random()).slice(0, Math.min(allTasks.length, remaining + 2));
    }

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
        ganancia_tarea: Number(level.ganancia_tarea),
        video_url: t.video_url,
        descripcion: t.descripcion,
        pregunta: t.pregunta,
        opciones: typeof t.opciones === 'string' ? JSON.parse(t.opciones) : t.opciones
      }))
    });
  } catch (err) {
    logger.error('[Tasks] GET /:', err);
    res.status(500).json({ error: 'Error al cargar tareas' });
  }
});

router.post('/:id/responder', taskRateLimit, async (req, res) => {
  try {
    const { respuesta, idempotency_key } = req.body;
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
    if (task.activo === 0 || task.activo === false) {
      return res.status(400).json({ error: 'Esta tarea ya no está disponible.' });
    }

    // Validar respuesta (Normalización básica)
    const normalize = (s) => String(s || '').trim().toUpperCase();
    if (normalize(respuesta) !== normalize(task.respuesta_correcta)) {
      return res.status(400).json({ error: 'Respuesta incorrecta' });
    }

    // Acreditación Transaccional e Idempotente
    if (user.id === DEMO_USER_ID) {
      return res.json({ success: true, monto: 1.80 });
    }
    
    const result = await completeTask(user.id, task.id, iKey);
    
    res.json({ success: true, monto: result.amount, trace_id: result.traceId });
  } catch (err) {
    if (err.message === 'Tarea ya completada hoy' || err.message === 'Has alcanzado tu límite de tareas diarias para tu nivel.') {
      return res.status(400).json({ error: err.message });
    }
    logger.error('[Tasks] responder:', err);
    res.status(500).json({ error: 'Error al procesar tarea' });
  }
});

export default router;
