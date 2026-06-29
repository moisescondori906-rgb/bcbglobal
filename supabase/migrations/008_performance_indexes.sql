-- Índices adicionales para alta concurrencia (idempotente)
CREATE INDEX IF NOT EXISTS idx_movimientos_saldo_usuario_id ON movimientos_saldo(usuario_id);
