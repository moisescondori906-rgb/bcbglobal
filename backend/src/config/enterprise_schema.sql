-- BCB GLOBAL - Enterprise Resilience & Event Sourcing Schema (v17.0.0)
-- Implementación de versionado de eventos y trazabilidad correlacionada.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. MEJORAR TABLA IDEMPOTENCIA CON VERSIONADO
ALTER TABLE idempotencia_callbacks 
ADD COLUMN IF NOT EXISTS event_version INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS payload_snap JSON,
ADD COLUMN IF NOT EXISTS environment ENUM('production', 'staging', 'development') DEFAULT 'production';

-- 2. TABLA: AUDITORÍA DE DLQ (Dead Letter Queue Replay)
CREATE TABLE IF NOT EXISTS dlq_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id VARCHAR(100) NOT NULL,
  trace_id VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  status ENUM('failed', 'replayed', 'discarded') DEFAULT 'failed',
  replayed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_job (job_id),
  INDEX idx_trace (trace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
