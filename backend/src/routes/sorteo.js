import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { attachRequestUser } from '../middleware/requestContext.js';
import { getPremiosRuleta, createSorteoGanador, updateUser, getSorteosGanadores, isUserPunished } from '../lib/queries.js';

const router = Router();

router.get('/config', async (req, res) => {
  try {
    const { getPublicContent } = await import('../lib/queries.js');
    const config = await getPublicContent();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener config' });
  }
});

router.get('/premios', async (req, res) => {
  try {
    const premios = await getPremiosRuleta();
    res.json(premios);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener premios' });
  }
});

router.get('/historial', async (req, res) => {
  try {
    const historial = await getSorteosGanadores();
    res.json(historial);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

router.post('/girar', authenticate, attachRequestUser, async (req, res) => {
  try {
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
    const { addUserEarnings } = await import('../lib/queries.js');
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

  } catch (err) {
    console.error('[Sorteo] Error al girar:', err);
    res.status(500).json({ error: 'Error al procesar el sorteo' });
  }
});

export default router;
