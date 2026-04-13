import { query, transaction } from '../config/db.js';
import { initStore } from './seed.js';
import logger from '../lib/logger.js';

/**
 * Script de migración de datos iniciales a MySQL
 * Ejecutar con: node src/data/migrate.js
 */
async function migrate() {
  logger.info('🚀 Iniciando migración a MySQL...');

  try {
    const data = await initStore();

    await transaction(async (conn) => {
      // 1. Limpiar tablas (Opcional, solo para seed limpio)
      // await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      // await conn.query('TRUNCATE TABLE usuarios'); ...
      // await conn.query('SET FOREIGN_KEY_CHECKS = 1');

      // 2. Migrar Niveles
      logger.info('Migrando niveles...');
      for (const level of data.levels) {
        await conn.query(`
          INSERT INTO niveles (id, codigo, nombre, deposito, ganancia_tarea, num_tareas_diarias, orden, activo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), deposito=VALUES(deposito), ganancia_tarea=VALUES(ganancia_tarea), num_tareas_diarias=VALUES(num_tareas_diarias)
        `, [level.id, level.codigo, level.nombre, level.deposito, level.ganancia_tarea, level.num_tareas_diarias, level.orden, level.activo]);
      }

      // 3. Migrar Usuarios
      logger.info('Migrando usuarios...');
      for (const user of data.users) {
        await conn.query(`
          INSERT INTO usuarios (id, telefono, nombre_usuario, nombre_real, password_hash, password_fondo_hash, codigo_invitacion, invitado_por, nivel_id, rol, saldo_principal, saldo_comisiones)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE telefono=VALUES(telefono)
        `, [user.id, user.telefono, user.nombre_usuario, user.nombre_real, user.password_hash, user.password_fondo_hash, user.codigo_invitacion, user.invitado_por, user.nivel_id, user.rol, user.saldo_principal, user.saldo_comisiones]);
      }

      // 4. Migrar Tareas
      logger.info('Migrando tareas...');
      for (const task of data.tasks) {
        await conn.query(`
          INSERT INTO tareas (id, nombre, descripcion, video_url, pregunta, opciones, respuesta_correcta, activa)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [task.id, task.nombre, task.descripcion, task.video_url, task.pregunta, JSON.stringify(task.opciones), task.respuesta_correcta, 1]);
      }

      // 5. Migrar Banners
      logger.info('Migrando banners...');
      for (const banner of data.banners) {
        await conn.query(`
          INSERT INTO banners_carrusel (id, imagen_url, titulo, activo, orden)
          VALUES (?, ?, ?, ?, ?)
        `, [banner.id, banner.imagen_url, banner.titulo, banner.activo, banner.orden]);
      }

      // 6. Migrar Mensajes Globales
      logger.info('Migrando mensajes globales...');
      for (const msg of data.mensajesGlobales) {
        await conn.query(`
          INSERT INTO mensajes_globales (id, titulo, contenido, imagen_url, fecha)
          VALUES (?, ?, ?, ?, ?)
        `, [msg.id, msg.titulo, msg.contenido, msg.imagen_url, msg.fecha]);
      }

      // 7. Migrar Configuración Global
      logger.info('Migrando configuración...');
      for (const [clave, valor] of Object.entries(data.publicContent)) {
        await conn.query(`
          INSERT INTO configuraciones (clave, valor)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE valor=VALUES(valor)
        `, [clave, JSON.stringify(valor)]);
      }
    });

    logger.info('✅ Migración completada exitosamente.');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error en la migración:', err);
    process.exit(1);
  }
}

migrate();
