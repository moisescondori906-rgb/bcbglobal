-- 1. Añadir columnas de teléfono y turno dinámico a la tabla admins
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS en_turno_recarga BOOLEAN DEFAULT false;

-- 2. Actualizar administradores existentes con sus números de teléfono
-- Moisés
UPDATE admins SET telefono = '67091817' WHERE nombre = 'Moisés';
-- Chavo_del8 (si existe, le ponemos el otro número para estar listos)
UPDATE admins SET telefono = '67470858' WHERE nombre = 'Chavo_del8';

-- 3. Añadir configuración global para notificaciones en el grupo
INSERT INTO configuraciones (clave, valor)
VALUES ('notificar_grupo_recargas_siempre', 'false')
ON CONFLICT (clave) DO NOTHING;

-- 4. Crear un índice por teléfono para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_admins_telefono ON admins(telefono);
