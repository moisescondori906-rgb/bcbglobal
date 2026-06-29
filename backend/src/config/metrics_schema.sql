-- BCB GLOBAL - Operator Metrics & Control Schema (v11.0.0)
-- Registro de eficiencia, tiempos de respuesta y auditoría de desempeño.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA: ESTADÍSTICAS OPERADORES (Métricas acumuladas por día)
CREATE TABLE IF NOT EXISTS estadisticas_operadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(100) NOT NULL,
  nombre_operador VARCHAR(100),
  fecha DATE NOT NULL,
  total_tomados INT DEFAULT 0,
  total_aprobados INT DEFAULT 0,
  total_rechazados INT DEFAULT 0,
  tiempo_total_toma_seg BIGINT DEFAULT 0, -- Tiempo desde creación hasta toma
  tiempo_total_proceso_seg BIGINT DEFAULT 0, -- Tiempo desde toma hasta aprobación/rechazo
  UNIQUE KEY idx_op_fecha (telegram_id, fecha),
  FOREIGN KEY (telegram_id) REFERENCES usuarios_telegram(telegram_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. AJUSTES EN HISTORIAL PARA MÉTRICAS PRECISAS
-- (Ya existen columnas en retiros: fecha_toma, fecha_procesado, created_at)
-- Aseguramos que created_at esté disponible en retiros para medir tiempo de toma.

SET FOREIGN_KEY_CHECKS = 1;
