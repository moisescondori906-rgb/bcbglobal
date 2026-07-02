import { query } from '../src/config/db.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function columnExists(table, column) {
  const result = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return result.length > 0;
}

async function indexExists(table, indexName) {
  const result = await query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [indexName]);
  return result.length > 0;
}

async function tableExists(tableName) {
  const result = await query(`SHOW TABLES LIKE ?`, [tableName]);
  return result.length > 0;
}

async function runMigration() {
  console.log('🔄 Starting 024 BCB Global Master Upgrade...');

  try {
    // 1. Modificar tabla retiros
    console.log('📝 Updating retiros table...');
    
    if (!await columnExists('retiros', 'comision_operador')) {
      await query(`ALTER TABLE retiros ADD COLUMN comision_operador DECIMAL(20, 2) DEFAULT 0 AFTER comision_aplicada`);
    }
    if (!await columnExists('retiros', 'comision_retiro')) {
      await query(`ALTER TABLE retiros ADD COLUMN comision_retiro DECIMAL(20, 2) DEFAULT 0 AFTER comision_operador`);
    }
    if (!await columnExists('retiros', 'comision_total')) {
      await query(`ALTER TABLE retiros ADD COLUMN comision_total DECIMAL(20, 2) DEFAULT 0 AFTER comision_retiro`);
    }
    if (!await columnExists('retiros', 'cuenta_bancaria_id')) {
      await query(`ALTER TABLE retiros ADD COLUMN cuenta_bancaria_id VARCHAR(36) AFTER datos_bancarios`);
    }
    if (!await columnExists('retiros', 'password_fondo_validado')) {
      await query(`ALTER TABLE retiros ADD COLUMN password_fondo_validado TINYINT(1) DEFAULT 0 AFTER cuenta_bancaria_id`);
    }
    if (!await columnExists('retiros', 'patrocinador_id')) {
      await query(`ALTER TABLE retiros ADD COLUMN patrocinador_id VARCHAR(36) AFTER fecha_dia`);
    }
    if (!await columnExists('retiros', 'procesado_por_patrocinador')) {
      await query(`ALTER TABLE retiros ADD COLUMN procesado_por_patrocinador VARCHAR(36) AFTER patrocinador_id`);
    }
    if (!await columnExists('retiros', 'procesado_por_patrocinador_at')) {
      await query(`ALTER TABLE retiros ADD COLUMN procesado_por_patrocinador_at TIMESTAMP NULL AFTER procesado_por_patrocinador`);
    }
    if (!await columnExists('retiros', 'estado_patrocinador')) {
      await query(`ALTER TABLE retiros ADD COLUMN estado_patrocinador ENUM('Verificando', 'aprobado', 'rechazado') DEFAULT 'Verificando' AFTER procesado_por_patrocinador_at`);
    }
    if (!await columnExists('retiros', 'aprobado_por_patrocinador')) {
      await query(`ALTER TABLE retiros ADD COLUMN aprobado_por_patrocinador TINYINT(1) DEFAULT 0 AFTER estado_patrocinador`);
    }
    if (!await columnExists('retiros', 'motivo_rechazo_patrocinador')) {
      await query(`ALTER TABLE retiros ADD COLUMN motivo_rechazo_patrocinador TEXT AFTER aprobado_por_patrocinador`);
    }
    if (!await columnExists('retiros', 'fecha_aprobacion_patrocinador')) {
      await query(`ALTER TABLE retiros ADD COLUMN fecha_aprobacion_patrocinador TIMESTAMP NULL AFTER motivo_rechazo_patrocinador`);
    }
    if (!await indexExists('retiros', 'idx_retiros_patrocinador')) {
      await query(`ALTER TABLE retiros ADD INDEX idx_retiros_patrocinador (patrocinador_id)`);
    }
    
    // Actualizar columna estado
    await query(`ALTER TABLE retiros MODIFY COLUMN estado ENUM('Verificando', 'Aceptado', 'Rechazado', 'Pendiente_Patrocinador') DEFAULT 'Verificando'`);

    // 2. Crear tabla limites_retiros_pasantia
    if (!await tableExists('limites_retiros_pasantia')) {
      await query(`
        CREATE TABLE limites_retiros_pasantia (
          id VARCHAR(36) PRIMARY KEY,
          patrocinador_id VARCHAR(36) NOT NULL,
          retiros_aprobados INT DEFAULT 0,
          max_retiros INT DEFAULT 15,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_patrocinador (patrocinador_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // 3. Crear tabla auditoria_operativa
    if (!await tableExists('auditoria_operativa')) {
      await query(`
        CREATE TABLE auditoria_operativa (
          id VARCHAR(36) PRIMARY KEY,
          usuario_id VARCHAR(36),
          tipo_operacion VARCHAR(50) NOT NULL,
          estado_anterior VARCHAR(50),
          estado_nuevo VARCHAR(50),
          motivo TEXT,
          ip VARCHAR(45),
          dispositivo VARCHAR(255),
          procesado_por VARCHAR(36),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_usuario (usuario_id),
          INDEX idx_tipo (tipo_operacion),
          INDEX idx_fecha (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // 4. Crear tabla auditoria_operaciones (compatibilidad)
    if (!await tableExists('auditoria_operaciones')) {
      await query(`
        CREATE TABLE auditoria_operaciones (
          id VARCHAR(36) PRIMARY KEY,
          usuario_id VARCHAR(36),
          tipo_operacion VARCHAR(50) NOT NULL,
          estado_anterior VARCHAR(50),
          estado_nuevo VARCHAR(50),
          motivo TEXT,
          ip VARCHAR(45),
          dispositivo VARCHAR(255),
          procesado_por VARCHAR(36),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_usuario (usuario_id),
          INDEX idx_tipo (tipo_operacion),
          INDEX idx_fecha (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    console.log('✅ Retiros table updated');
    console.log('✅ Limits table created');
    console.log('✅ Audit tables created');
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
