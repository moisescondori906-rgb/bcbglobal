-- Migración para gestión de turnos de administradores
-- Ejecutar en Supabase SQL Editor

-- 1. Añadir campos de turno a la tabla admins
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS hora_inicio_turno TIME DEFAULT '00:00',
ADD COLUMN IF NOT EXISTS hora_fin_turno TIME DEFAULT '23:59',
ADD COLUMN IF NOT EXISTS recibe_notificaciones BOOLEAN DEFAULT true;

-- 2. Ejemplo de actualización para Moisés (Turno Mañana)
UPDATE admins 
SET hora_inicio_turno = '08:00', hora_fin_turno = '16:00'
WHERE nombre = 'Moisés';

-- 3. Ejemplo de actualización para Chavo_del8 (Turno Tarde/Noche)
UPDATE admins 
SET hora_inicio_turno = '16:00', hora_fin_turno = '00:00'
WHERE nombre = 'Chavo_del8';
