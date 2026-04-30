import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const levels = [
  { id: 'l1', codigo: 'internar', nombre: 'Internar', deposito: 0, num_tareas_diarias: 3, ganancia_tarea: 1.00, orden: 0, activo: 1 },
  { id: 'l2', codigo: 'global1', nombre: 'GLOBAL 1', deposito: 230.00, num_tareas_diarias: 4, ganancia_tarea: 1.80, orden: 1, activo: 1 },
  { id: 'l3', codigo: 'global2', nombre: 'GLOBAL 2', deposito: 780.00, num_tareas_diarias: 8, ganancia_tarea: 3.22, orden: 2, activo: 1 },
  { id: 'l4', codigo: 'global3', nombre: 'GLOBAL 3', deposito: 2900.00, num_tareas_diarias: 15, ganancia_tarea: 6.76, orden: 3, activo: 1 },
  { id: 'l5', codigo: 'global4', nombre: 'GLOBAL 4', deposito: 9200.00, num_tareas_diarias: 30, ganancia_tarea: 11.33, orden: 4, activo: 1 },
  { id: 'l6', codigo: 'global5', nombre: 'GLOBAL 5', deposito: 28200.00, num_tareas_diarias: 60, ganancia_tarea: 17.43, orden: 5, activo: 1 },
  { id: 'l7', codigo: 'global6', nombre: 'GLOBAL 6', deposito: 58000.00, num_tareas_diarias: 100, ganancia_tarea: 22.35, orden: 6, activo: 1 },
  { id: 'l8', codigo: 'global7', nombre: 'GLOBAL 7', deposito: 124000.00, num_tareas_diarias: 160, ganancia_tarea: 31.01, orden: 7, activo: 1 },
  { id: 'l9', codigo: 'global8', nombre: 'GLOBAL 8', deposito: 299400.00, num_tareas_diarias: 250, ganancia_tarea: 47.91, orden: 8, activo: 1 },
  { id: 'l10', codigo: 'global9', nombre: 'GLOBAL 9', deposito: 541600.00, num_tareas_diarias: 400, ganancia_tarea: 58.87, orden: 9, activo: 1 },
];

async function syncLevels() {
  console.log('🚀 Iniciando sincronización de Niveles Oficiales...');
  
  const connectionConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'bcb_global'
  };

  try {
    const conn = await mysql.createConnection(connectionConfig);
    console.log('🟢 Conexión a MySQL exitosa.');

    for (const level of levels) {
      console.log(`Updating level: ${level.nombre} (${level.codigo})...`);
      
      const sql = `
        INSERT INTO niveles (id, codigo, nombre, deposito, num_tareas_diarias, ganancia_tarea, orden, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nombre = VALUES(nombre),
          deposito = VALUES(deposito),
          num_tareas_diarias = VALUES(num_tareas_diarias),
          ganancia_tarea = VALUES(ganancia_tarea),
          orden = VALUES(orden),
          activo = VALUES(activo)
      `;
      
      await conn.execute(sql, [
        level.id, 
        level.codigo, 
        level.nombre, 
        level.deposito, 
        level.num_tareas_diarias, 
        level.ganancia_tarea, 
        level.orden, 
        level.activo
      ]);
    }

    console.log('🎉 Sincronización de niveles COMPLETADA.');
    await conn.end();
  } catch (err) {
    console.error('❌ Error fatal:', err.message);
  }
}

syncLevels();
