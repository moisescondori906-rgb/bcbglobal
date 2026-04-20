import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import logger from './utils/logger.mjs';
import validateEnv from './config/validateEnv.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script Profesional de Sincronización de Base de Datos v9.1.2
 * Crea la base de datos si no existe y aplica esquemas SQL.
 */
async function syncDatabase() {
  logger.info('🚀 Iniciando sincronización de Base de Datos...');
  
  validateEnv();

  const connectionConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    multipleStatements: true
  };

  const dbName = process.env.MYSQL_DATABASE || 'bcb_global';

  try {
    logger.info(`[DB-SYNC] Intentando conectar a MySQL en ${connectionConfig.host}:${connectionConfig.port}...`);
    const conn = await mysql.createConnection(connectionConfig);
    logger.info(`[DB-SYNC] 🟢 Conexión exitosa.`);
    
    logger.info(`[DB-SYNC] Creando base de datos ${dbName} si no existe...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE ${dbName}`);
    
    const schemaFiles = [
      'config/schema.sql',
      'config/telegram_schema.sql',
      'config/fintech_optimization.sql'
    ];

    for (const fileName of schemaFiles) {
      const filePath = path.join(__dirname, fileName);
      if (!fs.existsSync(filePath)) {
        logger.warn(`[DB-SYNC] Saltando archivo no encontrado: ${fileName}`);
        continue;
      }

      logger.info(`[DB-SYNC] Aplicando esquema: ${fileName}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Dividimos por punto y coma, ignorando bloques complejos si fuera necesario
      const queries = sql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--'));

      for (let q of queries) {
        try {
          await conn.query(q);
        } catch (err) {
          // Ignorar errores de duplicados comunes en migraciones idempotentes
          if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
            continue;
          }
          logger.error(`[DB-SYNC] Error en query: ${q.substring(0, 50)}... | Error: ${err.message}`);
        }
      }
      logger.info(`[DB-SYNC] ✅ Esquema ${fileName} aplicado.`);
    }

    await conn.end();
    logger.info('🎉 Sincronización de base de datos COMPLETADA con éxito.');
    process.exit(0);
  } catch (err) {
    logger.error(`[FATAL-DB-SYNC] Fallo crítico: ${err.message}`);
    process.exit(1);
  }
}

syncDatabase();
