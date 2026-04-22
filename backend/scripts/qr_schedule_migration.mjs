
import { query } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';

async function migrate() {
  logger.info('🚀 Iniciando Migración de Horarios para QRs v11.5.0 (Producción)...');

  try {
    const cols = await query("SHOW COLUMNS FROM metodos_qr");
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('admin_id')) {
      await query("ALTER TABLE metodos_qr ADD COLUMN admin_id VARCHAR(36) AFTER imagen_qr_url");
      await query("ALTER TABLE metodos_qr ADD CONSTRAINT fk_metodos_qr_admin FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE");
      logger.info('✅ Columna admin_id y FK agregada.');
    }

    if (!colNames.includes('seleccionada')) {
      await query("ALTER TABLE metodos_qr ADD COLUMN seleccionada TINYINT(1) DEFAULT 0 AFTER admin_id");
      logger.info('✅ Columna seleccionada agregada.');
    }

    if (!colNames.includes('dias_semana')) {
      await query("ALTER TABLE metodos_qr ADD COLUMN dias_semana TEXT DEFAULT '0,1,2,3,4,5,6' AFTER orden");
      logger.info('✅ Columna dias_semana agregada.');
    }

    if (!colNames.includes('hora_inicio')) {
      await query("ALTER TABLE metodos_qr ADD COLUMN hora_inicio TIME DEFAULT '00:00:00' AFTER dias_semana");
      logger.info('✅ Columna hora_inicio agregada.');
    }

    if (!colNames.includes('hora_fin')) {
      await query("ALTER TABLE metodos_qr ADD COLUMN hora_fin TIME DEFAULT '23:59:59' AFTER hora_inicio");
      logger.info('✅ Columna hora_fin agregada.');
    }

    // Limpieza de nombres antiguos si existen (por migraciones fallidas previas)
    if (colNames.includes('horario_inicio')) {
        await query("ALTER TABLE metodos_qr DROP COLUMN horario_inicio");
        logger.info('🗑️ Columna obsoleta horario_inicio eliminada.');
    }
    if (colNames.includes('horario_fin')) {
        await query("ALTER TABLE metodos_qr DROP COLUMN horario_fin");
        logger.info('🗑️ Columna obsoleta horario_fin eliminada.');
    }

    logger.info('✨ Migración v11.5.0 completada exitosamente.');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error en migración v11.5.0:', err.message);
    process.exit(1);
  }
}

migrate();
