
import { query } from '../src/config/db.js';
import logger from '../src/utils/logger.js';

console.log('🗄️ Ejecutando migración 020: Tickets de sorteo...');

const sql = `
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabla de Tickets de Sorteo
CREATE TABLE IF NOT EXISTS tickets_sorteo (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Historial de Recompensas
CREATE TABLE IF NOT EXISTS historial_recompensas (
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
  INDEX idx_recompensas_estado (estado),
  -- Índice único para evitar duplicados por ascenso
  UNIQUE KEY idx_recompensa_unica (usuario_generador, nivel_alcanzado, motivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;

async function runMigration() {
  try {
    // Split by semicolon and execute each statement
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length &gt; 0);
    
    for (const statement of statements) {
      await query(statement);
      console.log('✅ Ejecutado:', statement.substring(0, 50) + '...');
    }
    
    console.log('\n✨ Migración completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

runMigration();

