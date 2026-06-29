
import { query } from '../src/config/db.mjs';
import { v4_tasks } from '../src/config/data/v4_tasks.mjs';

async function seed() {
  try {
    console.log('🚀 Iniciando seeding forzado de 12 tareas (v11.3.2)...');
    
    // 1. Desactivar TODAS las tareas actuales para empezar de cero visualmente
    await query('UPDATE tareas SET activa = 0');
    console.log('--- Todas las tareas previas marcadas como inactivas ---');

    // 2. Seleccionar 12 tareas variadas de v4_tasks
    // Mezclamos un poco para tener variedad
    const selectedTasks = v4_tasks.slice(0, 12);
    
    for (let i = 0; i < selectedTasks.length; i++) {
      const t = selectedTasks[i];
      // Usamos el nombre como base para el ID para que sea reconocible y persistente
      const id = `video_${t.nombre.toLowerCase().replace(/\s+/g, '_')}`;
      
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
      
      console.log(`✅ Tarea [${i+1}/12] Activada: ${t.nombre} (ID: ${id})`);
    }

    const activeCount = await query('SELECT COUNT(*) as total FROM tareas WHERE activa = 1');
    console.log(`✨ Seeding completado exitosamente. Total tareas activas en DB: ${activeCount[0].total}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error CRÍTICO en seeding:', err);
    process.exit(1);
  }
}

seed();
