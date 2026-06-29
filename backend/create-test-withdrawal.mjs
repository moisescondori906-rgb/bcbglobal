
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from './src/config/db.mjs';
import { peruTime } from './src/services/dbService.mjs';

const TEST_USER_PHONE = '74344916';

async function createTestWithdrawal() {
  try {
    console.log(`🔍 Buscando usuario con teléfono: ${TEST_USER_PHONE}...`);
    const user = await query('SELECT * FROM usuarios WHERE telefono = ?', [TEST_USER_PHONE]);
    
    if (!user || user.length === 0) {
      console.error('❌ Usuario no encontrado.');
      return;
    }

    const userId = user[0].id;
    const userName = user[0].nombre_usuario;
    console.log(`✅ Usuario encontrado: ${userName} (${userId})`);

    const withdrawalId = uuidv4();
    const monto = 20;
    const comision = 2; // 10%
    const montoNeto = monto - comision;

    const datosBancarios = JSON.stringify({
      banco: 'Banco de Prueba',
      numero_cuenta: '1234567890',
      nombre_titular: userName
    });

    const comprobanteUrl = 'https://via.placeholder.com/400x400?text=Comprobante+de+Retiro';

    await transaction(async (conn) => {
      await conn.query(`
        INSERT INTO retiros (
          id, usuario_id, monto, monto_neto, comision_aplicada, 
          tipo_billetera, estado, datos_bancarios, comprobante_url, fecha_dia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        withdrawalId, userId, monto, montoNeto, comision, 
        'principal', 'pendiente', datosBancarios, comprobanteUrl, peruTime.todayStr()
      ]);
    });

    console.log(`
✅ SOLICITUD DE RETIRO CREADA EXITOSAMENTE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 ID del retiro: ${withdrawalId}
🆔 ID corto (para comandos): ${withdrawalId.substring(0, 8)}
👤 Usuario: ${userName} (${TEST_USER_PHONE})
💰 Monto: ${monto} Bs
💸 Comisión (10%): ${comision} Bs
💵 Neto a pagar: ${montoNeto} Bs
📄 Comprobante URL: ${comprobanteUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para probar los comandos:
- Aprobar: ${withdrawalId.substring(0, 8)} apr
- Rechazar: ${withdrawalId.substring(0, 8)} re
`);
  } catch (err) {
    console.error('❌ Error al crear el retiro de prueba:', err.message);
  } finally {
    process.exit();
  }
}

createTestWithdrawal();
