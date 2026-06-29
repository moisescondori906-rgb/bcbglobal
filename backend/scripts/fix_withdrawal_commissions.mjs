import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function runMigration() {
  console.log('[MIGRATION] Iniciando migración de columnas de comisiones para retiros...');
  
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  const columnsToAdd = [
    { name: 'comision_operador', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'comision_retiro', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'comision_total', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'monto_neto', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'operador_telegram_id', type: 'VARCHAR(100) NULL' },
    { name: 'operador_nombre', type: 'VARCHAR(255) NULL' }
  ];

  try {
    const [existingColumns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'retiros' AND TABLE_SCHEMA = ?
    `, [process.env.MYSQL_DATABASE]);
    
    const existingColumnNames = existingColumns.map(c => c.COLUMN_NAME.toLowerCase());

    for (const col of columnsToAdd) {
      if (!existingColumnNames.includes(col.name.toLowerCase())) {
        console.log(`[MIGRATION] Agregando columna ${col.name}...`);
        await pool.query(`ALTER TABLE retiros ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`[MIGRATION] La columna ${col.name} ya existe.`);
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
