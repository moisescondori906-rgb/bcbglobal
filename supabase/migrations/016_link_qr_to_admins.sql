-- BCB GLOBAL - Vincular imágenes QR a administradores específicos
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna admin_id a metodos_qr
ALTER TABLE metodos_qr
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES admins(id) ON DELETE CASCADE;

-- 2. Agregar columna seleccionada para marcar el QR principal del admin
ALTER TABLE metodos_qr
ADD COLUMN IF NOT EXISTS seleccionada BOOLEAN DEFAULT FALSE;

-- 3. Comentarios para documentación
COMMENT ON COLUMN metodos_qr.admin_id IS 'ID del administrador al que pertenece esta imagen QR';
COMMENT ON COLUMN metodos_qr.seleccionada IS 'Indica si este es el QR principal/seleccionado del administrador';

-- 4. Crear un índice para mejorar las búsquedas por admin_id
CREATE INDEX IF NOT EXISTS idx_metodos_qr_admin_id ON metodos_qr(admin_id);

