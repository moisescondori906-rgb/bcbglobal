const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('[MIGRATION] Iniciando migración de operaciones Telegram...');
  
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: true
  });

  try {
    console.log('[MIGRATION] Conexión a la base de datos establecida.');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../migrations/021_complete_telegram_operations_fix.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('[MIGRATION] Ejecutando script SQL...');
    await connection.query(sql);
    
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
