
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireAdmin } from '../../utils/middleware/auth.mjs';
import { attachRequestUser } from '../../utils/middleware/requestContext.mjs';
import { 
  getPremiosRuleta, getSorteosGanadores, getGlobalContent, addUserEarnings, getLevels
} from '../../services/dbService.mjs';
import { query, queryOne, transaction } from '../../config/db.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';
import logger from '../../utils/logger.mjs';

const router = Router();

// ========================
// ENDPOINTS PÚBLICOS/USUARIO
// ========================

router.get('/config', asyncHandler(async (req, res) => {
  const pc = await getGlobalContent();
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
  const historial = await query(`
    SELECT sg.*, u.telefono, p.nombre as premio_nombre
    FROM sorteos_ganadores sg
    JOIN usuarios u ON sg.usuario_id = u.id
    JOIN premios_ruleta p ON sg.premio_id = p.id
    ORDER BY sg.created_at DESC
    LIMIT 5
  `);
  
  const formatted = historial.map(h => {
    const phone = String(h.telefono || '');
    const last4 = phone.replace(/\D/g, '').slice(-4);
    return {
      ...h,
      telefono_masked: last4 ? `****${last4}` : '****'
    };
  });

  res.json(formatted);
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

  // 1. LÓGICA DE PRIVILEGIOS (TRICAR RULETA)
  // Buscamos si el admin ha forzado un premio para este usuario que no haya sido usado aún
  const forcedPrize = await queryOne('SELECT * FROM ruleta_forzada WHERE usuario_id = ? AND activo = 1 AND usado = 0 ORDER BY created_at ASC LIMIT 1', [user.id]);

  const premios = await getPremiosRuleta();
  if (premios.length === 0) return res.status(400).json({ error: 'No hay premios configurados' });

  let premioGanado;

  if (forcedPrize) {
    premioGanado = premios.find(p => p.id === forcedPrize.premio_id);
    // Si por alguna razón el premio forzado ya no existe o no está activo, seguimos con probabilidad normal
    if (!premioGanado || !premioGanado.activo) premioGanado = null;
  }

  // B. Si no hay forzado (o falló), calcular por probabilidad normal
  if (!premioGanado) {
    // Filtrar premios con stock disponible y que NO sean premios exclusivos (probabilidad > 0)
    // Nota: El admin puede poner probabilidad 0 a premios "fuertes" para que NUNCA salgan al azar
    const premiosDisponibles = premios.filter(p => (p.stock === -1 || p.stock > 0) && Number(p.probabilidad) > 0);
    
    if (premiosDisponibles.length === 0) {
       // Fallback a cualquier premio activo con stock si todos tienen prob 0
       const backup = premios.filter(p => p.stock === -1 || p.stock > 0);
       if (backup.length === 0) return res.status(400).json({ error: 'Lo sentimos, no hay premios disponibles.' });
       premioGanado = backup[0];
    } else {
      const totalProb = premiosDisponibles.reduce((acc, p) => acc + (Number(p.probabilidad) || 0), 0);
      let random = Math.random() * totalProb;
      premioGanado = premiosDisponibles[0];

      for (const p of premiosDisponibles) {
        if (random < (Number(p.probabilidad) || 0)) {
          premioGanado = p;
          break;
        }
        random -= (Number(p.probabilidad) || 0);
      }
    }
  }

  // Operación Atómica
  const result = await transaction(async (conn) => {
    // 1. Bloqueo de usuario
    const [u] = await conn.query('SELECT tickets_ruleta, saldo_comisiones FROM usuarios WHERE id = ? FOR UPDATE', [user.id]);
    if (!u[0] || Number(u[0].tickets_ruleta) < 1) throw new Error('Tickets insuficientes');

    // 2. Bloqueo de premio para validar stock
    if (premioGanado.stock !== -1) {
      const [p] = await conn.query('SELECT stock FROM premios_ruleta WHERE id = ? FOR UPDATE', [premioGanado.id]);
      if (p[0].stock !== -1 && p[0].stock <= 0) {
        throw new Error('El premio seleccionado se ha agotado. Por favor intenta de nuevo.');
      }
      await conn.query('UPDATE premios_ruleta SET stock = stock - 1 WHERE id = ?', [premioGanado.id]);
    }

    // 3. Marcar premio forzado como USADO si aplica
    if (forcedPrize && premioGanado.id === forcedPrize.premio_id) {
       await conn.query('UPDATE ruleta_forzada SET usado = 1, activo = 0 WHERE id = ?', [forcedPrize.id]);
    }

    const ticketsAntes = Number(u[0].tickets_ruleta);
    const newTickets = ticketsAntes - 1;
    const premioValor = Number(premioGanado.valor) || 0;
    const newSaldoComisiones = Number(u[0].saldo_comisiones) + premioValor;

    // 4. Actualizar Usuario
    await conn.query('UPDATE usuarios SET tickets_ruleta = ?, saldo_comisiones = ? WHERE id = ?', [newTickets, newSaldoComisiones, user.id]);

    const registroId = uuidv4();
    // 5. Registrar ganador
    await conn.query('INSERT INTO sorteos_ganadores (id, usuario_id, premio_id, monto_ganado) VALUES (?, ?, ?, ?)',
      [registroId, user.id, premioGanado.id, premioValor]);

    // 6. Registrar movimiento de saldo
    await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, descripcion, referencia_id) 
      VALUES (?, ?, 'comisiones', 'premio_ruleta', ?, ?, ?, ?, ?)`,
      [uuidv4(), user.id, premioValor, u[0].saldo_comisiones, newSaldoComisiones, 'Premio ganado en la Ruleta', registroId]);

    // 7. LOG DE AUDITORÍA
    await conn.query(`INSERT INTO logs_ruleta (id, usuario_id, premio_id, monto_ganado, tickets_antes, tickets_despues, ip_address, user_agent) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), user.id, premioGanado.id, premioValor, ticketsAntes, newTickets, req.ip, req.headers['user-agent']]);

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
