import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../../utils/middleware/auth.mjs';
import { attachRequestUser } from '../../utils/middleware/requestContext.mjs';
import { 
  getPremiosRuleta, createSorteoGanador, updateUser, 
  getSorteosGanadores, getPublicContent, addUserEarnings
} from '../../services/dbService.mjs';
import { queryOne, transaction } from '../../config/db.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();

router.get('/config', asyncHandler(async (req, res) => {
  const config = await getPublicContent();
  res.json(config);
}));

router.get('/premios', asyncHandler(async (req, res) => {
  const premios = await getPremiosRuleta();
  res.json(premios);
}));

router.get('/historial', asyncHandler(async (req, res) => {
  const historial = await getSorteosGanadores();
  res.json(historial);
}));

router.post('/girar', authenticate, attachRequestUser, asyncHandler(async (req, res) => {
  const { idempotency_key } = req.body;
  const user = req.requestUser;
  if (!user?.id) return res.status(404).json({ error: 'Usuario no encontrado' });

  // 0. Idempotencia
  if (idempotency_key) {
    const existing = await queryOne('SELECT response_body FROM idempotencia WHERE idempotency_key = ?', [idempotency_key]);
    if (existing) return res.json(JSON.parse(existing.response_body));
  }

  // La ruleta consume 1 TICKET
  if ((Number(user.tickets_ruleta) || 0) < 1) {
    return res.status(400).json({ error: 'No tienes tickets para girar. Invita amigos para obtener tickets en su primer ascenso.' });
  }

  const premios = await getPremiosRuleta();
  if (premios.length === 0) return res.status(400).json({ error: 'No hay premios configurados' });

  // Lógica de probabilidad
  const totalProb = premios.reduce((acc, p) => acc + (Number(p.probabilidad) || 0), 0);
  let random = Math.random() * totalProb;
  let premioGanado = premios[0];

  for (const p of premios) {
    if (random < (Number(p.probabilidad) || 0)) {
      premioGanado = p;
      break;
    }
    random -= (Number(p.probabilidad) || 0);
  }

  // Operación Atómica
  const result = await transaction(async (conn) => {
    // Re-verificar tickets con lock
    const [u] = await conn.query('SELECT tickets_ruleta, saldo_comisiones FROM usuarios WHERE id = ? FOR UPDATE', [user.id]);
    if (!u[0] || Number(u[0].tickets_ruleta) < 1) throw new Error('Tickets insuficientes');

    const newTickets = Number(u[0].tickets_ruleta) - 1;
    const premioValor = Number(premioGanado.valor) || 0;
    const newSaldoComisiones = Number(u[0].saldo_comisiones) + premioValor;

    await conn.query('UPDATE usuarios SET tickets_ruleta = ?, saldo_comisiones = ? WHERE id = ?', [newTickets, newSaldoComisiones, user.id]);

    const registroId = uuidv4();
    await conn.query('INSERT INTO sorteos_ganadores (id, usuario_id, premio_id, monto_ganado) VALUES (?, ?, ?, ?)',
      [registroId, user.id, premioGanado.id, premioValor]);

    // Registrar movimiento
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

  // Registrar ganancia en estadísticas (fuera de la transacción principal para no bloquear)
  addUserEarnings(user.id, Number(premioGanado.valor)).catch(e => logger.error('[RULETA-EARNINGS]', e.message));

  res.json(result);
}));

export default router;
