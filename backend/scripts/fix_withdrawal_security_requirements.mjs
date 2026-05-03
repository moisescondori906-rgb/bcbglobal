import { query } from '../src/config/db.mjs';
import logger from '../src/utils/logger.mjs';

async function migrate() {
  logger.info('Iniciando migración de seguridad para retiros...');

  try {
    // 1. En tabla usuarios: Asegurar password_fondo_hash (ya existe en schema, pero por si acaso)
    await query(`
      ALTER TABLE usuarios 
      MODIFY COLUMN password_fondo_hash VARCHAR(255) NULL
    `).catch(err => logger.info('password_fondo_hash ya configurado o error menor: ' + err.message));

    // 2. En tabla tarjetas_bancarias (cuentas bancarias):
    // Agregar ci_nit, activa, principal si no existen
    const columnsTarjetas = await query(`SHOW COLUMNS FROM tarjetas_bancarias`);
    const hasCiNit = columnsTarjetas.some(c => c.Field === 'ci_nit');
    const hasActiva = columnsTarjetas.some(c => c.Field === 'activa');
    const hasPrincipal = columnsTarjetas.some(c => c.Field === 'principal');

    if (!hasCiNit) {
      await query(`ALTER TABLE tarjetas_bancarias ADD COLUMN ci_nit VARCHAR(50) NULL AFTER nombre_titular`);
      logger.info('Columna ci_nit agregada a tarjetas_bancarias');
    }
    if (!hasActiva) {
      await query(`ALTER TABLE tarjetas_bancarias ADD COLUMN activa TINYINT(1) DEFAULT 1 AFTER ci_nit`);
      logger.info('Columna activa agregada a tarjetas_bancarias');
    }
    if (!hasPrincipal) {
      await query(`ALTER TABLE tarjetas_bancarias ADD COLUMN principal TINYINT(1) DEFAULT 0 AFTER activa`);
      logger.info('Columna principal agregada a tarjetas_bancarias');
    }

    // 3. En tabla retiros:
    // Agregar cuenta_bancaria_id, comprobante_url, comprobante_public_id, password_fondo_validado
    const columnsRetiros = await query(`SHOW COLUMNS FROM retiros`);
    const hasCuentaId = columnsRetiros.some(c => c.Field === 'cuenta_bancaria_id');
    const hasComprobanteUrl = columnsRetiros.some(c => c.Field === 'comprobante_url');
    const hasComprobantePublicId = columnsRetiros.some(c => c.Field === 'comprobante_public_id');
    const hasPassValidado = columnsRetiros.some(c => c.Field === 'password_fondo_validado');

    if (!hasCuentaId) {
      await query(`ALTER TABLE retiros ADD COLUMN cuenta_bancaria_id VARCHAR(36) NULL AFTER datos_bancarios`);
      logger.info('Columna cuenta_bancaria_id agregada a retiros');
    }
    if (!hasComprobanteUrl) {
      await query(`ALTER TABLE retiros ADD COLUMN comprobante_url TEXT NULL AFTER cuenta_bancaria_id`);
      logger.info('Columna comprobante_url agregada a retiros');
    }
    if (!hasComprobantePublicId) {
      await query(`ALTER TABLE retiros ADD COLUMN comprobante_public_id VARCHAR(255) NULL AFTER comprobante_url`);
      logger.info('Columna comprobante_public_id agregada a retiros');
    }
    if (!hasPassValidado) {
      await query(`ALTER TABLE retiros ADD COLUMN password_fondo_validado TINYINT(1) DEFAULT 0 AFTER comprobante_public_id`);
      logger.info('Columna password_fondo_validado agregada a retiros');
    }

    logger.info('Migración completada exitosamente.');
    process.exit(0);
  } catch (err) {
    logger.error('Error durante la migración: ' + err.message);
    process.exit(1);
  }
}

migrate();
