import { query } from '../../config/db.mjs';
import logger from '../../lib/logger.mjs';

/**
 * Script para crear índices SQL de optimización
 * Ejecutar con: node src/data/create-indices.js
 */
async function createIndices() {
  logger.info('🔧 Creando índices de optimización...');

  const indices = [
    { name: 'idx_calendario_fecha', table: 'calendario_operativo', columns: '(fecha)' },
    { name: 'idx_banners_activo', table: 'banners_carrusel', columns: '(activo)' },
    { name: 'idx_config_clave', table: 'configuraciones', columns: '(clave)' },
    { name: 'idx_mensajes_activo_fecha', table: 'mensajes_globales', columns: '(activo, fecha)' },
    { name: 'idx_usuarios_telefono', table: 'usuarios', columns: '(telefono)' },
    { name: 'idx_usuarios_nivel', table: 'usuarios', columns: '(nivel_id)' },
    { name: 'idx_tareas_activa', table: 'tareas', columns: '(activa)' },
    { name: 'idx_transacciones_usuario', table: 'transacciones', columns: '(usuario_id, fecha)' },
  ];

  for (const idx of indices) {
    try {
      await query(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} ${idx.columns}`);
      logger.info(`✅ Índice ${idx.name} creado o ya existe`);
    } catch (err) {
      if (err.message.includes('Duplicate')) {
        logger.info(`ℹ️ Índice ${idx.name} ya existe`);
      } else {
        logger.error(`❌ Error creando ${idx.name}: ${err.message}`);
      }
    }
  }

  logger.info('✅ Proceso de índices completado.');
  process.exit(0);
}

createIndices().catch(err => {
  logger.error('❌ Error fatal:', err);
  process.exit(1);
});
