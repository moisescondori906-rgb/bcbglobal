-- BCB GLOBAL - Sistema de Cuestionario y Castigos
-- Ejecutar en Supabase SQL Editor

-- Tabla para registrar quién respondió el cuestionario hoy
CREATE TABLE IF NOT EXISTS respuestas_cuestionario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, fecha)
);

-- Columna para marcar castigo de un día
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS castigado_hasta DATE;

-- Comentario explicativo
COMMENT ON COLUMN usuarios.castigado_hasta IS 'Fecha hasta la cual el usuario tiene bloqueadas tareas y comisiones por no responder el cuestionario';

