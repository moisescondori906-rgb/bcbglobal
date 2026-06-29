-- Migración para el sistema de gestión de Telegram v2
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla de administradores si no existe
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    telegram_user_id VARCHAR(50) UNIQUE NOT NULL,
    telegram_username VARCHAR(100),
    rol VARCHAR(50) DEFAULT 'admin',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insertar administradores iniciales
INSERT INTO admins (nombre, telegram_user_id, rol, activo)
VALUES 
('Moisés', '6896414316', 'admin', true),
('Chavo_del8', '710479386', 'admin', true)
ON CONFLICT (telegram_user_id) DO UPDATE 
SET nombre = EXCLUDED.nombre, activo = EXCLUDED.activo;

-- 3. Actualizar tabla de retiros para auditoría completa
ALTER TABLE retiros 
ADD COLUMN IF NOT EXISTS taken_by_admin_id UUID REFERENCES admins(id),
ADD COLUMN IF NOT EXISTS taken_by_admin_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processed_by_admin_id UUID REFERENCES admins(id),
ADD COLUMN IF NOT EXISTS processed_by_admin_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by_admin_id UUID REFERENCES admins(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS telegram_message_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);

-- 4. Actualizar tabla de recargas para auditoría
ALTER TABLE recargas
ADD COLUMN IF NOT EXISTS procesado_por_admin_id UUID REFERENCES admins(id),
ADD COLUMN IF NOT EXISTS procesado_por_admin_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS procesado_at TIMESTAMPTZ;

-- 5. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_admins_telegram_id ON admins(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_retiros_taken_by_v2 ON retiros(taken_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_retiros_processed_by_v2 ON retiros(processed_by_admin_id);
