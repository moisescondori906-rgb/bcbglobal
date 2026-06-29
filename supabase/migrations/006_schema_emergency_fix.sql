-- BCB GLOBAL - Schema Fix for Task Activity and Earnings
-- Execute in Supabase SQL Editor

-- 1. Add nivel_id to actividad_tareas and comentario_ingles to tareas
ALTER TABLE actividad_tareas ADD COLUMN IF NOT EXISTS nivel_id UUID REFERENCES niveles(id);
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS comentario_ingles TEXT;

-- 2. Ensure movimientos_saldo exists (Redundant check from 005)
CREATE TABLE IF NOT EXISTS movimientos_saldo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_movimiento VARCHAR(50) NOT NULL,
  origen_id UUID,
  monto DECIMAL(12,2) NOT NULL,
  saldo_anterior DECIMAL(12,2),
  saldo_nuevo DECIMAL(12,2),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  nivel_id_momento UUID REFERENCES niveles(id),
  referencia VARCHAR(100) UNIQUE,
  descripcion TEXT,
  procesado_saldo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure accounting columns exist in usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ganancias_hoy DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ganancias_ayer DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ganancias_semana DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ganancias_mes DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ganancias_totales DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tareas_completadas_exito INTEGER DEFAULT 0;

-- 4. Enable Realtime for the new table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE movimientos_saldo;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

