-- Migración para trazabilidad de retiros y perfiles de administrador Telegram
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar campos de Telegram a la tabla de usuarios (para admins)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS telegram_user_id VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS telegram_first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS telegram_last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS telegram_activo BOOLEAN DEFAULT TRUE;

-- 2. Ampliar la tabla de retiros para trazabilidad completa
ALTER TABLE retiros
ADD COLUMN IF NOT EXISTS taken_by_admin_id UUID REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS taken_by_admin_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processed_by_admin_id UUID REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS processed_by_admin_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by_admin_id UUID REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS telegram_message_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);

-- 3. Asegurar que el estado 'en_proceso' sea válido en la lógica (aunque es VARCHAR)
-- No requiere cambios estructurales si ya es VARCHAR(20).

-- 4. Índices para mejorar rendimiento de búsquedas por Telegram
CREATE INDEX IF NOT EXISTS idx_usuarios_telegram_id ON usuarios(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_retiros_taken_by ON retiros(taken_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_retiros_estado ON retiros(estado);
