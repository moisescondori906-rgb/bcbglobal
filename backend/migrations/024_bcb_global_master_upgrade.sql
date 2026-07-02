-- 024 BCB Global Master Upgrade
-- Adds new columns to retiros, creates limites_retiros_pasantia and auditoria_operativa and auditoria_operaciones

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Update retiros table
ALTER TABLE retiros
ADD COLUMN IF NOT EXISTS comision_operador DECIMAL(20, 2) DEFAULT 0 AFTER comision_aplicada,
ADD COLUMN IF NOT EXISTS comision_retiro DECIMAL(20, 2) DEFAULT 0 AFTER comision_operador,
ADD COLUMN IF NOT EXISTS comision_total DECIMAL(20, 2) DEFAULT 0 AFTER comision_retiro,
ADD COLUMN IF NOT EXISTS cuenta_bancaria_id VARCHAR(36) AFTER datos_bancarios,
ADD COLUMN IF NOT EXISTS password_fondo_validado TINYINT(1) DEFAULT 0 AFTER cuenta_bancaria_id,
ADD COLUMN IF NOT EXISTS patrocinador_id VARCHAR(36) AFTER fecha_dia,
ADD COLUMN IF NOT EXISTS procesado_por_patrocinador VARCHAR(36) AFTER patrocinador_id,
ADD COLUMN IF NOT EXISTS procesado_por_patrocinador_at TIMESTAMP NULL AFTER procesado_por_patrocinador,
ADD COLUMN IF NOT EXISTS estado_patrocinador ENUM('Verificando', 'aprobado', 'rechazado') DEFAULT 'Verificando' AFTER procesado_por_patrocinador_at,
ADD COLUMN IF NOT EXISTS aprobado_por_patrocinador TINYINT(1) DEFAULT 0 AFTER estado_patrocinador,
ADD COLUMN IF NOT EXISTS motivo_rechazo_patrocinador TEXT AFTER aprobado_por_patrocinador,
ADD COLUMN IF NOT EXISTS fecha_aprobacion_patrocinador TIMESTAMP NULL AFTER motivo_rechazo_patrocinador,
ADD INDEX IF NOT EXISTS idx_retiros_patrocinador (patrocinador_id),
MODIFY COLUMN estado ENUM('Verificando', 'Aceptado', 'Rechazado', 'Pendiente_Patrocinador') DEFAULT 'Verificando';

-- 2. Add foreign key for cuenta_bancaria_id if not exists
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = DATABASE() 
AND TABLE_NAME = 'retiros' 
AND CONSTRAINT_NAME = 'fk_retiros_cuenta_bancaria');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE retiros ADD CONSTRAINT fk_retiros_cuenta_bancaria FOREIGN KEY (cuenta_bancaria_id) REFERENCES tarjetas_bancarias(id) ON DELETE SET NULL', 
    'SELECT "FK already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add foreign key for patrocinador_id if not exists
SET @fk_exists2 = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = DATABASE() 
AND TABLE_NAME = 'retiros' 
AND CONSTRAINT_NAME = 'fk_retiros_patrocinador');

SET @sql2 = IF(@fk_exists2 = 0, 
    'ALTER TABLE retiros ADD CONSTRAINT fk_retiros_patrocinador FOREIGN KEY (patrocinador_id) REFERENCES usuarios(id) ON DELETE SET NULL', 
    'SELECT "FK already exists"');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 4. Create limites_retiros_pasantia table if not exists
CREATE TABLE IF NOT EXISTS limites_retiros_pasantia (
  id VARCHAR(36) PRIMARY KEY,
  patrocinador_id VARCHAR(36) NOT NULL UNIQUE,
  total_aprobados INT DEFAULT 0,
  maximo_por_patrocinador INT DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patrocinador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_limites_patrocinador (patrocinador_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create auditoria_operativa table if not exists
CREATE TABLE IF NOT EXISTS auditoria_operativa (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trace_id VARCHAR(36) NOT NULL,
  usuario_id VARCHAR(36),
  operacion VARCHAR(100) NOT NULL,
  estado_anterior VARCHAR(100),
  estado_nuevo VARCHAR(100),
  motivo TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_trace (trace_id),
  INDEX idx_audit_usuario (usuario_id),
  INDEX idx_audit_operacion (operacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Create auditoria_operaciones table (compatibilidad)
CREATE TABLE IF NOT EXISTS auditoria_operaciones (
  id VARCHAR(36) PRIMARY KEY,
  tipo_operacion VARCHAR(100) NOT NULL,
  usuario_id VARCHAR(36),
  patrocinador_id VARCHAR(36),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado_anterior VARCHAR(100),
  estado_nuevo VARCHAR(100),
  motivo TEXT,
  metadata JSON,
  INDEX idx_audit_op_tipo (tipo_operacion),
  INDEX idx_audit_op_usuario (usuario_id),
  INDEX idx_audit_op_patrocinador (patrocinador_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
