-- BCB GLOBAL - Telegram Operation System Schema
-- Un caso = Un responsable. Bloqueo total.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. EQUIPOS TELEGRAM
CREATE TABLE IF NOT EXISTS telegram_equipos (
  id VARCHAR(36) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo ENUM('secretaria', 'retiros', 'administradores') NOT NULL,
  chat_id VARCHAR(100) NOT NULL, -- ID del grupo/canal de Telegram
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. INTEGRANTES TELEGRAM (Operadores)
CREATE TABLE IF NOT EXISTS telegram_integrantes (
  id VARCHAR(36) PRIMARY KEY,
  telegram_user_id VARCHAR(100) UNIQUE NOT NULL, -- ID numérico del usuario en Telegram
  nombre_visible VARCHAR(100) NOT NULL,
  equipo_id VARCHAR(36) NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (equipo_id) REFERENCES telegram_equipos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CONTROL DE OPERACIONES TELEGRAM (Locking System)
-- Se vincula con las tablas 'recargas' y 'retiros' existentes
CREATE TABLE IF NOT EXISTS telegram_casos_bloqueo (
  referencia_id VARCHAR(36) PRIMARY KEY, -- ID de la recarga o retiro
  tipo_operacion ENUM('recarga', 'retiro') NOT NULL,
  estado_operativo ENUM('pendiente', 'tomado', 'resuelto') DEFAULT 'pendiente',
  tomado_por VARCHAR(100), -- telegram_user_id del integrante
  tomado_at TIMESTAMP NULL,
  resuelto_at TIMESTAMP NULL,
  telegram_message_id VARCHAR(100), -- ID del mensaje en el grupo operativo para editarlo
  telegram_secretaria_message_id VARCHAR(100), -- ID del mensaje en el grupo de secretaría
  FOREIGN KEY (tomado_por) REFERENCES telegram_integrantes(telegram_user_id) ON DELETE SET NULL,
  INDEX idx_casos_estado (estado_operativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TRAZABILIDAD TOTAL (Logs)
CREATE TABLE IF NOT EXISTS telegram_operaciones_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  referencia_id VARCHAR(36) NOT NULL,
  telegram_user_id VARCHAR(100) NOT NULL,
  accion ENUM('tomar', 'aceptar', 'rechazar') NOT NULL,
  detalles JSON,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_log_referencia (referencia_id),
  INDEX idx_log_user (telegram_user_id),
  INDEX idx_log_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CONFIGURACIÓN HORARIOS OPERATIVOS (QR/Recargas)
CREATE TABLE IF NOT EXISTS telegram_config_horarios (
  id INT PRIMARY KEY DEFAULT 1,
  hora_inicio TIME DEFAULT '08:00:00',
  hora_fin TIME DEFAULT '22:00:00',
  dias_operativos JSON, -- [1,2,3,4,5,6,7] donde 1=Lunes, 7=Domingo
  activo TINYINT(1) DEFAULT 1,
  visibilidad_numero ENUM('completo', 'parcial') DEFAULT 'parcial', -- Configuración para Secretaría
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
