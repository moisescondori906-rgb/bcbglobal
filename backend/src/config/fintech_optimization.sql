-- BCB GLOBAL - FinTech Optimization & Security Schema (v14.0.0)
-- Implementación de blindaje total, alertas inteligentes y control de procesos.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. MEJORAS EN TABLA RETIROS
ALTER TABLE retiros 
ADD COLUMN IF NOT EXISTS alertado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS metadata_snap JSON,
ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

-- 2. ASEGURAR TABLA CONTROL CRON (v14 con más detalle)
CREATE TABLE IF NOT EXISTS control_cron (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL,
  fecha DATE NOT NULL,
  ejecutado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  resultado ENUM('exito', 'error', 'omitido') DEFAULT 'exito',
  detalles TEXT,
  UNIQUE KEY idx_tipo_fecha (tipo, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA SEGURIDAD LOGS (Asegurar campos necesarios)
CREATE TABLE IF NOT EXISTS seguridad_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(100),
  accion VARCHAR(100) NOT NULL,
  resultado ENUM('exito', 'fallo', 'bloqueo', 'rate_limit') NOT NULL,
  ip VARCHAR(45),
  detalles TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_seg_user (telegram_id),
  INDEX idx_seg_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA ESTADÍSTICAS OPERADORES (Asegurar campos para ranking)
CREATE TABLE IF NOT EXISTS estadisticas_operadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(100) NOT NULL,
  nombre_operador VARCHAR(100),
  fecha DATE NOT NULL,
  total_tomados INT DEFAULT 0,
  total_aprobados INT DEFAULT 0,
  total_rechazados INT DEFAULT 0,
  tiempo_total_toma_seg BIGINT DEFAULT 0,
  tiempo_total_proceso_seg BIGINT DEFAULT 0,
  UNIQUE KEY idx_op_fecha (telegram_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
