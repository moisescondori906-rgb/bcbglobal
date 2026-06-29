-- BCB GLOBAL - Agregar horarios de retiro por nivel
-- Ejecutar en Supabase SQL Editor

ALTER TABLE niveles
ADD COLUMN retiro_dia_inicio INT DEFAULT 1, -- 0=Domingo, 1=Lunes, etc.
ADD COLUMN retiro_dia_fin INT DEFAULT 5,
ADD COLUMN retiro_hora_inicio TIME DEFAULT '09:00:00',
ADD COLUMN retiro_hora_fin TIME DEFAULT '18:00:00',
ADD COLUMN retiro_horario_habilitado BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN niveles.retiro_dia_inicio IS 'Día de inicio de retiros (0=Domingo, 1=Lunes, ..., 6=Sábado)';
COMMENT ON COLUMN niveles.retiro_dia_fin IS 'Día de fin de retiros (0=Domingo, 1=Lunes, ..., 6=Sábado)';
COMMENT ON COLUMN niveles.retiro_hora_inicio IS 'Hora de inicio de retiros (HH:mm:ss)';
COMMENT ON COLUMN niveles.retiro_hora_fin IS 'Hora de fin de retiros (HH:mm:ss)';
COMMENT ON COLUMN niveles.retiro_horario_habilitado IS 'Si es TRUE, se valida este horario específico para el nivel. Si es FALSE, usa el global.';

