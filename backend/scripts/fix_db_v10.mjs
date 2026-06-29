import { query } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';

/**
 * MIGRACIÓN v10.2.0 - FIX RECHARGE & CONNECTIVITY
 * Ejecuta: node scripts/fix_db_v10.mjs
 */
async function runFix() {
  logger.info('🚀 Iniciando correcciones de Base de Datos v10.2.0...');

  try {
    // 1. Agregar columna metodo_qr_id a compras_nivel
    logger.info('⏳ Verificando columna metodo_qr_id en compras_nivel...');
    const columns = await query("SHOW COLUMNS FROM compras_nivel LIKE 'metodo_qr_id'");
    
    if (columns.length === 0) {
      await query("ALTER TABLE compras_nivel ADD COLUMN metodo_qr_id VARCHAR(36) AFTER nivel_id");
      logger.info('✅ Columna metodo_qr_id agregada exitosamente.');
    } else {
      logger.info('ℹ️ La columna metodo_qr_id ya existe.');
    }

    // 2. Asegurar que las tablas esenciales existan
    logger.info('⏳ Verificando integridad de tablas...');
    await query(`
      CREATE TABLE IF NOT EXISTS metodos_qr (
        id VARCHAR(36) PRIMARY KEY,
        nombre_titular VARCHAR(200) NOT NULL,
        imagen_qr_url TEXT,
        activo TINYINT(1) DEFAULT 1,
        orden INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS actividad_tareas (
        id VARCHAR(36) PRIMARY KEY,
        usuario_id VARCHAR(36) NOT NULL,
        tarea_id VARCHAR(36) NOT NULL,
        monto_ganado DECIMAL(20, 2) NOT NULL,
        fecha_dia DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_usuario_fecha (usuario_id, fecha_dia)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    logger.info('✅ Tablas verificadas.');

    // 4. Asegurar tabla usuarios_telegram (Manejo de Operadores)
    logger.info('⏳ Verificando tabla usuarios_telegram...');
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios_telegram (
        telegram_id VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(100),
        telegram_username VARCHAR(100),
        activo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 4.1 Asegurar columna telegram_username en la tabla usuarios principal (v10.9.0)
    logger.info('⏳ Verificando columna telegram_username en tabla usuarios...');
    const userColumns = await query("SHOW COLUMNS FROM usuarios LIKE 'telegram_username'");
    if (userColumns.length === 0) {
      await query("ALTER TABLE usuarios ADD COLUMN telegram_username VARCHAR(100) AFTER telegram_user_id");
      logger.info('✅ Columna telegram_username agregada a la tabla usuarios.');
    }

    // Auto-registrar al administrador principal si no existe (Basado en .env o fallback)
    await query(`
      INSERT IGNORE INTO usuarios_telegram (telegram_id, nombre, telegram_username, activo)
      VALUES ('59174344916', 'Administrador Principal', 'admin', 1)
    `);
    logger.info('✅ Tabla usuarios_telegram verificada.');

    // 5. Crear carpeta uploads si no existe
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info('✅ Carpeta public/uploads creada.');
    }

    logger.info('✨ Todas las correcciones de DB v10.2.0 aplicadas.');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error fatal durante la migración:', err.message);
    process.exit(1);
  }
}

runFix();
