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
      const titulo = task.titulo || task.nombre || '';
      const videoUrl = task.video_url || task.url || '';
      
      const isFerrari = titulo.toLowerCase().includes('ferrari') || 
                        videoUrl.includes('ferrari1.mp4');

      if (isFerrari) {
        console.log(`Omitiendo tarea: ${titulo} (ID: ${task.id})`);
        continue;
      }

      // 3. Duplicar la tarea
      const newId = uuidv4();
      const newTitle = titulo ? `${titulo} (Copia)` : 'Tarea Duplicada';
      
      // Filtrar columnas para la inserción
      const columns = Object.keys(task).filter(col => col !== 'id' && col !== 'created_at' && col !== 'updated_at');
      const values = columns.map(col => {
        if (col === 'titulo') return newTitle;
        if (col === 'nombre') return newTitle;
        return task[col];
      });
      
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO tareas (id, ${columns.join(', ')}) VALUES (?, ${placeholders})`;
      
      await connection.query(sql, [newId, ...values]);
      
      duplicatedCount++;
      console.log(`Duplicada tarea: ${titulo} -> ${newTitle}`);
    }

    console.log(`✅ Proceso finalizado. Se duplicaron ${duplicatedCount} tareas.`);
  } catch (error) {
    console.error('❌ Error durante la duplicación:', error);
  } finally {
    await connection.end();
  }
}

duplicateTasks();
