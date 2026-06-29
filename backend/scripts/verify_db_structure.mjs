import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log(`Checking table structures for: ${process.env.MYSQL_DATABASE}`);
    
    const [retiros] = await pool.query("SHOW COLUMNS FROM retiros");
    console.log("\n--- RETIROS COLUMNS ---");
    console.table(retiros.map(c => ({ Field: c.Field, Type: c.Type })));

    const [recargas] = await pool.query("SHOW COLUMNS FROM compras_nivel");
    console.log("\n--- COMPRAS_NIVEL COLUMNS ---");
    console.table(recargas.map(c => ({ Field: c.Field, Type: c.Type })));

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
