const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  console.log('[MIGRATION] Iniciando migración de operaciones Telegram...');
  
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('[MIGRATION] Conexión a la base de datos establecida.');
    const dbName = process.env.MYSQL_DATABASE;

    // 1. Crear tabla telegram_casos_bloqueo si no existe
    console.log('[MIGRATION] Verificando tabla telegram_casos_bloqueo...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS telegram_casos_bloqueo (
        referencia_id VARCHAR(36) PRIMARY KEY,
        tipo_operacion VARCHAR(50) NOT NULL,
        estado_operativo VARCHAR(50) DEFAULT 'pendiente',
        tomado_por VARCHAR(100) NULL,
        tomado_por_nombre VARCHAR(255) NULL,
        tomado_por_username VARCHAR(100) NULL,
        telegram_message_id VARCHAR(100) NULL,
        chat_id VARCHAR(100) NULL,
        operador_telegram_id VARCHAR(100) NULL,
        operador_nombre VARCHAR(255) NULL,
        operador_username VARCHAR(100) NULL,
        tomado_at TIMESTAMP NULL,
        resuelto_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_telegram_caso (tipo_operacion, referencia_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[MIGRATION] Tabla telegram_casos_bloqueo verificada/creada.');

    // 2. Agregar columnas a retiros
    console.log('[MIGRATION] Verificando columnas de retiros...');
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

    const [existingRetiros] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'retiros' AND TABLE_SCHEMA = ?
    `, [dbName]);
    const retirosNames = existingRetiros.map(c => c.COLUMN_NAME.toLowerCase());

    for (const col of retirosCols) {
      if (!retirosNames.includes(col.name.toLowerCase())) {
        console.log(`[MIGRATION] Agregando columna ${col.name} a retiros...`);
        await connection.query(`ALTER TABLE retiros ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`[MIGRATION] Columna ${col.name} ya existe en retiros.`);
      }
    }

    // 3. Agregar columnas a compras_nivel
    console.log('[MIGRATION] Verificando columnas de compras_nivel...');
    const recargasCols = [
      { name: 'operador_telegram_id', type: 'VARCHAR(100) NULL' },
      { name: 'operador_nombre', type: 'VARCHAR(255) NULL' },
      { name: 'operador_username', type: 'VARCHAR(100) NULL' },
      { name: 'tomado_en', type: 'DATETIME NULL' },
      { name: 'estado_operativo', type: "VARCHAR(50) DEFAULT 'pendiente'" }
    ];

    const [existingRecargas] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'compras_nivel' AND TABLE_SCHEMA = ?
    `, [dbName]);
    const recargasNames = existingRecargas.map(c => c.COLUMN_NAME.toLowerCase());

    for (const col of recargasCols) {
      if (!recargasNames.includes(col.name.toLowerCase())) {
        console.log(`[MIGRATION] Agregando columna ${col.name} a compras_nivel...`);
        await connection.query(`ALTER TABLE compras_nivel ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`[MIGRATION] Columna ${col.name} ya existe en compras_nivel.`);
      }
    }

    // 4. Crear índices
    console.log('[MIGRATION] Verificando índices...');
    try {
      await connection.query('CREATE INDEX idx_retiros_estado_operativo ON retiros(estado_operativo)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
      console.log('[MIGRATION] Índice idx_retiros_estado_operativo ya existe.');
    }
    try {
      await connection.query('CREATE INDEX idx_retiros_tomado ON retiros(operador_telegram_id)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
      console.log('[MIGRATION] Índice idx_retiros_tomado ya existe.');
    }
    try {
      await connection.query('CREATE INDEX idx_compras_nivel_estado_operativo ON compras_nivel(estado_operativo)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
      console.log('[MIGRATION] Índice idx_compras_nivel_estado_operativo ya existe.');
    }
    try {
      await connection.query('CREATE INDEX idx_compras_nivel_tomado ON compras_nivel(operador_telegram_id)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
      console.log('[MIGRATION] Índice idx_compras_nivel_tomado ya existe.');
    }

    console.log('✅ Migración completada exitosamente!');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION-ERROR] Fallo en la migración:', err);
    await connection.end();
    process.exit(1);
  }
}

runMigration();
