-- BCB GLOBAL - Unified Earnings and Event-based Accounting
-- Execute in Supabase SQL Editor

-- 1. Create the movements table
CREATE TABLE IF NOT EXISTS movimientos_saldo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_movimiento VARCHAR(50) NOT NULL, -- 'ganancia_tarea', 'comision_subordinado', 'recompensa_invitacion', 'recarga', 'retiro', 'ajuste_admin'
  origen_id UUID, -- ID of the related task activity, recharge, withdrawal, etc.
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

-- 2. Add accounting columns to usuarios (as a cache for real-time display)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ganancias_hoy DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ganancias_ayer DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ganancias_semana DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ganancias_mes DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ganancias_totales DECIMAL(12,2) DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tareas_completadas_exito INTEGER DEFAULT 0;

-- 3. Indices for faster period calculations
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_fecha ON movimientos_saldo(usuario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_saldo(tipo_movimiento);

-- 4. Enable Realtime for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE movimientos_saldo;
ALTER PUBLICATION supabase_realtime ADD TABLE usuarios; -- Ensure users table is also in realtime

-- 5. Update existing transactions to movements (optional, but good for consistency if table exists)
-- This depends on if there's data in the 'transacciones' table already. 
-- Since we want a fresh start, we'll focus on new entries.

