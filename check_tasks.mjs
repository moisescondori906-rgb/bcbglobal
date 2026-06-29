
import { query } from './backend/src/config/db.mjs';
import fs from 'fs';
import path from 'path';

// Cargar .env manualmente si dotenv no está en el root
const envPath = path.resolve('./backend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

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
