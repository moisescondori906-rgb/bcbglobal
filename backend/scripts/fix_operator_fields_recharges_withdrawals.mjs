import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function runMigration() {
  console.log('[MIGRATION] Iniciando migración de campos de operador para recargas y retiros...');
  
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  const retirosCols = [
    { name: 'operador_telegram_id', type: 'VARCHAR(100) NULL' },
    { name: 'operador_nombre', type: 'VARCHAR(255) NULL' },
    { name: 'operador_username', type: 'VARCHAR(100) NULL' },
    { name: 'tomado_en', type: 'DATETIME NULL' },
    { name: 'estado_operativo', type: "VARCHAR(50) DEFAULT 'pendiente'" },
    { name: 'comision_operador', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'comision_retiro', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'comision_total', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'monto_neto', type: 'DECIMAL(12,2) DEFAULT 0' }
  ];

  const recargasCols = [
    { name: 'operador_telegram_id', type: 'VARCHAR(100) NULL' },
    { name: 'operador_nombre', type: 'VARCHAR(255) NULL' },
    { name: 'operador_username', type: 'VARCHAR(100) NULL' },
    { name: 'tomado_en', type: 'DATETIME NULL' },
    { name: 'estado_operativo', type: "VARCHAR(50) DEFAULT 'pendiente'" }
  ];

  const bloqueoCols = [
    { name: 'operador_telegram_id', type: 'VARCHAR(100) NULL' },
    { name: 'operador_nombre', type: 'VARCHAR(255) NULL' },
    { name: 'operador_username', type: 'VARCHAR(100) NULL' }
  ];

  try {
    const dbName = process.env.MYSQL_DATABASE;
    console.log(`[MIGRATION] Base de datos: ${dbName}`);

    // 1. Migrar RETIROS
    console.log('[MIGRATION] Verificando tabla retiros...');
    const [existingRetiros] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'retiros' AND TABLE_SCHEMA = ?
    `, [dbName]);
    const retirosNames = existingRetiros.map(c => c.COLUMN_NAME.toLowerCase());

    for (const col of retirosCols) {
      if (!retirosNames.includes(col.name.toLowerCase())) {
        console.log(`[MIGRATION] Agregando columna ${col.name} a retiros...`);
        await pool.query(`ALTER TABLE retiros ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`[MIGRATION] Columna ${col.name} ya existe en retiros.`);
      }
    }

    // 2. Migrar COMPRAS_NIVEL
    console.log('[MIGRATION] Verificando tabla compras_nivel...');
    const [existingRecargas] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'compras_nivel' AND TABLE_SCHEMA = ?
    `, [dbName]);
    const recargasNames = existingRecargas.map(c => c.COLUMN_NAME.toLowerCase());

    for (const col of recargasCols) {
      if (!recargasNames.includes(col.name.toLowerCase())) {
        console.log(`[MIGRATION] Agregando columna ${col.name} a compras_nivel...`);
        await pool.query(`ALTER TABLE compras_nivel ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`[MIGRATION] Columna ${col.name} ya existe en compras_nivel.`);
      }
    }

    // 3. Migrar TELEGRAM_CASOS_BLOQUEO
    console.log('[MIGRATION] Verificando tabla telegram_casos_bloqueo...');
    const [existingBloqueo] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'telegram_casos_bloqueo' AND TABLE_SCHEMA = ?
    `, [dbName]);
    const bloqueoNames = existingBloqueo.map(c => c.COLUMN_NAME.toLowerCase());

    for (const col of bloqueoCols) {
      if (!bloqueoNames.includes(col.name.toLowerCase())) {
        console.log(`[MIGRATION] Agregando columna ${col.name} a telegram_casos_bloqueo...`);
        await pool.query(`ALTER TABLE telegram_casos_bloqueo ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`[MIGRATION] Columna ${col.name} ya existe en telegram_casos_bloqueo.`);
      }
    }

    console.log('[MIGRATION] Migración completada exitosamente.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(`[MIGRATION-ERROR] Fallo en la migración: ${err.message}`);
    process.exit(1);
  }
}

runMigration();
