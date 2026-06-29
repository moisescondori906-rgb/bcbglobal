-- BCB GLOBAL - Global Resilience & Business Intelligence Schema (v18.0.0)
-- Implementación de Feature Flags, SLA y Seguridad Avanzada.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA: FEATURE FLAGS (Control en caliente)
CREATE TABLE IF NOT EXISTS feature_flags (
  flag_key VARCHAR(100) PRIMARY KEY,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  rules JSON, -- Reglas específicas (ej: por región, por rol)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA: MÉTRICAS SLA/SLO
CREATE TABLE IF NOT EXISTS sla_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_name VARCHAR(50) NOT NULL,
  region VARCHAR(20) NOT NULL,
  availability_pct DECIMAL(5,2),
  avg_latency_ms INT,
  total_requests BIGINT,
  failed_requests BIGINT,
  timestamp DATE NOT NULL,
  UNIQUE KEY idx_service_region_date (service_name, region, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA: PATRONES ANÓMALOS (Detección de Fraude)
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trace_id VARCHAR(50),
  telegram_id VARCHAR(100),
  severity ENUM('low', 'medium', 'high', 'critical'),
  pattern_type VARCHAR(100), -- Ej: 'rapid_approvals', 'out_of_hours_activity'
  details JSON,
  status ENUM('open', 'investigating', 'resolved', 'false_positive') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar Flags iniciales
INSERT IGNORE INTO feature_flags (flag_key, description, is_enabled) VALUES 
('telegram_withdrawals', 'Habilitar sistema de retiros por Telegram', TRUE),
('auto_replay_dlq', 'Replay automático de mensajes fallidos', FALSE),
('advanced_fraud_detection', 'Motor de análisis de patrones anómalos', TRUE);

SET FOREIGN_KEY_CHECKS = 1;
