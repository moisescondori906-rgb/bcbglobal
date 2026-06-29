-- SQL para agregar columnas faltantes en Supabase
-- Ejecutar este comando en el SQL Editor de tu panel de Supabase

-- 1. Agregar columna para tickets de ruleta
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS tickets_ruleta INTEGER DEFAULT 0;

-- 2. Agregar flag para el primer ascenso (regla de tickets por ascenso)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS primer_ascenso_completado BOOLEAN DEFAULT FALSE;

-- 3. Asegurar que la tabla sorteos_ganadores exista y tenga la estructura correcta
CREATE TABLE IF NOT EXISTS sorteos_ganadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id),
    premio_id UUID REFERENCES premios_ruleta(id),
    monto DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
