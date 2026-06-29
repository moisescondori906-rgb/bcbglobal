-- BCB GLOBAL - Registro de QR de cobro para gestión desde Telegram
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla qr_registros
CREATE TABLE IF NOT EXISTS qr_registros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_original_id UUID REFERENCES metodos_qr(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  imagen_url TEXT NOT NULL,
  estado VARCHAR(20) DEFAULT 'no_pagado', -- 'no_pagado' o 'pagado'
  monto DECIMAL(12,2),
  numero_cuenta VARCHAR(100),
  observaciones TEXT,
  fecha_pagado TIMESTAMPTZ,
  procesado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  telegram_chat_id VARCHAR(50),
  telegram_message_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_qr_registros_estado ON qr_registros(estado);
CREATE INDEX IF NOT EXISTS idx_qr_registros_usuario ON qr_registros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_qr_registros_fecha ON qr_registros(created_at);

-- 3. Agregar comentarios de documentación
COMMENT ON TABLE qr_registros IS 'Registro de códigos QR de cobro recibidos para gestión desde Telegram';
COMMENT ON COLUMN qr_registros.estado IS 'Estado del QR: no_pagado o pagado';
COMMENT ON COLUMN qr_registros.fecha_pagado IS 'Fecha y hora en que el QR fue marcado como pagado';
