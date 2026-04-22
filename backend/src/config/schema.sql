-- SAV - MySQL Production Schema (Optimized for High Concurrency)
-- Generated for Contabo Server

SET FOREIGN_KEY_CHECKS = 0;

-- 1. NIVELES (Fuente de verdad económica)
CREATE TABLE IF NOT EXISTS niveles (
  id VARCHAR(36) PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL, -- internar, global1, global2...
  nombre VARCHAR(100) NOT NULL,
  deposito DECIMAL(20, 2) DEFAULT 0.00,
  ganancia_tarea DECIMAL(20, 2) DEFAULT 0.00, -- Unificado: Pago por tarea según nivel
  num_tareas_diarias INT DEFAULT 0,
  orden INT DEFAULT 0, -- Para jerarquía (G1 < G2...)
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_niveles_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id VARCHAR(36) PRIMARY KEY,
  telefono VARCHAR(20) UNIQUE NOT NULL,
  nombre_usuario VARCHAR(100) NOT NULL,
  nombre_real VARCHAR(200),
  password_hash TEXT NOT NULL,
  password_fondo_hash TEXT,
  codigo_invitacion VARCHAR(20) UNIQUE NOT NULL,
  invitado_por VARCHAR(36),
  nivel_id VARCHAR(36),
  avatar_url TEXT,
  saldo_principal DECIMAL(20, 2) DEFAULT 0.00,
  saldo_comisiones DECIMAL(20, 2) DEFAULT 0.00,
  rol ENUM('usuario', 'admin') DEFAULT 'usuario',
  bloqueado TINYINT(1) DEFAULT 0,
  tickets_ruleta INT DEFAULT 0,
  primer_ascenso_completado TINYINT(1) DEFAULT 0,
  last_device_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invitado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE SET NULL,
  INDEX idx_usuarios_telefono (telefono),
  INDEX idx_usuarios_invitado_por (invitado_por),
  INDEX idx_usuarios_codigo_inv (codigo_invitacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TAREAS (Contenido Visual Global)
CREATE TABLE IF NOT EXISTS tareas (
  id VARCHAR(36) PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  video_url TEXT NOT NULL,
  pregunta TEXT,
  opciones JSON, -- ["Opción A", "Opción B"...]
  respuesta_correcta TEXT,
  activa TINYINT(1) DEFAULT 1,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ACTIVIDAD TAREAS (Idempotencia y Registro)
CREATE TABLE IF NOT EXISTS actividad_tareas (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36) NOT NULL,
  tarea_id VARCHAR(36) NOT NULL,
  monto_ganado DECIMAL(20, 2) NOT NULL,
  fecha_dia DATE NOT NULL, -- Para limitar tareas diarias (YYYY-MM-DD)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
  INDEX idx_actividad_usuario_dia (usuario_id, fecha_dia),
  INDEX idx_actividad_compuesta (usuario_id, tarea_id, fecha_dia),
  -- Evitar doble acreditación de la misma tarea para el mismo usuario el mismo día
  UNIQUE KEY unique_user_task_day (usuario_id, tarea_id, fecha_dia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. MOVIMIENTOS SALDO (Trazabilidad Total)
CREATE TABLE IF NOT EXISTS movimientos_saldo (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36) NOT NULL,
  tipo_billetera ENUM('principal', 'comisiones') NOT NULL,
  tipo_movimiento VARCHAR(50) NOT NULL, -- tarea, inversion_red, tarea_red, retiro, recarga, ajuste
  monto DECIMAL(20, 2) NOT NULL,
  saldo_anterior DECIMAL(20, 2) NOT NULL,
  saldo_nuevo DECIMAL(20, 2) NOT NULL,
  descripcion TEXT,
  referencia_id VARCHAR(36), -- ID de recarga, retiro, tarea o usuario que generó comisión
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_movimientos_usuario_fecha (usuario_id, fecha),
  INDEX idx_movimientos_tipo (tipo_movimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. COMPRAS DE NIVEL (LEVEL_PURCHASES)
-- Sustituye el concepto de "recarga" para adquisición de estatus.
CREATE TABLE IF NOT EXISTS compras_nivel (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36) NOT NULL,
  nivel_id VARCHAR(36) NOT NULL,
  monto DECIMAL(20, 2) NOT NULL,
  metodo_qr_id VARCHAR(36),
  comprobante_url TEXT,
  estado ENUM('pendiente', 'completada', 'rechazada') DEFAULT 'pendiente',
  reembolsado TINYINT(1) DEFAULT 0, -- refunded
  admin_notas TEXT,
  procesado_por VARCHAR(36),
  procesado_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE CASCADE,
  FOREIGN KEY (procesado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_compras_nivel_estado (estado),
  INDEX idx_compras_usuario_nivel (usuario_id, nivel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. RETIROS (Blindaje: Máximo 1 por día)
CREATE TABLE IF NOT EXISTS retiros (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36) NOT NULL,
  monto DECIMAL(20, 2) NOT NULL,
  monto_neto DECIMAL(20, 2) NOT NULL, -- Monto menos comisión
  comision_aplicada DECIMAL(20, 2) NOT NULL,
  tipo_billetera ENUM('principal', 'comisiones') NOT NULL,
  estado ENUM('pendiente', 'aprobado', 'rechazado', 'pagado') DEFAULT 'pendiente',
  datos_bancarios JSON, -- Copia de la tarjeta al momento del retiro
  fecha_dia DATE NOT NULL, -- Para validación de 1 retiro por día (Bolivia Time)
  admin_notas TEXT,
  procesado_por VARCHAR(36),
  procesado_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (procesado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_retiros_estado (estado),
  INDEX idx_retiros_usuario_dia (usuario_id, fecha_dia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TARJETAS BANCARIAS
CREATE TABLE IF NOT EXISTS tarjetas_bancarias (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36) NOT NULL,
  nombre_banco VARCHAR(100) NOT NULL,
  tipo_cuenta VARCHAR(50),
  numero_cuenta VARCHAR(100) NOT NULL,
  nombre_titular VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. CONFIGURACIÓN GLOBAL (Unificada)
CREATE TABLE IF NOT EXISTS configuraciones (
  clave VARCHAR(100) PRIMARY KEY,
  valor JSON NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. MENSAJES GLOBALES
CREATE TABLE IF NOT EXISTS mensajes_globales (
  id VARCHAR(36) PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  contenido TEXT NOT NULL,
  imagen_url TEXT,
  activo TINYINT(1) DEFAULT 1,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. METODOS QR (Admin)
CREATE TABLE IF NOT EXISTS metodos_qr (
  id VARCHAR(36) PRIMARY KEY,
  nombre_titular VARCHAR(200) NOT NULL,
  imagen_qr_url TEXT,
  admin_id VARCHAR(36), -- Vinculado a un admin de la tabla usuarios
  activo TINYINT(1) DEFAULT 1,
  seleccionada TINYINT(1) DEFAULT 0,
  orden INT DEFAULT 0,
  dias_semana TEXT DEFAULT '0,1,2,3,4,5,6',
  hora_inicio TIME DEFAULT '00:00:00',
  hora_fin TIME DEFAULT '23:59:59',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_metodos_qr_admin (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. BANNERS CARRUSEL
CREATE TABLE IF NOT EXISTS banners_carrusel (
  id VARCHAR(36) PRIMARY KEY,
  imagen_url TEXT NOT NULL,
  titulo VARCHAR(200),
  link_url TEXT,
  activo TINYINT(1) DEFAULT 1,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. PREMIOS RULETA
CREATE TABLE IF NOT EXISTS premios_ruleta (
  id VARCHAR(36) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo ENUM('saldo', 'comision', 'tickets', 'nada') NOT NULL,
  valor DECIMAL(20, 2) DEFAULT 0.00,
  probabilidad INT DEFAULT 10, -- 0 a 100
  activo TINYINT(1) DEFAULT 1,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. SORTEOS GANADORES
CREATE TABLE IF NOT EXISTS sorteos_ganadores (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36) NOT NULL,
  premio_id VARCHAR(36) NOT NULL,
  monto_ganado DECIMAL(20, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (premio_id) REFERENCES premios_ruleta(id) ON DELETE CASCADE,
  INDEX idx_sorteos_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. TABLA DE IDEMPOTENCIA (Blindaje Financiero Nivel Senior)
-- Previene doble ejecución mediante clave única en DB.
CREATE TABLE IF NOT EXISTS idempotencia (
  idempotency_key VARCHAR(100) PRIMARY KEY,
  response_body JSON NOT NULL,
  status_code INT DEFAULT 200,
  operacion VARCHAR(50), -- TASK, WITHDRAWAL, LEVEL_UPGRADE, etc.
  usuario_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_idempotencia_user (usuario_id),
  INDEX idx_idempotencia_fecha (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. AUDITORÍA DE ESTADO FINANCIERO (Before/After con Trazabilidad Total)
CREATE TABLE IF NOT EXISTS auditoria_financiera (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trace_id VARCHAR(36) NOT NULL,
  usuario_id VARCHAR(36) NOT NULL,
  operacion VARCHAR(50) NOT NULL, -- TASK, LEVEL_UP, LEVEL_REFUND, WITHDRAW_REQUEST, ADMIN_ADJUST
  billetera ENUM('principal', 'comisiones') NOT NULL,
  monto DECIMAL(20, 2) NOT NULL,
  saldo_anterior DECIMAL(20, 2) NOT NULL,
  saldo_nuevo DECIMAL(20, 2) NOT NULL,
  referencia_id VARCHAR(36),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_fin_usuario (usuario_id),
  INDEX idx_audit_fin_trace (trace_id),
  INDEX idx_audit_fin_fecha (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. FEATURE FLAGS (Control de Funcionalidades en Caliente)
CREATE TABLE IF NOT EXISTS feature_flags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_name VARCHAR(50) NOT NULL,
  enabled TINYINT(1) DEFAULT 1,
  region VARCHAR(20) DEFAULT 'GLOBAL', -- GLOBAL, BO, PE, etc.
  rollout_percentage INT DEFAULT 100, -- 0-100 para Canary Releases
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_feature_region (feature_name, region),
  INDEX idx_ff_region (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. HORARIOS DE OPERACIÓN (Control Dinámico por Región)
CREATE TABLE IF NOT EXISTS horarios_operacion (
  id INT PRIMARY KEY AUTO_INCREMENT,
  operacion_tipo VARCHAR(30) NOT NULL, -- withdrawal, deposit, task, level_purchase
  region VARCHAR(20) DEFAULT 'GLOBAL',
  dias_permitidos VARCHAR(20) DEFAULT '1,2,3,4,5,6,0', -- 1=Lun, 0=Dom
  hora_inicio TIME DEFAULT '00:00:00',
  hora_fin TIME DEFAULT '23:59:59',
  habilitado TINYINT(1) DEFAULT 1,
  timezone VARCHAR(50) DEFAULT 'America/La_Paz',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_horarios_region_tipo (region, operacion_tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. VENTANAS DE MANTENIMIENTO (Bloqueo Programado)
CREATE TABLE IF NOT EXISTS ventanas_mantenimiento (
  id INT PRIMARY KEY AUTO_INCREMENT,
  region VARCHAR(20) DEFAULT 'GLOBAL',
  inicio_at DATETIME NOT NULL,
  fin_at DATETIME NOT NULL,
  motivo VARCHAR(255),
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mantenimiento_rango (inicio_at, fin_at, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. AUDITORÍA DE CONTROL OPERACIONAL
CREATE TABLE IF NOT EXISTS auditoria_operacional (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trace_id VARCHAR(36) NOT NULL,
  usuario_id VARCHAR(36),
  operacion VARCHAR(50),
  region VARCHAR(20),
  resultado ENUM('permitido', 'bloqueado', 'override') NOT NULL,
  motivo_bloqueo VARCHAR(255),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_op_trace (trace_id),
    INDEX idx_audit_op_user (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notificaciones (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  leida TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_notif_usuario_leida (usuario_id, leida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. CALENDARIO OPERATIVO (Centralizado)
CREATE TABLE IF NOT EXISTS calendario_operativo (
  fecha DATE PRIMARY KEY,
  tipo_dia ENUM('laboral', 'feriado', 'mantenimiento', 'especial') DEFAULT 'laboral',
  es_feriado TINYINT(1) DEFAULT 0,
  tareas_habilitadas TINYINT(1) DEFAULT 1,
  retiros_habilitados TINYINT(1) DEFAULT 1,
  recargas_habilitadas TINYINT(1) DEFAULT 1,
  motivo VARCHAR(255),
  reglas_niveles JSON, -- { "global1": { "retiro": false }, "global5": { "extra_tasks": 5 } }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. RESPUESTAS CUESTIONARIO (Pasivo)
CREATE TABLE IF NOT EXISTS respuestas_cuestionario (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(36) NOT NULL,
  fecha_dia DATE NOT NULL,
  respuestas JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_user_day (usuario_id, fecha_dia),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
