import { query, queryOne, transaction } from '../src/config/db.mjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../src/utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script de Migración Segura e Idempotente v1.0.0
 * Ejecuta cambios en el esquema sin romper datos existentes.
 */

async function tableExists(tableName) {
  const rows = await query(`SHOW TABLES LIKE '${tableName}'`);
  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const rows = await query(`SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`);
  return rows.length > 0;
}

async function indexExists(tableName, indexName) {
  const rows = await query(`SHOW INDEX FROM ${tableName} WHERE Key_name = '${indexName}'`);
  return rows.length > 0;
}

async function runMigrations() {
  logger.info('Iniciando migración segura de base de datos...');

  try {
    // 1. Tabla sorteo_config_personalizada
    if (!await tableExists('sorteo_config_personalizada')) {
      logger.info('Creando tabla sorteo_config_personalizada...');
      await query(`
        CREATE TABLE sorteo_config_personalizada (
          id VARCHAR(36) PRIMARY KEY,
          target_type ENUM('usuario', 'nivel') NOT NULL,
          target_id VARCHAR(36) NOT NULL,
          premio_id_forzado VARCHAR(36) NULL,
          activa TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_sorteo_target (target_type, target_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // 2. Asegurar columnas en tabla usuarios
    if (!await columnExists('usuarios', 'telegram_user_id')) {
      logger.info('Agregando columna telegram_user_id a usuarios...');
      await query('ALTER TABLE usuarios ADD COLUMN telegram_user_id VARCHAR(50) NULL');
    }
    if (!await columnExists('usuarios', 'telegram_username')) {
      logger.info('Agregando columna telegram_username a usuarios...');
      await query('ALTER TABLE usuarios ADD COLUMN telegram_username VARCHAR(100) NULL');
    }
    if (!await indexExists('usuarios', 'idx_usuarios_telegram_user_id')) {
      logger.info('Creando índice idx_usuarios_telegram_user_id...');
      await query('CREATE INDEX idx_usuarios_telegram_user_id ON usuarios(telegram_user_id)');
    }

    // 3. Corregir metodos_qr (VARCHAR en lugar de TEXT para DEFAULT)
    if (await tableExists('metodos_qr')) {
      logger.info('Verificando metodos_qr.dias_semana...');
      await query('ALTER TABLE metodos_qr MODIFY COLUMN dias_semana VARCHAR(20) DEFAULT "0,1,2,3,4,5,6"');
    }

    // 4. Seed de Premios Ruleta si está vacía
    const premios = await query('SELECT COUNT(*) as total FROM premios_ruleta');
    if (premios[0].total === 0) {
      logger.info('Insertando premios base en la ruleta...');
      const basePremios = [
        { nombre: '1 BOB', tipo: 'comision', valor: 1.00, prob: 40, color: '#4f46e5' },
        { nombre: '3 BOB', tipo: 'comision', valor: 3.00, prob: 25, color: '#7c3aed' },
        { nombre: '5 BOB', tipo: 'comision', valor: 5.00, prob: 15, color: '#2563eb' },
        { nombre: '10 BOB', tipo: 'comision', valor: 10.00, prob: 5, color: '#0891b2' },
        { nombre: '1 Ticket', tipo: 'tickets', valor: 1.00, prob: 10, color: '#059669' },
        { nombre: 'Nada', tipo: 'nada', valor: 0.00, prob: 5, color: '#64748b' }
      ];

      for (let i = 0; i < basePremios.length; i++) {
        const p = basePremios[i];
        await query(
          'INSERT INTO premios_ruleta (id, nombre, tipo, valor, probabilidad, activo, orden) VALUES (?, ?, ?, ?, ?, 1, ?)',
          [uuidv4(), p.nombre, p.tipo, p.valor, p.prob, i]
        );
      }
    }

    logger.info('Migraciones completadas con éxito.');
  } catch (err) {
    logger.error('Error crítico durante la migración:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigrations();
