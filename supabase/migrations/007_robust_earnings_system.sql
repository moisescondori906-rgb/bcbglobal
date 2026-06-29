-- BCB GLOBAL - Robust Earnings System and Schema Synchronization
-- Execute in Supabase SQL Editor to fix earnings saving issues

-- 1. Ensure all necessary extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Robust creation/verification of movimientos_saldo
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

-- 3. Ensure accounting columns exist in usuarios table
DO $$ 
BEGIN
  -- Saldo principal (debería existir, pero aseguramos tipo)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='saldo_principal') THEN
    ALTER TABLE usuarios ADD COLUMN saldo_principal DECIMAL(12,2) DEFAULT 0;
  END IF;

  -- Columnas de caché de ganancias
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='ganancias_hoy') THEN
    ALTER TABLE usuarios ADD COLUMN ganancias_hoy DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='ganancias_ayer') THEN
    ALTER TABLE usuarios ADD COLUMN ganancias_ayer DECIMAL(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='ganancias_semana') THEN
    ALTER TABLE usuarios ADD COLUMN ganancias_semana DECIMAL(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='ganancias_mes') THEN
    ALTER TABLE usuarios ADD COLUMN ganancias_mes DECIMAL(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='ganancias_totales') THEN
    ALTER TABLE usuarios ADD COLUMN ganancias_totales DECIMAL(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='tareas_completadas_exito') THEN
    ALTER TABLE usuarios ADD COLUMN tareas_completadas_exito INTEGER DEFAULT 0;
  END IF;
END $$;

-- 4. ATOMIC EARNINGS FUNCTION (RPC)
-- This function ensures that both the movement is recorded and the user balance is updated in one transaction.
CREATE OR REPLACE FUNCTION acreditar_ganancia(
  p_usuario_id UUID,
  p_monto DECIMAL,
  p_tipo VARCHAR,
  p_origen_id UUID,
  p_descripcion TEXT,
  p_referencia VARCHAR
) RETURNS JSON AS $$
DECLARE
  v_saldo_anterior DECIMAL;
  v_saldo_nuevo DECIMAL;
  v_user_exists BOOLEAN;
  v_nivel_id UUID;
BEGIN
  -- Check if user exists and get current balance/level
  SELECT saldo_principal, nivel_id, TRUE 
  INTO v_saldo_anterior, v_nivel_id, v_user_exists 
  FROM usuarios 
  WHERE id = p_usuario_id;

  IF NOT v_user_exists THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  v_saldo_nuevo := v_saldo_anterior + p_monto;

  -- 1. Insert Movement
  INSERT INTO movimientos_saldo (
    usuario_id, tipo_movimiento, origen_id, monto, 
    saldo_anterior, saldo_nuevo, nivel_id_momento, 
    descripcion, referencia, fecha
  ) VALUES (
    p_usuario_id, p_tipo, p_origen_id, p_monto,
    v_saldo_anterior, v_saldo_nuevo, v_nivel_id,
    p_descripcion, p_referencia, NOW()
  );

  -- 2. Update User Balance and Cache
  UPDATE usuarios SET
    saldo_principal = v_saldo_nuevo,
    saldo_comisiones = CASE WHEN p_tipo = 'comision_subordinado' THEN saldo_comisiones + p_monto ELSE saldo_comisiones END,
    ganancias_totales = ganancias_totales + p_monto,
    ganancias_hoy = ganancias_hoy + p_monto,
    ganancias_semana = ganancias_semana + p_monto,
    ganancias_mes = ganancias_mes + p_monto,
    tareas_completadas_exito = CASE WHEN p_tipo = 'ganancia_tarea' THEN tareas_completadas_exito + 1 ELSE tareas_completadas_exito END,
    updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object(
    'success', true, 
    'nuevo_saldo', v_saldo_nuevo,
    'monto_acreditado', p_monto
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RE-GRANT PERMISSIONS
-- Ensure PostgREST and users can access everything
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Enable Realtime explicitly
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Remove if exists to avoid error, then add
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS movimientos_saldo, usuarios;
    ALTER PUBLICATION supabase_realtime ADD TABLE movimientos_saldo, usuarios;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 7. Force schema cache reload (Hint for PostgREST)
NOTIFY pgrst, 'reload schema';


