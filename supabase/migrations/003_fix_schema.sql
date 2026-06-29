-- BCB GLOBAL - Fix schema columns and types
-- Ejecutar en Supabase SQL Editor

-- 1. Añadir columna activo a niveles si no existe
ALTER TABLE niveles ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE niveles ADD COLUMN IF NOT EXISTS costo DECIMAL(12,2) DEFAULT 0;
ALTER TABLE niveles ADD COLUMN IF NOT EXISTS deposito DECIMAL(12,2) DEFAULT 0;
ALTER TABLE niveles ADD COLUMN IF NOT EXISTS tareas_diarias INTEGER DEFAULT 0;
ALTER TABLE niveles ADD COLUMN IF NOT EXISTS ganancia_tarea DECIMAL(12,2) DEFAULT 0;
ALTER TABLE niveles ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE niveles ADD CONSTRAINT unique_nivel_codigo UNIQUE (codigo);

-- 2. Añadir columnas a tareas para coincidir con seed.js y backend
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS pregunta TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS respuesta_correcta TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS opciones JSONB;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS recompensa DECIMAL(12,2) DEFAULT 0;

-- 3. Asegurar que actividad_tareas tenga recompensa_otorgada
ALTER TABLE actividad_tareas ADD COLUMN IF NOT EXISTS recompensa_otorgada DECIMAL(12,2) DEFAULT 0;

-- 3.1 Asegurar que premios_ruleta tenga imagen_url y color
ALTER TABLE premios_ruleta ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE premios_ruleta ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE premios_ruleta ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE premios_ruleta ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

-- 4. Añadir restricción única para permitir upsert por nombre y nivel
ALTER TABLE tareas ADD CONSTRAINT unique_tarea_nombre_nivel UNIQUE (nombre, nivel_id);

-- 5. Crear tablas para la Ruleta Especial
CREATE TABLE IF NOT EXISTS premios_ruleta_especial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    valor DECIMAL(12,2) DEFAULT 0,
    probabilidad DECIMAL(12,2) DEFAULT 0,
    color TEXT,
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS sorteos_ganadores_especial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id),
    premio_id UUID REFERENCES premios_ruleta_especial(id),
    monto DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Asegurar que usuarios tenga todas las columnas necesarias
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS saldo_principal DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS saldo_comisiones DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS recompensa_invitacion DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS oportunidades_sorteo INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS oportunidades_sorteo_especial INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_fondo_hash TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_device_id TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre_real TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS invitado_por UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nivel_id UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigo_invitacion TEXT;
ALTER TABLE usuarios ADD CONSTRAINT unique_codigo_invitacion UNIQUE (codigo_invitacion);

-- 7. (Opcional) Cambiar tipos de ID a TEXT si se prefiere usar IDs de seed.js, 
-- pero se recomienda usar UUIDs. Si prefieres seguir usando UUIDs, NO ejecutes esto.
-- ALTER TABLE niveles ALTER COLUMN id TYPE TEXT;
-- ALTER TABLE tareas ALTER COLUMN id TYPE TEXT;
-- ALTER TABLE usuarios ALTER COLUMN id TYPE TEXT;
-- ALTER TABLE actividad_tareas ALTER COLUMN tarea_id TYPE TEXT;

