-- BCB GLOBAL - Telegram Operation System Schema (v8.3.0)
-- Preparación de DB para control absoluto, bloqueo estricto y trazabilidad.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. MODIFICAR TABLAS EXISTENTES (Retiros y Compras de Nivel)
-- Agregar columnas operativas y de bloqueo
ALTER TABLE retiros 
ADD COLUMN tomado_por_telegram_user_id VARCHAR(100),
ADD COLUMN tomado_por_nombre VARCHAR(100),
ADD COLUMN tomado_en DATETIME,
ADD COLUMN estado_operativo ENUM('pendiente', 'tomado', 'aceptado', 'rechazado') DEFAULT 'pendiente',
ADD COLUMN resuelto_por_telegram_user_id VARCHAR(100),
ADD COLUMN resuelto_por_nombre VARCHAR(100),
ADD COLUMN resuelto_en DATETIME;

ALTER TABLE compras_nivel 
ADD COLUMN tomado_por_telegram_user_id VARCHAR(100),
ADD COLUMN tomado_por_nombre VARCHAR(100),
ADD COLUMN tomado_en DATETIME,
ADD COLUMN estado_operativo ENUM('pendiente', 'tomado', 'aceptado', 'rechazado') DEFAULT 'pendiente',
ADD COLUMN resuelto_por_telegram_user_id VARCHAR(100),
ADD COLUMN resuelto_por_nombre VARCHAR(100),
ADD COLUMN resuelto_en DATETIME;

-- 2. ÍNDICES DE RENDIMIENTO
CREATE INDEX idx_retiros_estado_operativo ON retiros(estado_operativo);
CREATE INDEX idx_retiros_tomado ON retiros(tomado_por_telegram_user_id);
CREATE INDEX idx_compras_nivel_estado_operativo ON compras_nivel(estado_operativo);
CREATE INDEX idx_compras_nivel_tomado ON compras_nivel(tomado_por_telegram_user_id);

-- 3. TABLA: EQUIPOS TELEGRAM
CREATE TABLE IF NOT EXISTS telegram_equipos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_equipo VARCHAR(100) NOT NULL,
  tipo_equipo ENUM('secretaria', 'retiros', 'administradores') NOT NULL,
  telegram_chat_id VARCHAR(100) NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA: INTEGRANTES TELEGRAM
CREATE TABLE IF NOT EXISTS telegram_integrantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipo_id INT NOT NULL,
  telegram_user_id VARCHAR(100) UNIQUE NOT NULL,
  nombre_visible VARCHAR(100),
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (equipo_id) REFERENCES telegram_equipos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA: TRAZABILIDAD (LOGS OPERATIVOS)
CREATE TABLE IF NOT EXISTS telegram_operaciones_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_operacion ENUM('retiro', 'recarga'),
  entidad_id VARCHAR(36), -- Soporte para UUIDs de retiros/recargas
  accion ENUM('notificado', 'tomado', 'aceptado', 'rechazado'),
  telegram_user_id VARCHAR(100),
  nombre_operador VARCHAR(100),
  equipo_tipo VARCHAR(50),
  telegram_chat_id VARCHAR(100),
  detalle TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_log_entidad (entidad_id),
  INDEX idx_log_user (telegram_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. CONFIGURACIÓN EXTRA (Horarios y Visibilidad)
CREATE TABLE IF NOT EXISTS telegram_config_horarios (
  id INT PRIMARY KEY DEFAULT 1,
  hora_inicio TIME DEFAULT '08:00:00',
  hora_fin TIME DEFAULT '22:00:00',
  dias_operativos JSON, -- [1,2,3,4,5,6,7]
  activo TINYINT(1) DEFAULT 1,
  visibilidad_numero ENUM('completo', 'parcial') DEFAULT 'parcial',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
