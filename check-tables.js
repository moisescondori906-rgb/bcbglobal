
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'backend', '.env') });

async function checkTables() {
  try {
    console.log('Connecting to DB...');
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('Connected! Checking tables...');

    // Check compras_nivel
    const [comprasCols] = await conn.query('DESCRIBE compras_nivel');
    console.log('--- compras_nivel columns ---');
    console.log(comprasCols);

    // Check retiros
    const [retirosCols] = await conn.query('DESCRIBE retiros');
    console.log('\n--- retiros columns ---');
    console.log(retirosCols);

    // Check telegram_casos_bloqueo
    const [telegramCols] = await conn.query('DESCRIBE telegram_casos_bloqueo');
    console.log('\n--- telegram_casos_bloqueo columns ---');
    console.log(telegramCols);

    await conn.end();
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables();
