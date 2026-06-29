import { query } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';

/**
 * MIGRACIÓN v11.2.0 - SOLUCIÓN DEFINITIVA A COLUMN ERRORS
 */
async function runFix() {
  logger.info('🚀 Iniciando Reparación de Base de Datos v11.2.0...');

  try {
    // 1. Reparar tabla USUARIOS (Agregar telegram_username de forma blindada)
    logger.info('⏳ Reparando tabla usuarios...');
    const userCols = await query("SHOW COLUMNS FROM usuarios");
    const hasTgUsername = userCols.some(c => c.Field === 'telegram_username');
    const hasTgUserId = userCols.some(c => c.Field === 'telegram_user_id');

    if (!hasTgUserId) {
      await query("ALTER TABLE usuarios ADD COLUMN telegram_user_id VARCHAR(50) AFTER last_device_id");
      logger.info('✅ Columna telegram_user_id agregada.');
    }
    
    if (!hasTgUsername) {
      await query("ALTER TABLE usuarios ADD COLUMN telegram_username VARCHAR(100) AFTER telegram_user_id");
      logger.info('✅ Columna telegram_username agregada.');
    } else {
      // Si existe pero por alguna razón da error, intentamos modificarla para asegurar tipo
      await query("ALTER TABLE usuarios MODIFY COLUMN telegram_username VARCHAR(100)");
      logger.info('✅ Columna telegram_username verificada/actualizada.');
    }

    // AGREGAR COLUMNAS DE TURNOS Y NOTIFICACIONES (v11.5.0)
    const shiftCols = [
      { name: 'hora_inicio_turno', type: "TIME DEFAULT '00:00:00'" },
      { name: 'hora_fin_turno', type: "TIME DEFAULT '23:59:59'" },
      { name: 'dias_semana', type: "VARCHAR(100) DEFAULT '0,1,2,3,4,5,6'" },
      { name: 'activo', type: "TINYINT(1) DEFAULT 1" },
      { name: 'recibe_notificaciones', type: "TINYINT(1) DEFAULT 1" }
    ];

    for (const col of shiftCols) {
      if (!userCols.some(c => c.Field === col.name)) {
        logger.info(`⏳ Agregando columna ${col.name} a usuarios...`);
        await query(`ALTER TABLE usuarios ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // 2. Reparar tabla USUARIOS_TELEGRAM
    logger.info('⏳ Reparando tabla usuarios_telegram...');
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios_telegram (
        telegram_id VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(100),
        telegram_username VARCHAR(100),
        activo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Asegurar que telegram_username existe en usuarios_telegram
    const tgUserCols = await query("SHOW COLUMNS FROM usuarios_telegram");
    if (!tgUserCols.some(c => c.Field === 'telegram_username')) {
      await query("ALTER TABLE usuarios_telegram ADD COLUMN telegram_username VARCHAR(100) AFTER nombre");
      logger.info('✅ Columna telegram_username agregada a usuarios_telegram.');
    }

    // 3. Limpieza de tablas obsoletas para evitar colisiones
    logger.info('⏳ Limpiando tablas obsoletas...');
    await query("DROP TABLE IF EXISTS telegram_integrantes");
    await query("DROP TABLE IF EXISTS telegram_equipos");
    logger.info('✅ Tablas obsoletas eliminadas.');

    // 4. Sincronizar Compras de Nivel (Soporte para comprobantes directos y validación de fecha)
    const compraCols = await query("SHOW COLUMNS FROM compras_nivel");
    if (!compraCols.some(c => c.Field === 'metodo_qr_id')) {
      await query("ALTER TABLE compras_nivel ADD COLUMN metodo_qr_id VARCHAR(36) AFTER nivel_id");
      logger.info('✅ Columna metodo_qr_id agregada.');
    }
    if (!compraCols.some(c => c.Field === 'fecha_dia')) {
      logger.info('⏳ Agregando columna fecha_dia a compras_nivel...');
      await query("ALTER TABLE compras_nivel ADD COLUMN fecha_dia DATE AFTER procesado_at");
      // Poblar fecha_dia para registros existentes
      await query("UPDATE compras_nivel SET fecha_dia = DATE(created_at) WHERE fecha_dia IS NULL");
      logger.info('✅ Columna fecha_dia agregada y poblada en compras_nivel.');
    }

    // 5. Asegurar tabla configuraciones (v11.5.0)
    logger.info('⏳ Verificando tabla configuraciones...');
    await query(`
      CREATE TABLE IF NOT EXISTS configuraciones (
        clave VARCHAR(100) PRIMARY KEY,
        valor JSON NOT NULL,
        descripcion TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Tabla configuraciones verificada.');

    logger.info('✨ Reparación DB v11.2.0 completada exitosamente.');
    process.exit(0);
  } catch (err) {
    logger.error('❌ ERROR CRÍTICO EN MIGRACIÓN v11.2.0:', err.message);
    process.exit(1);
  }
}

runFix();
