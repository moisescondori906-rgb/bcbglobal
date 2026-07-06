import { query } from '../src/config/db.mjs';

function escapeSql(str) {
  return `'${String(str).replace(/'/g, "\\'")}'`;
}

async function columnExists(table, column) {
  const result = await query(`SHOW COLUMNS FROM ${table} LIKE ${escapeSql(column)}`);
  return result.length > 0;
}

async function indexExists(table, indexName) {
  const result = await query(`SHOW INDEX FROM ${table} WHERE Key_name = ${escapeSql(indexName)}`);
  return result.length > 0;
}

async function tableExists(tableName) {
  const result = await query(`SHOW TABLES LIKE ${escapeSql(tableName)}`);
  return result.length > 0;
}

async function ensureRetiroSponsorColumns() {
  const columns = [
    ['patrocinador_id', 'ALTER TABLE retiros ADD COLUMN patrocinador_id VARCHAR(36) NULL AFTER fecha_dia'],
    ['procesado_por_patrocinador', 'ALTER TABLE retiros ADD COLUMN procesado_por_patrocinador VARCHAR(36) NULL AFTER patrocinador_id'],
    ['procesado_por_patrocinador_at', 'ALTER TABLE retiros ADD COLUMN procesado_por_patrocinador_at TIMESTAMP NULL AFTER procesado_por_patrocinador'],
    ['estado_patrocinador', "ALTER TABLE retiros ADD COLUMN estado_patrocinador VARCHAR(50) NULL DEFAULT 'Verificando' AFTER procesado_por_patrocinador_at"],
    ['aprobado_por_patrocinador', 'ALTER TABLE retiros ADD COLUMN aprobado_por_patrocinador TINYINT(1) DEFAULT 0 AFTER estado_patrocinador'],
    ['motivo_rechazo_patrocinador', 'ALTER TABLE retiros ADD COLUMN motivo_rechazo_patrocinador TEXT NULL AFTER aprobado_por_patrocinador'],
    ['fecha_aprobacion_patrocinador', 'ALTER TABLE retiros ADD COLUMN fecha_aprobacion_patrocinador TIMESTAMP NULL AFTER motivo_rechazo_patrocinador']
  ];

  for (const [name, sql] of columns) {
    if (!await columnExists('retiros', name)) {
      console.log(`➕ Agregando retiros.${name}`);
      await query(sql);
    }
  }

  if (!await indexExists('retiros', 'idx_retiros_patrocinador') && await columnExists('retiros', 'patrocinador_id')) {
    console.log('➕ Creando índice idx_retiros_patrocinador');
    await query('ALTER TABLE retiros ADD INDEX idx_retiros_patrocinador (patrocinador_id)');
  }
}

