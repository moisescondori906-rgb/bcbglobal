import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../../config/db.mjs';
import { levels } from './seed.mjs';
import logger from '../../utils/logger.mjs';

/**
 * Script de Seed para Base de Datos v9.1.1
 * Inserta niveles, usuarios iniciales y tareas.
 */
async function seedDatabase() {
  logger.info('🌱 Iniciando Seed de Base de Datos...');

  try {
    await transaction(async (conn) => {
      // 1. Insertar Niveles
      logger.info('[SEED] Insertando niveles...');
      for (const level of levels) {
        await conn.query(`
          INSERT INTO niveles (id, codigo, nombre, deposito, num_tareas_diarias, ganancia_tarea, orden, activo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), deposito=VALUES(deposito)
        `, [level.id, level.codigo, level.nombre, level.deposito, level.num_tareas_diarias, level.ganancia_tarea, level.orden, level.activo]);
      }

      // 2. Insertar Admin por defecto
      logger.info('[SEED] Insertando administrador...');
      const adminPass = await bcrypt.hash('admin123', 10);
      const adminFondo = await bcrypt.hash('123456', 10);
      const adminId = uuidv4();

      await conn.query(`
        INSERT INTO usuarios (id, telefono, nombre_usuario, nombre_real, password_hash, password_fondo_hash, codigo_invitacion, nivel_id, rol, saldo_principal, saldo_comisiones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE telefono=telefono
      `, [adminId, '+59170000000', 'admin', 'Administrador', adminPass, adminFondo, 'ADMIN001', 'l2', 'admin', 0, 0]);

      // 3. Insertar Tareas iniciales
      logger.info('[SEED] Insertando tareas...');
      const tasks = [
        { id: uuidv4(), nombre: 'Adidas Global', video_url: '/video/adidas1.mp4', descripcion: 'Nueva campaña Adidas 2026', pregunta: '¿Qué marca viste?', respuesta_correcta: 'ADIDAS', opciones: 'ADIDAS,NIKE,PUMA,REEBOK', orden: 0 },
        { id: uuidv4(), nombre: 'Coca-Cola Summer', video_url: '/video/cocacola1.mp4', descripcion: 'Refrescante sabor Coca-Cola', pregunta: '¿Qué marca viste?', respuesta_correcta: 'COCACOLA', opciones: 'COCACOLA,PEPSI,SPRITE,FANTA', orden: 1 },
      ];

      for (const task of tasks) {
        await conn.query(`
          INSERT INTO tareas (id, nombre, video_url, descripcion, pregunta, respuesta_correcta, opciones, orden)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)
        `, [task.id, task.nombre, task.video_url, task.descripcion, task.pregunta, task.respuesta_correcta, task.opciones, task.orden]);
      }
    });

    logger.info('✅ Seed completado con éxito.');
    process.exit(0);
  } catch (err) {
    logger.error(`[SEED-ERROR] ${err.message}`);
    process.exit(1);
  }
}

seedDatabase();
