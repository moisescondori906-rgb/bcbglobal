import { query, transaction } from '../src/config/db.mjs';

async function migrate() {
  console.log('Starting migration: update-withdrawals-bank-accounts');

  await transaction(async (conn) => {
    // 1. Add ultima_rechazo_retiro to usuarios table
    try {
      await conn.query(`ALTER TABLE usuarios ADD COLUMN ultima_rechazo_retiro DATE NULL AFTER recibe_notificaciones`);
      console.log('✓ Added ultima_rechazo_retiro to usuarios');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        throw err;
      }
      console.log('ℹ ultima_rechazo_retiro already exists in usuarios');
    }

    // 2. Add activa column to tarjetas_bancarias if not exists
    try {
      await conn.query(`ALTER TABLE tarjetas_bancarias ADD COLUMN activa TINYINT(1) DEFAULT 1 AFTER nombre_titular`);
      console.log('✓ Added activa to tarjetas_bancarias');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        throw err;
      }
      console.log('ℹ activa already exists in tarjetas_bancarias');
    }

    // 3. Add unique constraint on numero_cuenta (but first check if exists)
    try {
      // Check if index exists
      const [indexes] = await conn.query(`SHOW INDEX FROM tarjetas_bancarias WHERE Key_name = 'idx_numero_cuenta_unico'`);
      if (indexes.length === 0) {
        await conn.query(`ALTER TABLE tarjetas_bancarias ADD UNIQUE KEY idx_numero_cuenta_unico (numero_cuenta)`);
        console.log('✓ Added unique index on numero_cuenta');
      } else {
        console.log('ℹ Unique index on numero_cuenta already exists');
      }
    } catch (err) {
      console.error('Error adding unique index:', err);
    }

    // 4. Modify nombre_banco to ENUM if not already
    try {
      await conn.query(`ALTER TABLE tarjetas_bancarias MODIFY COLUMN nombre_banco ENUM('Yape', 'Yasta', 'Yo Lo Pago', 'Banco Union', 'Mercantil') NOT NULL`);
      console.log('✓ Updated nombre_banco to ENUM with allowed banks');
    } catch (err) {
      console.error('Error modifying nombre_banco to ENUM:', err);
    }
  });

  console.log('✓ Migration completed successfully');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
