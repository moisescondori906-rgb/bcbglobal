-- BCB GLOBAL - Datos de ejemplo (seed)
-- Ejecutar después de 001_initial_schema.sql

-- Niveles según especificación
INSERT INTO niveles (codigo, nombre, deposito, ingreso_diario, num_tareas_diarias, comision_por_tarea, ingreso_mensual, ingreso_anual, orden) VALUES
('internar', 'pasante', 0, 7.20, 4, 1.80, NULL, NULL, 0),
('S1', 'S1', 200.00, 7.20, 4, 1.80, 216.00, 2628.00, 1),
('S2', 'S2', 720.00, 25.76, 8, 3.22, 772.80, 9402.40, 2),
('S3', 'S3', 2830.00, 101.40, 15, 6.76, 3042.00, 37011.00, 3),
('S4', 'S4', 9150.00, 339.90, 30, 11.33, 10197.00, 124063.50, 4),
('S5', 'S5', 28200.00, 1045.80, 60, 17.43, 31374.00, 381717.00, 5),
('S6', 'S6', 58000.00, 2235.00, 100, 22.35, 67050.00, 815775.00, 6),
('S7', 'S7', 124000.00, 4961.60, 160, 31.01, 148848.00, 1810984.00, 7),
('S8', 'S8', 299400.00, 11977.50, 250, 47.91, 359325.00, 4371787.50, 8),
('S9', 'S9', 541600.00, 23548.00, 400, 58.87, 706440.00, 8595020.00, 9);

-- Configuraciones por defecto
INSERT INTO configuraciones (clave, valor) VALUES
('modo_mantenimiento', 'false'),
('horario_recarga_inicio', '09:00'),
('horario_recarga_fin', '18:00'),
('horario_retiro_inicio', '09:30'),
('horario_retiro_fin', '17:30'),
('limite_retiros_usuario', '1'),
('montos_retiro', '[25, 100, 500, 1500, 5000, 10000]'),
('s4_personas_s3', '10'),
('s4_personas_debajo_s3', '15');

