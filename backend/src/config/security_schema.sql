-- BCB GLOBAL - FinTech Security & Advanced Control Schema (v10.0.0)
-- Implementación de seguridad tipo bancaria, auditoría total y control de concurrencia.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA USUARIOS TELEGRAM (Reemplaza/Extiende telegram_integrantes)
CREATE TABLE IF NOT EXISTS usuarios_telegram (
  telegram_id VARCHAR(100) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  rol ENUM('admin', 'retiro', 'secretaria') NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  ultima_actividad DATETIME,
  intentos_fallidos INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA SEGURIDAD LOGS (Anti-Fraude y Auditoría de Acceso)
CREATE TABLE IF NOT EXISTS seguridad_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(100),
  accion VARCHAR(100) NOT NULL,
  ip VARCHAR(45),
  resultado ENUM('exito', 'fallo', 'bloqueo') NOT NULL,
  detalles TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_seg_user (telegram_id),
  INDEX idx_seg_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA HISTORIAL RETIROS (Auditoría de Operaciones)
CREATE TABLE IF NOT EXISTS historial_retiros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  retiro_id VARCHAR(36) NOT NULL,
  accion ENUM('tomado', 'aprobado', 'rechazado', 'liberado_timeout') NOT NULL,
  usuario_telegram_id VARCHAR(100),
  nombre_usuario VARCHAR(100),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON, -- Snapshot del retiro en ese momento
  INDEX idx_hist_retiro (retiro_id),
  INDEX idx_hist_user (usuario_telegram_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA TURNOS QR (Control de Operación por Horario)
CREATE TABLE IF NOT EXISTS turnos_operadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(100) NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (telegram_id) REFERENCES usuarios_telegram(telegram_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. AJUSTES EN TABLA RETIROS PARA CONCURRENCIA Y TIMEOUT
-- Si las columnas ya existen, este bloque fallará, pero en una base limpia es necesario.
ALTER TABLE retiros 
ADD COLUMN fecha_toma DATETIME,
ADD COLUMN msg_id_admin VARCHAR(100),
ADD COLUMN msg_id_retiros VARCHAR(100),
ADD COLUMN msg_id_secretaria VARCHAR(100);

-- Insertar administrador inicial (ejemplo basado en project memory)
INSERT IGNORE INTO usuarios_telegram (telegram_id, nombre, rol, activo) 
VALUES ('6896414316', 'Admin Principal', 'admin', 1);

SET FOREIGN_KEY_CHECKS = 1;
