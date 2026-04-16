import { query } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runSecuritySchema() {
  console.log('--- Aplicando Esquemas de Seguridad y Métricas (v11.0.0) ---');
  
  const schemas = [
    '../config/security_schema.sql',
    '../config/metrics_schema.sql',
    '../config/cron_schema.sql',
    '../config/fintech_optimization.sql',
    '../config/resilience_schema.sql',
    '../config/enterprise_schema.sql',
    '../config/global_resilience.sql'
  ];

  for (const schemaFile of schemas) {
    console.log(`\nEjecutando: ${schemaFile}...`);
    const schemaPath = path.join(__dirname, schemaFile);
    if (!fs.existsSync(schemaPath)) {
      console.warn(`⚠️ Archivo ${schemaFile} no encontrado, omitiendo...`);
      continue;
    }
    
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Dividir por punto y coma, filtrando líneas vacías
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let statement of statements) {
      try {
        if (statement.toLowerCase().startsWith('set')) {
          await query(statement);
          continue;
        }
        await query(statement);
        console.log('✅ Ejecutado con éxito.');
      } catch (err) {
        if (err.message.includes('Duplicate column name')) {
          console.log('ℹ️ Columna ya existe, omitiendo...');
        } else if (err.message.includes('Table already exists')) {
          console.log('ℹ️ Tabla ya existe, omitiendo...');
        } else {
          console.error('❌ Error en statement:', statement.substring(0, 50) + '...');
          console.error('Mensaje:', err.message);
        }
      }
    }
  }

  console.log('\n--- Proceso Finalizado ---');
  process.exit(0);
}

runSecuritySchema();
