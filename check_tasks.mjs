
import { query } from './backend/src/config/db.mjs';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function check() {
  try {
    const tasks = await query('SELECT id, nombre, activa FROM tareas');
    console.log(`Total tareas en DB: ${tasks.length}`);
    console.log('Detalle:', JSON.stringify(tasks, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
check();
