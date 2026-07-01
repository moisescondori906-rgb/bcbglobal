const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('🔄 Iniciando migración de historial de comisiones...');
  
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    // 1. Crear la tabla de historial de comisiones si no existe
    console.log('📋 Verificando/creando tabla historial_comisiones...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS historial_comisiones (
        id VARCHAR(36) PRIMARY KEY,
        usuario_invitador VARCHAR(36) NOT NULL,
        usuario_subordinado VARCHAR(36) NOT NULL,
        nivel_red ENUM('A', 'B', 'C') NOT NULL,
        monto_comision DECIMAL(20,2) NOT NULL,
        monto_inversion DECIMAL(20,2) NOT NULL,
        porcentaje_aplicado DECIMAL(5,2) NOT NULL,
        estado ENUM('acreditada', 'pendiente', 'anulada') DEFAULT 'acreditada',
        referencia_compra VARCHAR(36) NOT NULL,
        fecha_acreditacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_comisiones_invitador (usuario_invitador),
        INDEX idx_comisiones_subordinado (usuario_subordinado),
        INDEX idx_comisiones_referencia (referencia_compra),
        UNIQUE KEY idx_comision_unica (usuario_invitador, usuario_subordinado, nivel_red, referencia_compra),
        FOREIGN KEY (usuario_invitador) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_subordinado) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (referencia_compra) REFERENCES compras_nivel(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Migración completada exitosamente!');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en la migración:', err);
    await connection.end();
    process.exit(1);
  }
}

migrate();
