import mysql from 'mysql2/promise';
import 'dotenv/config';

async function migrate() {
  console.log('🚀 Iniciando migración de BCB Global v13.0');
  
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // ============================================
    // MÓDULO 1: NUEVOS ESTADOS (VERIFICANDO, ACEPTADO, RECHAZADO)
    // ============================================
    console.log('📋 Módulo 1: Actualizando estados de recargas y retiros...');
    
    // Actualizar compras_nivel (recargas)
    try {
      await connection.execute(`
        ALTER TABLE compras_nivel 
        MODIFY COLUMN estado ENUM('Verificando', 'Aceptado', 'Rechazado') DEFAULT 'Verificando'
      `);
      console.log('  ✅ Definición de estados de compras_nivel actualizada');
      await connection.execute(`UPDATE compras_nivel SET estado = 'Verificando' WHERE estado = 'pendiente'`);
      await connection.execute(`UPDATE compras_nivel SET estado = 'Aceptado' WHERE estado = 'completada'`);
      await connection.execute(`UPDATE compras_nivel SET estado = 'Rechazado' WHERE estado = 'rechazada'`);
      console.log('  ✅ Datos de compras_nivel migrados a nuevos estados');
    } catch (err) {
      console.log('  ℹ️ Error o campo estado de compras_nivel ya está correcto', err.message);
    }

    // Actualizar retiros
    try {
      await connection.execute(`
        ALTER TABLE retiros 
        MODIFY COLUMN estado ENUM('Verificando', 'Aceptado', 'Rechazado') DEFAULT 'Verificando'
      `);
      console.log('  ✅ Definición de estados de retiros actualizada');
      await connection.execute(`UPDATE retiros SET estado = 'Verificando' WHERE estado = 'pendiente'`);
      await connection.execute(`UPDATE retiros SET estado = 'Aceptado' WHERE estado IN ('aprobado', 'pagado')`);
      await connection.execute(`UPDATE retiros SET estado = 'Rechazado' WHERE estado = 'rechazado'`);
      console.log('  ✅ Datos de retiros migrados a nuevos estados');
    } catch (err) {
      console.log('  ℹ️ Error o campo estado de retiros ya está correcto', err.message);
    }

    // Actualizar estado_operativo en retiros para Telegram
    try {
      await connection.execute(`
        ALTER TABLE retiros 
        MODIFY COLUMN estado_operativo ENUM('Verificando', 'Tomado', 'Aceptado', 'Rechazado') DEFAULT 'Verificando'
      `);
      console.log('  ✅ Definición de estado_operativo de retiros (Telegram) actualizada');
      await connection.execute(`UPDATE retiros SET estado_operativo = 'Verificando' WHERE estado_operativo = 'pendiente'`);
      await connection.execute(`UPDATE retiros SET estado_operativo = 'Aceptado' WHERE estado_operativo = 'aceptado'`);
      await connection.execute(`UPDATE retiros SET estado_operativo = 'Rechazado' WHERE estado_operativo = 'rechazado'`);
      console.log('  ✅ Datos de estado_operativo de retiros (Telegram) migrados a nuevos estados');
    } catch (err) {
      console.log('  ℹ️ Error o campo estado_operativo de retiros (Telegram) ya está correcto', err.message);
    }

    // Actualizar estado_operativo en compras_nivel para Telegram
    try {
      await connection.execute(`
        ALTER TABLE compras_nivel 
        MODIFY COLUMN estado_operativo ENUM('Verificando', 'Tomado', 'Aceptado', 'Rechazado') DEFAULT 'Verificando'
      `);
      console.log('  ✅ Definición de estado_operativo de compras_nivel (Telegram) actualizada');
      await connection.execute(`UPDATE compras_nivel SET estado_operativo = 'Verificando' WHERE estado_operativo = 'pendiente'`);
      await connection.execute(`UPDATE compras_nivel SET estado_operativo = 'Aceptado' WHERE estado_operativo = 'aceptado'`);
      await connection.execute(`UPDATE compras_nivel SET estado_operativo = 'Rechazado' WHERE estado_operativo = 'rechazado'`);
      console.log('  ✅ Datos de estado_operativo de compras_nivel (Telegram) migrados a nuevos estados');
    } catch (err) {
      console.log('  ℹ️ Error o campo estado_operativo de compras_nivel (Telegram) ya está correcto', err.message);
    }



    // ============================================
    // MÓDULO 8-12: FLUJO DE APROBACIÓN DE RETIROS (PASANTÍA)
    // ============================================
    console.log('📋 Módulo 8-12: Agregando campos para flujo de retiros...');

    // Agregar campos a retiros
    const newRetiroColumns = [
      'estado_patrocinador VARCHAR(50) NULL',
      'aprobado_por_patrocinador TINYINT(1) DEFAULT 0',
      'patrocinador_id VARCHAR(36) NULL',
      'motivo_rechazo_patrocinador TEXT NULL',
      'fecha_aprobacion_patrocinador TIMESTAMP NULL',
      'contador_retiros_pasantia INT DEFAULT 0'
    ];
    for (const col of newRetiroColumns) {
      try {
        await connection.execute(`ALTER TABLE retiros ADD COLUMN ${col}`);
        console.log(`  ✅ Columna ${col.split(' ')[0]} agregada a retiros`);
      } catch (err) {
        console.log(`  ℹ️ Columna ${col.split(' ')[0]} ya existe en retiros`);
      }
    }

    // Agregar tabla para límites de retiros de pasantía
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS limites_retiros_pasantia (
          id VARCHAR(36) PRIMARY KEY,
          patrocinador_id VARCHAR(36) NOT NULL,
          total_aprobados INT DEFAULT 0,
          maximo_por_patrocinador INT DEFAULT 15,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (patrocinador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
          UNIQUE KEY uk_patrocinador (patrocinador_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✅ Tabla limites_retiros_pasantia creada');
    } catch (err) {
      console.log('  ℹ️ Tabla limites_retiros_pasantia ya existe');
    }

    // ============================================
    // MÓDULO 13: AUDITORÍA MEJORADA
    // ============================================
    console.log('📋 Módulo 13: Asegurando tablas de auditoría...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS auditoria_operaciones (
          id VARCHAR(36) PRIMARY KEY,
          tipo_operacion VARCHAR(50) NOT NULL,
          usuario_id VARCHAR(36) NULL,
          patrocinador_id VARCHAR(36) NULL,
          admin_id VARCHAR(36) NULL,
          ip VARCHAR(50) NULL,
          dispositivo VARCHAR(255) NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          estado_anterior VARCHAR(50) NULL,
          estado_nuevo VARCHAR(50) NULL,
          motivo TEXT NULL,
          metadata JSON NULL,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
          FOREIGN KEY (patrocinador_id) REFERENCES usuarios(id) ON DELETE SET NULL,
          FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE SET NULL,
          INDEX idx_tipo_fecha (tipo_operacion, fecha),
          INDEX idx_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✅ Tabla auditoria_operaciones creada');
    } catch (err) {
      console.log('  ℹ️ Tabla auditoria_operaciones ya existe');
    }

    // ============================================
    // MÓDULO 15: ÍNDICES PARA OPTIMIZACIÓN
    // ============================================
    console.log('📋 Módulo 15: Creando índices de rendimiento...');
    const indices = [
      'idx_retiros_estado ON retiros(estado)',
      'idx_retiros_patrocinador ON retiros(patrocinador_id)',
      'idx_compras_nivel_estado ON compras_nivel(estado)',
      'idx_usuarios_telefono ON usuarios(telefono)',
      'idx_usuarios_codigo_invitacion ON usuarios(codigo_invitacion)',
      'idx_tarjetas_bancarias_numero ON tarjetas_bancarias(numero_cuenta)'
    ];
    for (const idx of indices) {
      try {
        await connection.execute(`CREATE INDEX ${idx}`);
        console.log(`  ✅ Índice ${idx.split(' ')[1]} creado`);
      } catch (err) {
        console.log(`  ℹ️ Índice ${idx.split(' ')[1]} ya existe`);
      }
    }

    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✅ Migración completada exitosamente!');
    
  } catch (err) {
    console.error('❌ Error en migración:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

migrate();