async function ensureLimitesTable() {
  if (!await tableExists('limites_retiros_pasantia')) {
    console.log('➕ Creando tabla limites_retiros_pasantia');
    await query(`
      CREATE TABLE limites_retiros_pasantia (
        id VARCHAR(36) PRIMARY KEY,
        patrocinador_id VARCHAR(36) NOT NULL UNIQUE,
        total_aprobados INT DEFAULT 0,
        maximo_por_patrocinador INT DEFAULT 15,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_limites_patrocinador (patrocinador_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    return;
  }

  if (!await columnExists('limites_retiros_pasantia', 'total_aprobados')) {
    console.log('➕ Agregando limites_retiros_pasantia.total_aprobados');
    await query('ALTER TABLE limites_retiros_pasantia ADD COLUMN total_aprobados INT DEFAULT 0');
    if (await columnExists('limites_retiros_pasantia', 'retiros_aprobados')) {
      await query('UPDATE limites_retiros_pasantia SET total_aprobados = COALESCE(retiros_aprobados, total_aprobados)');
    }
  }

  if (!await columnExists('limites_retiros_pasantia', 'maximo_por_patrocinador')) {
    console.log('➕ Agregando limites_retiros_pasantia.maximo_por_patrocinador');
    await query('ALTER TABLE limites_retiros_pasantia ADD COLUMN maximo_por_patrocinador INT DEFAULT 15');
    if (await columnExists('limites_retiros_pasantia', 'max_retiros')) {
      await query('UPDATE limites_retiros_pasantia SET maximo_por_patrocinador = COALESCE(max_retiros, maximo_por_patrocinador)');
    }
  }

  if (!await columnExists('limites_retiros_pasantia', 'created_at')) {
    console.log('➕ Agregando limites_retiros_pasantia.created_at');
    await query('ALTER TABLE limites_retiros_pasantia ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  }

  if (!await columnExists('limites_retiros_pasantia', 'updated_at')) {
    console.log('➕ Agregando limites_retiros_pasantia.updated_at');
    await query('ALTER TABLE limites_retiros_pasantia ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  }

  if (!await indexExists('limites_retiros_pasantia', 'idx_limites_patrocinador') && await columnExists('limites_retiros_pasantia', 'patrocinador_id')) {
    console.log('➕ Creando índice idx_limites_patrocinador');
    await query('ALTER TABLE limites_retiros_pasantia ADD INDEX idx_limites_patrocinador (patrocinador_id)');
  }
}

async function ensureAuditoriaOperacionesTable() {
  if (!await tableExists('auditoria_operaciones')) {
    console.log('➕ Creando tabla auditoria_operaciones');
    await query(`
      CREATE TABLE auditoria_operaciones (
        id VARCHAR(36) PRIMARY KEY,
        tipo_operacion VARCHAR(50) NOT NULL,
        usuario_id VARCHAR(36) NULL,
        patrocinador_id VARCHAR(36) NULL,
        admin_id VARCHAR(36) NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado_anterior VARCHAR(50) NULL,
        estado_nuevo VARCHAR(50) NULL,
        motivo TEXT NULL,
        metadata JSON NULL,
        INDEX idx_auditoria_operaciones_tipo_fecha (tipo_operacion, fecha),
        INDEX idx_auditoria_operaciones_usuario (usuario_id),
        INDEX idx_auditoria_operaciones_patrocinador (patrocinador_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    return;
  }

  const columns = [
    ['patrocinador_id', 'ALTER TABLE auditoria_operaciones ADD COLUMN patrocinador_id VARCHAR(36) NULL AFTER usuario_id'],
    ['admin_id', 'ALTER TABLE auditoria_operaciones ADD COLUMN admin_id VARCHAR(36) NULL AFTER patrocinador_id'],
    ['fecha', 'ALTER TABLE auditoria_operaciones ADD COLUMN fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER admin_id'],
    ['metadata', 'ALTER TABLE auditoria_operaciones ADD COLUMN metadata JSON NULL AFTER motivo']
  ];

  for (const [name, sql] of columns) {
    if (!await columnExists('auditoria_operaciones', name)) {
      console.log(`➕ Agregando auditoria_operaciones.${name}`);
      await query(sql);
    }
  }

  if (!await indexExists('auditoria_operaciones', 'idx_auditoria_operaciones_tipo_fecha')) {
    await query('ALTER TABLE auditoria_operaciones ADD INDEX idx_auditoria_operaciones_tipo_fecha (tipo_operacion, fecha)');
  }
  if (!await indexExists('auditoria_operaciones', 'idx_auditoria_operaciones_usuario')) {
    await query('ALTER TABLE auditoria_operaciones ADD INDEX idx_auditoria_operaciones_usuario (usuario_id)');
  }
  if (!await indexExists('auditoria_operaciones', 'idx_auditoria_operaciones_patrocinador') && await columnExists('auditoria_operaciones', 'patrocinador_id')) {
    await query('ALTER TABLE auditoria_operaciones ADD INDEX idx_auditoria_operaciones_patrocinador (patrocinador_id)');
  }
}

async function runMigration() {
  console.log('🔄 Ejecutando migración 025_fix_sponsor_withdraw_schema...');
  await ensureRetiroSponsorColumns();
  await ensureLimitesTable();
  await ensureAuditoriaOperacionesTable();
  console.log('✅ Migración 025 completada');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('❌ Error en migración 025:', err);
  process.exit(1);
});
