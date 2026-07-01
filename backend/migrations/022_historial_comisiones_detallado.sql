-- BCB GLOBAL - Historial Detallado de Comisiones (v12.0.0)
-- Tabla para registrar todas las comisiones y prevenir duplicados (idempotencia)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA DE HISTORIAL DETALLADO DE COMISIONES
CREATE TABLE IF NOT EXISTS historial_comisiones (
  id VARCHAR(36) PRIMARY KEY,
  usuario_invitador VARCHAR(36) NOT NULL,
  usuario_subordinado VARCHAR(36) NOT NULL,
  nivel_red ENUM('A', 'B', 'C') NOT NULL,
  monto_comision DECIMAL(20,2) NOT NULL,
  monto_inversion DECIMAL(20,2) NOT NULL,
  porcentaje_aplicado DECIMAL(5,2) NOT NULL,
  estado ENUM('acreditada', 'pendiente', 'anulada') DEFAULT 'acreditada',
  referencia_compra VARCHAR(36) NOT NULL,
  fecha_acreditacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para rendimiento y prevención de duplicados
  INDEX idx_comisiones_invitador (usuario_invitador),
  INDEX idx_comisiones_subordinado (usuario_subordinado),
  INDEX idx_comisiones_referencia (referencia_compra),
  
  -- Restricción única para prevenir duplicados (clave de idempotencia)
  UNIQUE KEY idx_comision_unica (usuario_invitador, usuario_subordinado, nivel_red, referencia_compra),
  
  -- Llaves foráneas
  FOREIGN KEY (usuario_invitador) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_subordinado) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (referencia_compra) REFERENCES compras_nivel(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '✅ Migración de historial de comisiones completada!' AS mensaje;
