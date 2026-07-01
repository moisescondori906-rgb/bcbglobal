
import { query } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

async function tableExists(tableName) {
  const rows = await query(`SHOW TABLES LIKE '${tableName}'`);
  return rows.length &gt; 0;
}

console.log('🗄️ Ejecutando migración 020: Tickets de sorteo...');

async function runMigration() {
  try {
    // 1. Tabla de Tickets de Sorteo
    if (!await tableExists('tickets_sorteo')) {
      logger.info('Creando tabla tickets_sorteo...');
      await query(`
        CREATE TABLE tickets_sorteo (
          id VARCHAR(36) PRIMARY KEY,
          codigo VARCHAR(50) UNIQUE NOT NULL,
          usuario_id VARCHAR(36) NOT NULL,
          motivo VARCHAR(255) NOT NULL,
          estado ENUM('Activo', 'Utilizado', 'Anulado') DEFAULT 'Activo',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
          INDEX idx_tickets_usuario (usuario_id),
          INDEX idx_tickets_estado (estado),
          INDEX idx_tickets_codigo (codigo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      logger.info('✅ Tabla tickets_sorteo creada exitosamente!');
    } else {
      logger.info('ℹ️ Tabla tickets_sorteo ya existe.');
    }

    // 2. Tabla de Historial de Recompensas
    if (!await tableExists('historial_recompensas')) {
      logger.info('Creando tabla historial_recompensas...');
      await query(`
        CREATE TABLE historial_recompensas (
          id VARCHAR(36) PRIMARY KEY,
          usuario_receptor VARCHAR(36) NOT NULL,
          usuario_generador VARCHAR(36) NULL,
          nivel_alcanzado VARCHAR(50) NULL,
          cantidad_tickets INT NOT NULL DEFAULT 0,
          motivo VARCHAR(255) NOT NULL,
          estado ENUM('Completado', 'Anulado') DEFAULT 'Completado',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_receptor) REFERENCES usuarios(id) ON DELETE CASCADE,
          FOREIGN KEY (usuario_generador) REFERENCES usuarios(id) ON DELETE SET NULL,
          INDEX idx_recompensas_receptor (usuario_receptor),
          INDEX idx_recompensas_generador (usuario_generador),
          INDEX idx_recompensas_estado (estado)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      logger.info('✅ Tabla historial_recompensas creada exitosamente!');
    } else {
      logger.info('ℹ️ Tabla historial_recompensas ya existe.');
    }

    console.log('\n✨ Migración completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

runMigration();

