
-- Migración: Mejoras anti-fraude
-- Fecha: 2026-06-30

-- 1. Agregar campos a la tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS fingerprint TEXT NULL,
ADD COLUMN IF NOT EXISTS last_fingerprint_at TIMESTAMP NULL;

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_usuarios_fingerprint ON usuarios(fingerprint);
CREATE INDEX IF NOT EXISTS idx_usuarios_last_device_id ON usuarios(last_device_id);

-- 3. Actualizar los datos existentes
UPDATE usuarios 
SET fingerprint = last_device_id 
WHERE fingerprint IS NULL AND last_device_id IS NOT NULL;
