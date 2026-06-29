-- BCB GLOBAL - Agregar columnas de QR y Turnos a la tabla admins
-- Ejecutar en Supabase SQL Editor

ALTER TABLE admins
ADD COLUMN IF NOT EXISTS qr_base64 TEXT,
ADD COLUMN IF NOT EXISTS dias_semana TEXT DEFAULT '1,2,3,4,5',
ADD COLUMN IF NOT EXISTS hora_inicio_turno TIME DEFAULT '00:00:00',
ADD COLUMN IF NOT EXISTS hora_fin_turno TIME DEFAULT '23:59:59',
ADD COLUMN IF NOT EXISTS recibe_notificaciones BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN admins.qr_base64 IS 'Imagen QR de cobro del administrador en formato Base64';
COMMENT ON COLUMN admins.dias_semana IS 'Días de la semana en los que el admin está de turno (0-6, separados por coma)';

