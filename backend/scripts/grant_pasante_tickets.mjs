
import { query, queryOne } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';

async function main() {
  try {
    logger.info('Iniciando asignación de tickets a Pasantes...');

    // 1. Obtener el ID del nivel "Pasante" (internar)
    const level = await queryOne('SELECT id FROM niveles WHERE codigo = "internar" OR nombre LIKE "%Pasante%" LIMIT 1');
    
    if (!level) {
      logger.error('No se encontró el nivel Pasante/internar');
      process.exit(1);
    }

    logger.info(`Nivel encontrado: ${level.id}`);

    // 2. Dar 1 ticket a todos los usuarios de ese nivel que tengan 0 tickets
    const result = await query(
      'UPDATE usuarios SET tickets_ruleta = 1 WHERE nivel_id = ? AND tickets_ruleta = 0',
      [level.id]
    );

    logger.info(`✅ Proceso completado. Filas afectadas: ${result.affectedRows}`);
    process.exit(0);
  } catch (err) {
    logger.error('Error en el script:', err);
    process.exit(1);
  }
}

main();
