import { query } from '../src/config/db.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🔄 Starting 024 BCB Global Master Upgrade...');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, '024_bcb_global_master_upgrade.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into statements (simple split for this case)
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      try {
        await query(statement);
        console.log(`✅ Executed statement: ${statement.substring(0, 50)}...`);
      } catch (err) {
        // Ignore errors like "column already exists" etc. for safety
        if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_KEYNAME' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
          throw err;
        }
        console.log(`⚠️  Skipped (already exists): ${err.message}`);
      }
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
