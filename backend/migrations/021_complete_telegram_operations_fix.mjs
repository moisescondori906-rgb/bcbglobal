
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');
console.log('📂 Loading env from:', envPath);
dotenv.config({ path: envPath });
console.log('🔑 DB config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const sql = `
SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA TELEGRAM_CASOS_BLOQUEO - Bloqueo de operaciones para evitar conflictos
CREATE TABLE IF NOT EXISTS telegram_casos_bloqueo (
  referencia_id VARCHAR(36) PRIMARY KEY,
  tipo_operacion VARCHAR(50) NOT NULL,
  estado_operativo VARCHAR(50) DEFAULT 'pendiente',
  tomado_por VARCHAR(100) NULL,
  tomado_por_nombre VARCHAR(255) NULL,
  tomado_por_username VARCHAR(100) NULL,
  telegram_message_id VARCHAR(100) NULL,
  chat_id VARCHAR(100) NULL,
  operador_telegram_id VARCHAR(100) NULL,
  operador_nombre VARCHAR(255) NULL,
  operador_username VARCHAR(100) NULL,
  tomado_at TIMESTAMP NULL,
  resuelto_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_telegram_caso (tipo_operacion, referencia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. MODIFICAR TABLA RETIROS
-- Primero, aseguramos que estado_operativo exista y sea VARCHAR
SET @dbname = DATABASE();
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND COLUMN_NAME = 'estado_operativo');
SET @sql = IF(@col_exists = 1, 
  'ALTER TABLE retiros MODIFY COLUMN estado_operativo VARCHAR(50) DEFAULT ''pendiente''',
  'ALTER TABLE retiros ADD COLUMN estado_operativo VARCHAR(50) DEFAULT ''pendiente''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ahora, agregamos los otros campos a retiros
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND COLUMN_NAME = 'operador_telegram_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE retiros ADD COLUMN operador_telegram_id VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND COLUMN_NAME = 'operador_nombre');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE retiros ADD COLUMN operador_nombre VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND COLUMN_NAME = 'operador_username');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE retiros ADD COLUMN operador_username VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND COLUMN_NAME = 'tomado_en');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE retiros ADD COLUMN tomado_en DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND COLUMN_NAME = 'comision_operador');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE retiros ADD COLUMN comision_operador DECIMAL(12,2) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND COLUMN_NAME = 'comision_retiro');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE retiros ADD COLUMN comision_retiro DECIMAL(12,2) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND COLUMN_NAME = 'comision_total');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE retiros ADD COLUMN comision_total DECIMAL(12,2) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND COLUMN_NAME = 'monto_neto');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE retiros ADD COLUMN monto_neto DECIMAL(12,2) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. MODIFICAR TABLA COMPRAS_NIVEL
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'compras_nivel' AND COLUMN_NAME = 'estado_operativo');
SET @sql = IF(@col_exists = 1, 
  'ALTER TABLE compras_nivel MODIFY COLUMN estado_operativo VARCHAR(50) DEFAULT ''pendiente''',
  'ALTER TABLE compras_nivel ADD COLUMN estado_operativo VARCHAR(50) DEFAULT ''pendiente''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'compras_nivel' AND COLUMN_NAME = 'operador_telegram_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE compras_nivel ADD COLUMN operador_telegram_id VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'compras_nivel' AND COLUMN_NAME = 'operador_nombre');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE compras_nivel ADD COLUMN operador_nombre VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'compras_nivel' AND COLUMN_NAME = 'operador_username');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE compras_nivel ADD COLUMN operador_username VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'compras_nivel' AND COLUMN_NAME = 'tomado_en');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE compras_nivel ADD COLUMN tomado_en DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. ÍNDICES DE RENDIMIENTO
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND INDEX_NAME = 'idx_retiros_estado_operativo');
SET @sql = IF(@index_exists = 0, 'CREATE INDEX idx_retiros_estado_operativo ON retiros(estado_operativo)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'retiros' AND INDEX_NAME = 'idx_retiros_tomado');
SET @sql = IF(@index_exists = 0, 'CREATE INDEX idx_retiros_tomado ON retiros(operador_telegram_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'compras_nivel' AND INDEX_NAME = 'idx_compras_nivel_estado_operativo');
SET @sql = IF(@index_exists = 0, 'CREATE INDEX idx_compras_nivel_estado_operativo ON compras_nivel(estado_operativo)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'compras_nivel' AND INDEX_NAME = 'idx_compras_nivel_tomado');
SET @sql = IF(@index_exists = 0, 'CREATE INDEX idx_compras_nivel_tomado ON compras_nivel(operador_telegram_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- Mensaje de confirmación
SELECT '✅ Migración completada exitosamente!' AS mensaje;
`;

async function runMigration() {
  console.log('🚀 Starting migration 021...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  });

  try {
    const [results] = await conn.query(sql);
    console.log('✅ Migration successful!');
    console.log('Results:', results);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await conn.end();
  }
}

runMigration();
