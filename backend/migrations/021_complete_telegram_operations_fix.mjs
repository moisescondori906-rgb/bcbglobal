
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

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

-- 2. MODIFICAR TABLA RETIROS - Asegurar estado_operativo es VARCHAR, agregar campos de operador
ALTER TABLE retiros 
MODIFY COLUMN IF EXISTS estado_operativo VARCHAR(50) DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS operador_telegram_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS operador_nombre VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS operador_username VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS tomado_en DATETIME NULL,
ADD COLUMN IF NOT EXISTS estado_operativo VARCHAR(50) DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS comision_operador DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS comision_retiro DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS comision_total DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_neto DECIMAL(12,2) DEFAULT 0;

-- 3. MODIFICAR TABLA COMPRAS_NIVEL - Asegurar estado_operativo es VARCHAR, agregar campos de operador
ALTER TABLE compras_nivel 
MODIFY COLUMN IF EXISTS estado_operativo VARCHAR(50) DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS operador_telegram_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS operador_nombre VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS operador_username VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS tomado_en DATETIME NULL,
ADD COLUMN IF NOT EXISTS estado_operativo VARCHAR(50) DEFAULT 'pendiente';

-- 4. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_retiros_estado_operativo ON retiros(estado_operativo);
CREATE INDEX IF NOT EXISTS idx_retiros_tomado ON retiros(operador_telegram_id);
CREATE INDEX IF NOT EXISTS idx_compras_nivel_estado_operativo ON compras_nivel(estado_operativo);
CREATE INDEX IF NOT EXISTS idx_compras_nivel_tomado ON compras_nivel(operador_telegram_id);

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
