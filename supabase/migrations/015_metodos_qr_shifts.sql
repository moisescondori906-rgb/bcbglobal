-- BCB GLOBAL - Agregar horarios a métodos QR
-- Ejecutar en Supabase SQL Editor

ALTER TABLE metodos_qr
ADD COLUMN IF NOT EXISTS dias_semana TEXT DEFAULT '0,1,2,3,4,5,6',
ADD COLUMN IF NOT EXISTS hora_inicio TIME DEFAULT '00:00:00',
ADD COLUMN IF NOT EXISTS hora_fin TIME DEFAULT '23:59:59';

COMMENT ON COLUMN metodos_qr.dias_semana IS 'Días de la semana en los que este QR es visible (0-6, sep por coma)';
COMMENT ON COLUMN metodos_qr.hora_inicio IS 'Hora de inicio de visibilidad';
COMMENT ON COLUMN metodos_qr.hora_fin IS 'Hora de fin de visibilidad';

