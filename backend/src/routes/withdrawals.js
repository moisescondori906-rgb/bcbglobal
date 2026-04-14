import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { 
  getPublicContent, getLevels, boliviaTime, findUserWithAuthSecrets,
  canWithdraw 
} from '../lib/queries.js';
import { query, queryOne, transaction } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { attachRequestUser } from '../middleware/requestContext.js';
import logger from '../lib/logger.js';

const router = Router();

router.use(authenticate);
router.use(attachRequestUser);

const MONTOS_PERMITIDOS = [25, 100, 500, 1500, 5000, 10000];

router.get('/montos', (req, res) => {
  res.json(MONTOS_PERMITIDOS);
});

router.get('/', async (req, res) => {
  try {
    const list = await query(`SELECT * FROM retiros WHERE usuario_id = ? ORDER BY created_at DESC`, [req.user.id]);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tus retiros' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { monto, tipo_billetera, password_fondo, tarjeta_id, qr_retiro, firma_digital } = req.body;
    const user = req.requestUser;

    // 1. Validaciones básicas
    const m = parseFloat(monto);
    if (!MONTOS_PERMITIDOS.includes(m)) return res.status(400).json({ error: 'Monto no permitido' });
    if (!qr_retiro) return res.status(400).json({ error: 'Se requiere el código QR de cobro.' });
    if (!firma_digital) return res.status(400).json({ error: 'La firma digital es obligatoria.' });

    // 2. Verificar contraseña de fondo
    const userAuth = await findUserWithAuthSecrets(user.id);
    if (!userAuth.password_fondo_hash) return res.status(400).json({ error: 'Configura tu contraseña de fondo primero.' });
    const passOk = await bcrypt.compare(password_fondo, userAuth.password_fondo_hash);
    if (!passOk) return res.status(401).json({ error: 'Contraseña de fondo incorrecta.' });

    // 3. VALIDACIÓN CENTRALIZADA (CALENDARIO, DÍAS POR NIVEL & FERIADOS)
    const opStatus = await canWithdraw(user.id);
    if (!opStatus.ok) {
      return res.status(403).json({ error: opStatus.message });
    }

    // 4. Ejecución Transaccional del Retiro
    const result = await transaction(async (conn) => {
      // Bloquear usuario para evitar race conditions de saldo
      const [u] = await conn.query(`SELECT saldo_principal, saldo_comisiones FROM usuarios WHERE id = ? FOR UPDATE`, [user.id]);
      const field = tipo_billetera === 'comisiones' ? 'saldo_comisiones' : 'saldo_principal';
      const saldoActual = Number(u[0][field]);

      if (saldoActual < m) throw new Error('Saldo insuficiente');

      // Calcular comisión (12% por defecto)
      const config = await getPublicContent();
      const pct = parseFloat(config.comision_retiro || 12);
      const comision = Number((m * (pct / 100)).toFixed(2));
      const neto = m - comision;

      const newBalance = saldoActual - m;
      const id = uuidv4();

      // Descontar saldo
      await conn.query(`UPDATE usuarios SET ${field} = ? WHERE id = ?`, [newBalance, user.id]);

      // Asegurar columnas (Intento silencioso por si no existen)
      try {
        await conn.query(`ALTER TABLE retiros ADD COLUMN IF NOT EXISTS qr_retiro LONGTEXT`);
        await conn.query(`ALTER TABLE retiros ADD COLUMN IF NOT EXISTS firma_digital TINYINT(1) DEFAULT 0`);
      } catch (e) { /* Ya existen o no se permite ALTER */ }

      // Crear registro de retiro
      await conn.query(`INSERT INTO retiros (id, usuario_id, monto, monto_neto, comision_aplicada, tipo_billetera, estado, qr_retiro, firma_digital) 
        VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`, [id, user.id, m, neto, comision, tipo_billetera, qr_retiro, firma_digital ? 1 : 0]);

      // Registrar movimiento
      await conn.query(`INSERT INTO movimientos_saldo (id, usuario_id, tipo_billetera, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, referencia_id, descripcion) 
        VALUES (?, ?, ?, 'retiro', ?, ?, ?, ?, ?)`, 
        [uuidv4(), user.id, tipo_billetera, -m, saldoActual, newBalance, id, 'Solicitud de retiro enviada con firma digital']);

      return { id, ok: true };
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
