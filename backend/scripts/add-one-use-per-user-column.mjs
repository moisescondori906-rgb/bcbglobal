import { query } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';

async function main() {
  try {
    logger.info('Adding un_solo_uso_por_usuario column to codigos_canje table...');
    
    await query(`
      ALTER TABLE codigos_canje 
      ADD COLUMN IF NOT EXISTS un_solo_uso_por_usuario TINYINT(1) NOT NULL DEFAULT 0
    `);
    
    logger.info('Column added successfully!');
    process.exit(0);
  } catch (err) {
    logger.error('Error adding column:', err);
    process.exit(1);
  }
}

main();
