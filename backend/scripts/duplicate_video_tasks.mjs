import 'dotenv/config';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

async function duplicateTasks() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306')
  });

  try {
    console.log('🚀 Iniciando duplicación de tareas de video...');

    // 1. Obtener todas las tareas activas
    const [tasks] = await connection.query('SELECT * FROM tareas WHERE activa = 1');
    console.log(`Encontradas ${tasks.length} tareas activas.`);

    let duplicatedCount = 0;

    for (const task of tasks) {
      // 2. Omitir la tarea "Ferrari Speed" (según el div seleccionado)
      // Buscamos por título o por URL del video
      const isFerrari = task.titulo.toLowerCase().includes('ferrari') || 
                        (task.video_url && task.video_url.includes('ferrari1.mp4'));

      if (isFerrari) {
        console.log(`Omitiendo tarea: ${task.titulo} (ID: ${task.id})`);
        continue;
      }

      // 3. Duplicar la tarea
      const newId = uuidv4();
      const newTitle = `${task.titulo} (Copia)`;
      
      // Insertar copia
      // Asumimos las columnas basadas en el schema y el objeto task
      const columns = Object.keys(task).filter(col => col !== 'id' && col !== 'created_at' && col !== 'updated_at');
      const values = columns.map(col => col === 'titulo' ? newTitle : task[col]);
      
      const query = `INSERT INTO tareas (id, ${columns.join(', ')}) VALUES (?, ${columns.map(() => '?').join(', ')})`;
      await connection.query(query, [newId, ...values]);
      
      duplicatedCount++;
      console.log(`Duplicada tarea: ${task.titulo} -> ${newTitle}`);
    }

    console.log(`✅ Proceso finalizado. Se duplicaron ${duplicatedCount} tareas.`);
  } catch (error) {
    console.error('❌ Error durante la duplicación:', error);
  } finally {
    await connection.end();
  }
}

duplicateTasks();
