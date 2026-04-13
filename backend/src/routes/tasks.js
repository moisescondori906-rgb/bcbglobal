import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  getLevels, getTasks, getTaskById, completeTask,
  boliviaTime, isUserPunished, getPublicContent 
} from '../lib/queries.js';
import { authenticate } from '../middleware/auth.js';
import { attachRequestUser, DEMO_USER_ID } from '../middleware/requestContext.js';
import { query } from '../config/db.js';
import logger from '../lib/logger.js';

const router = Router();

router.use(authenticate);
router.use(attachRequestUser);

router.get('/', async (req, res) => {
  try {
    const user = req.requestUser;
    if (!user?.id) return res.status(404).json({ error: 'Usuario no encontrado' });

    // MODO DEMO: Bypass si el ID es el de demo
    if (user.id === DEMO_USER_ID) {
      return res.json({
        nivel: 'Global 1',
        tareas_restantes: 4,
        tareas_completadas: 0,
        tareas: [
          { id: 't1', nombre: 'Tarea Demo 1', recompensa: 1.80, video_url: '/video/adidas1.mp4', descripcion: 'Visualización demo', pregunta: '¿Marca?', opciones: ['A', 'B'] },
          { id: 't2', nombre: 'Tarea Demo 2', recompensa: 1.80, video_url: '/video/nike1.mp4', descripcion: 'Visualización demo', pregunta: '¿Marca?', opciones: ['A', 'B'] }
        ]
      });
    }

    // VERIFICAR CASTIGO
    const castigado = await isUserPunished(user.id).catch(() => false);
    if (castigado) {
      return res.status(403).json({ 
        error: 'Tu acceso a tareas ha sido bloqueado por hoy como castigo.',
        castigado: true
      });
    }

    const config = await getPublicContent();
    const allowedDays = (config.task_allowed_days || '1,2,3,4,5').split(',').map(Number);
    const day = boliviaTime.getDay();
    const isWeekend = day === 0 || day === 6;
    const isDayAllowed = allowedDays.includes(day);
    const hasUserException = user.allow_weekend_tasks === true;

    if (!isDayAllowed && !(isWeekend && hasUserException)) {
      return res.status(403).json({ error: 'Tareas no disponibles hoy.' });
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
      availableTasks = allTasks.slice(0, remaining + 3);
    }

    res.json({
      nivel: level.nombre,
      tareas_restantes: remaining,
      tareas_completadas: todayCompletedCount,
      tareas: availableTasks.map(t => ({
        id: t.id,
        nombre: t.nombre,
        ganancia_tarea: Number(level.ganancia_tarea), // Campo unificado
        video_url: t.video_url,
        descripcion: t.descripcion,
        pregunta: t.pregunta,
        opciones: t.opciones
      }))
    });
  } catch (err) {
    logger.error('[Tasks] GET /:', err);
    res.status(500).json({ error: 'Error al cargar tareas' });
  }
});

router.post('/:id/responder', async (req, res) => {
  try {
    const { respuesta } = req.body;
    const user = req.requestUser;
    if (!user?.id) return res.status(404).json({ error: 'Usuario no encontrado' });

    const task = await getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

    // Validar respuesta (Normalización básica)
    const normalize = (s) => String(s || '').trim().toUpperCase();
    if (normalize(respuesta) !== normalize(task.respuesta_correcta)) {
      return res.status(400).json({ error: 'Respuesta incorrecta' });
    }

    // Acreditación Transaccional e Idempotente
    const result = await completeTask(user.id, task.id);
    
    // Distribuir comisiones de red en segundo plano (No bloquea la respuesta al usuario)
    const { distributeTaskCommissions } = await import('../lib/queries.js');
    distributeTaskCommissions(user.id, result.amount).catch(err => {
      logger.error(`[Tasks] Error distribuyendo comisiones: ${err.message}`);
    });

    res.json({ 
      success: true, 
      mensaje: 'Tarea completada con éxito',
      monto: result.amount
    });
  } catch (err) {
    if (err.message === 'Tarea ya completada hoy' || err.message === 'Límite de tareas diarias alcanzado') {
      return res.status(400).json({ error: err.message });
    }
    logger.error('[Tasks] responder:', err);
    res.status(500).json({ error: 'Error al procesar tarea' });
  }
});

export default router;
