import { query } from '../src/config/db.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const newLevels = [
  { codigo: 'internar', deposito: 0, num_tareas_diarias: 3, ganancia_tarea: 1.00 },
  { codigo: 'global1', deposito: 115.00, num_tareas_diarias: 4, ganancia_tarea: 1.00 },
  { codigo: 'global2', deposito: 390.00, num_tareas_diarias: 8, ganancia_tarea: 1.625 },
  { codigo: 'global3', deposito: 1450.00, num_tareas_diarias: 15, ganancia_tarea: 3.40 },
  { codigo: 'global4', deposito: 4600.00, num_tareas_diarias: 30, ganancia_tarea: 5.6667 },
  { codigo: 'global5', deposito: 14100.00, num_tareas_diarias: 60, ganancia_tarea: 8.7167 },
  { codigo: 'global6', deposito: 29000.00, num_tareas_diarias: 100, ganancia_tarea: 11.18 },
  { codigo: 'global7', deposito: 62000.00, num_tareas_diarias: 160, ganancia_tarea: 15.5063 },
  { codigo: 'global8', deposito: 149700.00, num_tareas_diarias: 250, ganancia_tarea: 23.956 },
  { codigo: 'global9', deposito: 270800.00, num_tareas_diarias: 400, ganancia_tarea: 29.435 },
];

async function migrate() {
  try {
    console.log('Iniciando actualización de niveles...');
    for (const level of newLevels) {
      const result = await query(
        `UPDATE niveles 
         SET deposito = ?, num_tareas_diarias = ?, ganancia_tarea = ? 
         WHERE codigo = ?`,
        [level.deposito, level.num_tareas_diarias, level.ganancia_tarea, level.codigo]
      );
      console.log(`Nivel ${level.codigo} actualizado. Filas afectadas: ${result.affectedRows}`);
    }
    console.log('Migración completada con éxito.');
    process.exit(0);
  } catch (err) {
    console.error('Error en la migración:', err);
    process.exit(1);
  }
}

migrate();
