-- BCB GLOBAL - Cron Control & Robustness Schema (v13.0.0)
-- Prevención de duplicación y control de ejecución de procesos automáticos.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA: CONTROL DE CRON (Asegura ejecución única)
CREATE TABLE IF NOT EXISTS control_cron (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL, -- Ej: 'reporte_diario', 'reset_ganancias'
  fecha DATE NOT NULL,
  ejecutado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_tipo_fecha (tipo, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
