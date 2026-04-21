
import { query } from '../src/config/db.mjs';
import { v4 as uuidv4 } from 'uuid';
import { v4_tasks } from '../src/config/data/v4_tasks.mjs';

async function seed() {
  try {
    console.log('🚀 Iniciando seeding de 12 tareas...');
    
    // 1. Obtener las primeras 12 tareas de v4_tasks
    const selectedTasks = v4_tasks.slice(0, 12);
    
    // 2. Limpiar tareas actuales (Opcional, pero asegura que tengamos exactamente 12)
    // await query('DELETE FROM actividad_tareas'); // No borrar actividad para no afectar saldos
    // await query('DELETE FROM tareas');
    
    for (let i = 0; i < selectedTasks.length; i++) {
      const t = selectedTasks[i];
      const id = `task_v11_${i + 1}`; // ID determinístico para evitar duplicados si se corre varias veces
      
      await query(`
        INSERT INTO tareas (id, nombre, video_url, descripcion, pregunta, respuesta_correcta, opciones, orden, activa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE 
          nombre = VALUES(nombre),
          video_url = VALUES(video_url),
          descripcion = VALUES(descripcion),
          activa = 1,
          orden = VALUES(orden)
      `, [
        id, 
        t.nombre, 
        t.video_url, 
        t.descripcion, 
        t.pregunta, 
        t.respuesta_correcta, 
        JSON.stringify(t.opciones), 
        i,
      ]);
      
      console.log(`✅ Tarea sincronizada: ${t.nombre}`);
    }

    // 3. Activar cualquier otra tarea que haya quedado por ahí
    await query('UPDATE tareas SET activa = 1');
    
    const count = await query('SELECT COUNT(*) as total FROM tareas WHERE activa = 1');
    console.log(`✨ Seeding completado. Total tareas activas: ${count[0].total}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seeding:', err);
    process.exit(1);
  }
}

seed();
