
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireAdmin } from '../../utils/middleware/auth.mjs';
import { attachRequestUser } from '../../utils/middleware/requestContext.mjs';
import { 
  getPremiosRuleta, getSorteosGanadores, getPublicContent, addUserEarnings, getLevels
} from '../../services/dbService.mjs';
import { query, queryOne, transaction } from '../../config/db.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';
import logger from '../../utils/logger.mjs';

const router = Router();

// ========================
// ENDPOINTS PÚBLICOS/USUARIO
// ========================

router.get('/config', asyncHandler(async (req, res) => {
  const pc = await getPublicContent();
  res.json({
    recompensas_visibles: pc.recompensas_visibles !== false,
    ruleta_activa: pc.ruleta_activa !== false
  });
}));

router.get('/premios', authenticate, attachRequestUser, asyncHandler(async (req, res) => {
  const user = req.requestUser;
  
  // 1. Obtener premios base
  const premiosBase = await query('SELECT * FROM premios_ruleta WHERE activo = 1 ORDER BY orden ASC');
  
  // 2. Obtener configuraciones personalizadas (por usuario o por nivel)
  const [userConfig, levelConfig] = await Promise.all([
    queryOne('SELECT * FROM sorteo_config_personalizada WHERE target_type = "usuario" AND target_id = ? AND activa = 1', [user.id]),
    queryOne('SELECT * FROM sorteo_config_personalizada WHERE target_type = "nivel" AND target_id = ? AND activa = 1', [user.nivel_id])
  ]);

  const config = userConfig || levelConfig;

  // 3. Si hay config personalizada, inyectamos el premio "forzado" o modificamos probabilidades
  let finalPremios = premiosBase;
  if (config && config.premio_id_forzado) {
    // Si hay un premio forzado, le damos 100% de probabilidad internamente (pero enviamos los datos normales al front para no levantar sospechas)
    // El frontend solo los dibuja. La lógica de probabilidad real está en /girar.
  }

  res.json(finalPremios);
}));

router.get('/historial', asyncHandler(async (req, res) => {
  const historial = await getSorteosGanadores();
  res.json(historial);
}));

router.post('/girar', authenticate, attachRequestUser, asyncHandler(async (req, res) => {
  const { idempotency_key } = req.body;
  const user = req.requestUser;
  if (!user?.id) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (idempotency_key) {
    const existing = await queryOne('SELECT response_body FROM idempotencia WHERE idempotency_key = ?', [idempotency_key]);
    if (existing) return res.json(JSON.parse(existing.response_body));
  }

  if ((Number(user.tickets_ruleta) || 0) < 1) {
    return res.status(400).json({ error: 'No tienes tickets para girar.' });
  }

  // LÓGICA DE PREMIO PERSONALIZADO
  const [userConfig, levelConfig] = await Promise.all([
    queryOne('SELECT * FROM sorteo_config_personalizada WHERE target_type = "usuario" AND target_id = ? AND activa = 1', [user.id]),
    queryOne('SELECT * FROM sorteo_config_personalizada WHERE target_type = "nivel" AND target_id = ? AND activa = 1', [user.nivel_id])
  ]);

  const config = userConfig || levelConfig;
  const premios = await getPremiosRuleta();
  if (premios.length === 0) return res.status(400).json({ error: 'No hay premios configurados' });

  let premioGanado;

  // A. Si hay un premio forzado por el admin
  if (config && config.premio_id_forzado) {
    premioGanado = premios.find(p => p.id === config.premio_id_forzado);
  }

  // B. Si no hay forzado, calcular por probabilidad normal
  if (!premioGanado) {
    const totalProb = premios.reduce((acc, p) => acc + (Number(p.probabilidad) || 0), 0);
    let random = Math.random() * totalProb;
    premioGanado = premios[0];

    for (const p of premios) {
      if (random < (Number(p.probabilidad) || 0)) {
        premioGanado = p;
        break;
      }
      random -= (Number(p.probabilidad) || 0);
    }
  }

  // Operación Atómica
  const result = await transaction(async (conn) => {
    const [u] = await conn.query('SELECT tickets_ruleta, saldo_comisiones FROM usuarios WHERE id = ? FOR UPDATE', [user.id]);
    if (!u[0] || Number(u[0].tickets_ruleta) < 1) throw new Error('Tickets insuficientes');

    const newTickets = Number(u[0].tickets_ruleta) - 1;
    const premioValor = Number(premioGanado.valor) || 0;
    const newSaldoComisiones = Number(u[0].saldo_comisiones) + premioValor;

    await conn.query('UPDATE usuarios SET tickets_ruleta = ?, saldo_comisiones = ? WHERE id = ?', [newTickets, newSaldoComisiones, user.id]);

    const registroId = uuidv4();
    await conn.query('INSERT INTO sorteos_ganadores (id, usuario_id, premio_id, monto_ganado) VALUES (?, ?, ?, ?)',
      [registroId, user.id, premioGanado.id, premioValor]);

    await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, descripcion, referencia_id) 
      VALUES (?, ?, 'comisiones', 'premio_ruleta', ?, ?, ?, ?, ?)`,
      [uuidv4(), user.id, premioValor, u[0].saldo_comisiones, newSaldoComisiones, 'Premio ganado en la Ruleta', registroId]);

    const responseBody = {
      ok: true,
      premio: premioGanado,
      nuevo_saldo_comisiones: newSaldoComisiones,
      tickets_restantes: newTickets
    };

    if (idempotency_key) {
      await conn.query('INSERT INTO idempotencia (idempotency_key, response_body, operacion, usuario_id) VALUES (?, ?, ?, ?)',
        [idempotency_key, JSON.stringify(responseBody), 'RULETA_SPIN', user.id]);
    }

    return responseBody;
  });

  addUserEarnings(user.id, Number(premioGanado.valor)).catch(e => logger.error('[RULETA-EARNINGS]', e.message));
  res.json(result);
}));

// ========================
// ENDPOINTS ADMINISTRATIVOS
// ========================

router.get('/admin/config-personalizada', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const configs = await query(`
    SELECT c.*, 
           CASE 
             WHEN c.target_type = 'usuario' THEN u.nombre_usuario 
             WHEN c.target_type = 'nivel' THEN n.nombre 
           END as target_name,
           p.nombre as premio_forzado_nombre
    FROM sorteo_config_personalizada c
    LEFT JOIN usuarios u ON c.target_id = u.id AND c.target_type = 'usuario'
    LEFT JOIN niveles n ON c.target_id = n.id AND c.target_type = 'nivel'
    LEFT JOIN premios_ruleta p ON c.premio_id_forzado = p.id
    ORDER BY c.created_at DESC
  `);
  res.json(configs);
}));

router.post('/admin/config-personalizada', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { target_type, target_id, premio_id_forzado, activa } = req.body;
  const id = uuidv4();
  
  await query(`
    INSERT INTO sorteo_config_personalizada (id, target_type, target_id, premio_id_forzado, activa)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE premio_id_forzado = VALUES(premio_id_forzado), activa = VALUES(activa)
  `, [id, target_type, target_id, premio_id_forzado, activa ? 1 : 0]);
  
  res.json({ ok: true, id });
}));

router.delete('/admin/config-personalizada/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM sorteo_config_personalizada WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

export default router;
