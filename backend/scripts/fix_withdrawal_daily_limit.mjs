import { query, queryOne } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';

async function migrate() {
  console.log('--- STARTING WITHDRAWAL DAILY LIMIT MIGRATION ---');
  
  try {
    // 1. Verificar si existe la columna fecha_dia
    const columns = await query('SHOW COLUMNS FROM retiros LIKE "fecha_dia"');
    
    if (columns.length === 0) {
      console.log('[MIGRATION] Column fecha_dia does not exist. Adding it...');
      await query('ALTER TABLE retiros ADD COLUMN fecha_dia DATE NULL AFTER password_fondo_validado');
      await query('ALTER TABLE retiros ADD INDEX idx_retiros_fecha_dia (fecha_dia)');
      console.log('[MIGRATION] Column fecha_dia added successfully.');
    } else {
      console.log('[MIGRATION] Column fecha_dia already exists.');
    }

    // 2. Corregir retiros antiguos que tengan fecha_dia NULL (opcional, basándose en created_at)
    // Se usa convert_tz si el servidor no está en Peru Time, o simplemente se extrae la fecha
    // Para ser conservadores, solo actualizamos los que son NULL.
    const nullCount = await queryOne('SELECT COUNT(*) as total FROM retiros WHERE fecha_dia IS NULL');
    if (nullCount.total > 0) {
      console.log(`[MIGRATION] Fixing ${nullCount.total} old withdrawals with NULL fecha_dia...`);
      // Ajuste simple: DATE(created_at)
      await query('UPDATE retiros SET fecha_dia = DATE(created_at) WHERE fecha_dia IS NULL');
      console.log('[MIGRATION] Old withdrawals updated.');
    }

    console.log('[MIGRATION] Completed successfully.');
  } catch (error) {
    console.error('[MIGRATION] Failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

migrate();
