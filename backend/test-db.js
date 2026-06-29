import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Testing connection to:', process.env.MYSQL_HOST);
  try {
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    });
    console.log('Success!');
    await conn.end();
  } catch (e) {
    console.error('Connection failed:', e.message);
  }
}
test();
