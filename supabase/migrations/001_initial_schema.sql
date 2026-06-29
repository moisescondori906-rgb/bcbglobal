-- BCB GLOBAL - Schema inicial de base de datos
-- Ejecutar en Supabase SQL Editor

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de niveles
CREATE TABLE niveles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  deposito DECIMAL(12,2) DEFAULT 0,
  ingreso_diario DECIMAL(12,2) DEFAULT 0,
  num_tareas_diarias INT DEFAULT 4,
  comision_por_tarea DECIMAL(12,2) DEFAULT 1.80,
  ingreso_mensual DECIMAL(12,2),
  ingreso_anual DECIMAL(12,2),
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefono VARCHAR(20) UNIQUE NOT NULL,
  nombre_usuario VARCHAR(100) NOT NULL,
  nombre_real VARCHAR(200),
  password_hash TEXT NOT NULL,
  password_fondo_hash TEXT,
  codigo_invitacion VARCHAR(20) UNIQUE NOT NULL,
  invitado_por UUID REFERENCES usuarios(id),
  nivel_id UUID REFERENCES niveles(id),
  avatar_url TEXT,
  saldo_principal DECIMAL(12,2) DEFAULT 0,
  saldo_comisiones DECIMAL(12,2) DEFAULT 0,
  rol VARCHAR(20) DEFAULT 'usuario',
  bloqueado BOOLEAN DEFAULT FALSE,
  oportunidades_sorteo INT DEFAULT 0,
  last_device_id TEXT,
  intentos_login INT DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tarjeta bancaria / billetera
CREATE TABLE tarjetas_bancarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  numero_masked VARCHAR(50),
  nombre_banco VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Métodos QR para recarga
CREATE TABLE metodos_qr (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_titular VARCHAR(200) NOT NULL,
  imagen_qr_url TEXT,
  activo BOOLEAN DEFAULT TRUE,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tareas
CREATE TABLE tareas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nivel_id UUID REFERENCES niveles(id),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  recompensa DECIMAL(12,2) DEFAULT 1.80,
  activa BOOLEAN DEFAULT TRUE,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos por tarea/nivel
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarea_id UUID REFERENCES tareas(id),
  nivel_id UUID REFERENCES niveles(id),
  url TEXT NOT NULL,
  titulo VARCHAR(200),
  duracion_segundos INT,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preguntas de tarea
CREATE TABLE preguntas_tarea (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarea_id UUID REFERENCES tareas(id) ON DELETE CASCADE,
  pregunta TEXT NOT NULL,
  respuesta_correcta TEXT NOT NULL,
  opciones JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actividad / historial de tareas completadas
CREATE TABLE actividad_tareas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  tarea_id UUID REFERENCES tareas(id),
  video_id UUID REFERENCES videos(id),
  respuesta_correcta BOOLEAN,
  recompensa_otorgada DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recargas
CREATE TABLE recargas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  metodo_qr_id UUID REFERENCES metodos_qr(id),
  monto DECIMAL(12,2) NOT NULL,
  comprobante_url TEXT,
  modo VARCHAR(50),
  estado VARCHAR(20) DEFAULT 'pendiente',
  admin_notas TEXT,
  procesado_por UUID REFERENCES usuarios(id),
  procesado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retiros
CREATE TABLE retiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  tarjeta_id UUID REFERENCES tarjetas_bancarias(id),
  monto DECIMAL(12,2) NOT NULL,
  tipo_billetera VARCHAR(20),
  estado VARCHAR(20) DEFAULT 'pendiente',
  admin_notas TEXT,
  procesado_por UUID REFERENCES usuarios(id),
  procesado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transacciones (historial financiero)
CREATE TABLE transacciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  tipo VARCHAR(50) NOT NULL,
  concepto VARCHAR(200),
  monto DECIMAL(12,2) NOT NULL,
  referencia_id UUID,
  referencia_tipo VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sorteos / premios ruleta
CREATE TABLE premios_ruleta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  valor DECIMAL(12,2),
  probabilidad DECIMAL(5,4) DEFAULT 0.1,
  icono VARCHAR(50),
  activo BOOLEAN DEFAULT TRUE,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sorteos_ganadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  premio_id UUID REFERENCES premios_ruleta(id),
  monto DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificaciones
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  titulo VARCHAR(200),
  mensaje TEXT,
  tipo VARCHAR(50),
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banners carrusel
CREATE TABLE banners_carrusel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imagen_url TEXT NOT NULL,
  titulo VARCHAR(200),
  enlace VARCHAR(500),
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuraciones
CREATE TABLE configuraciones (
  clave VARCHAR(100) PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs del sistema
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accion VARCHAR(100) NOT NULL,
  usuario_id UUID,
  detalle JSONB,
  ip VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_usuarios_telefono ON usuarios(telefono);
CREATE INDEX idx_usuarios_codigo_invitacion ON usuarios(codigo_invitacion);
CREATE INDEX idx_usuarios_nivel ON usuarios(nivel_id);
CREATE INDEX idx_actividad_usuario ON actividad_tareas(usuario_id);
CREATE INDEX idx_recargas_usuario ON recargas(usuario_id);
CREATE INDEX idx_retiros_usuario ON retiros(usuario_id);
CREATE INDEX idx_transacciones_usuario ON transacciones(usuario_id);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);

-- CONFIGURACIÓN DE PERMISOS (EJECUTAR ESTO SI HAY ERRORES DE "permission denied for schema public")
-- Otorgar uso del esquema público a los roles anon y authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Otorgar todos los privilegios sobre las tablas existentes
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Configurar permisos por defecto para futuras tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

