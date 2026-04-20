import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../../utils/middleware/auth.mjs';
import { attachRequestUser } from '../../utils/middleware/requestContext.mjs';
import { 
  getPremiosRuleta, createSorteoGanador, updateUser, 
  getSorteosGanadores, getPublicContent, addUserEarnings 
} from '../../services/dbService.mjs';
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
  const user = req.requestUser;
  if (!user?.id) return res.status(404).json({ error: 'Usuario no encontrado' });

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

  // Consumir 1 ticket y otorgar premio
  const updates = {
    tickets_ruleta: (Number(user.tickets_ruleta) || 1) - 1,
    saldo_comisiones: (Number(user.saldo_comisiones) || 0) + (Number(premioGanado.valor) || 0)
  };

  await updateUser(user.id, updates);

  // Registrar ganancia de ruleta en estadísticas persistentes
  await addUserEarnings(user.id, Number(premioGanado.valor));

  // Registrar ganador
  const registro = {
    id: uuidv4(),
    usuario_id: user.id,
    premio_id: premioGanado.id,
    monto: premioGanado.valor,
    created_at: new Date().toISOString()
  };
  await createSorteoGanador(registro);

  res.json({
    ok: true,
    premio: premioGanado,
    nuevo_saldo_comisiones: updates.saldo_comisiones,
    tickets_restantes: updates.tickets_ruleta
  });
}));

export default router;
