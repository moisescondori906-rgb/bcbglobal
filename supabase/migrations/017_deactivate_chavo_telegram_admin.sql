-- Congelar administrador de Telegram Chavo_del8 (sin borrar historial / FKs).
-- Reactivar: UPDATE admins SET activo = true WHERE telegram_user_id = '710479386';
UPDATE admins
SET activo = false
WHERE telegram_user_id = '710479386'
   OR nombre = 'Chavo_del8';
