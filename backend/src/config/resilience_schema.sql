-- BCB GLOBAL - Resilience & Fault Tolerance Schema (v16.0.0)
-- Implementación de idempotencia persistente y trazabilidad de operaciones.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA: IDEMPOTENCIA CALLBACKS (Persistencia de operaciones procesadas)
CREATE TABLE IF NOT EXISTS idempotencia_callbacks (
  callback_id VARCHAR(100) PRIMARY KEY,
  trace_id VARCHAR(50) NOT NULL,
  telegram_id VARCHAR(100) NOT NULL,
  retiro_id VARCHAR(36),
  accion VARCHAR(50) NOT NULL,
  resultado TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trace (trace_id),
  INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. AGREGAR TRACE_ID A TABLAS CRÍTICAS PARA TRAZABILIDAD DISTRIBUIDA
ALTER TABLE historial_retiros ADD COLUMN IF NOT EXISTS trace_id VARCHAR(50) AFTER retiro_id;
ALTER TABLE seguridad_logs ADD COLUMN IF NOT EXISTS trace_id VARCHAR(50) AFTER telegram_id;

SET FOREIGN_KEY_CHECKS = 1;
