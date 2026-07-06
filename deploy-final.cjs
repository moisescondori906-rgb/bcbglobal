const { Client } = require('ssh2');

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🚀 Iniciando deploy final del sistema BCB Global v13.0');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida');
  
  const deployScript = `
    cd /var/www/bcb_global
    echo "📥 Actualizando código desde GitHub"
    git pull origin main
    
    echo "📦 Instalando dependencias backend"
    cd /var/www/bcb_global/backend
    npm install
    
    echo "🗄️ Ejecutando migraciones (si hay nuevas)"
    node -e "
      const mysql = require('mysql2/promise');
      require('dotenv').config();
      
      (async () => {
        const conn = await mysql.createConnection({
          host: process.env.MYSQL_HOST || 'localhost',
          port: parseInt(process.env.MYSQL_PORT || '3306'),
          user: process.env.MYSQL_USER,
          password: process.env.MYSQL_PASSWORD,
          database: process.env.MYSQL_DATABASE
        });
        
        console.log('  1️⃣ Verificando tabla historial_comisiones...');
        try {
          await conn.execute(\`
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
          \`);
          console.log('  ✅ historial_comisiones OK');
        } catch (e) { console.warn('  ⚠️', e.message); }
        
        console.log('  2️⃣ Verificando tabla limites_retiros_pasantia...');
        try {
          await conn.execute(\`
            CREATE TABLE IF NOT EXISTS limites_retiros_pasantia (
              id VARCHAR(36) PRIMARY KEY,
              patrocinador_id VARCHAR(36) NOT NULL,
              total_aprobados INT DEFAULT 0,
              maximo_por_patrocinador INT DEFAULT 15,
              fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (patrocinador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
              UNIQUE KEY uk_patrocinador (patrocinador_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          \`);
          console.log('  ✅ limites_retiros_pasantia OK');
        } catch (e) { console.warn('  ⚠️', e.message); }
        
        console.log('  3️⃣ Verificando tabla auditoria_operaciones...');
        try {
          await conn.execute(\`
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
          \`);
          console.log('  ✅ auditoria_operaciones OK');
        } catch (e) { console.warn('  ⚠️', e.message); }
        
        console.log('  4️⃣ Verificando columnas en retiros...');
        const colsToAdd = [
          ['estado_patrocinador', 'VARCHAR(50) NULL'],
          ['aprobado_por_patrocinador', 'TINYINT(1) DEFAULT 0'],
          ['patrocinador_id', 'VARCHAR(36) NULL'],
          ['motivo_rechazo_patrocinador', 'TEXT NULL'],
          ['fecha_aprobacion_patrocinador', 'TIMESTAMP NULL'],
          ['contador_retiros_pasantia', 'INT DEFAULT 0']
        ];
        
        for (const [col, def] of colsToAdd) {
          try {
            await conn.execute(\`ALTER TABLE retiros ADD COLUMN \${col} \${def}\`);
            console.log('    ✅', col, 'agregado');
          } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
              console.log('    ℹ️', col, 'ya existe');
            } else {
              console.error('    ❌ Error en', col, ':', e.message);
            }
          }
        }
        
        console.log('🗄️ Migraciones completadas!');
        
        await conn.end();
      })();
    " > /tmp/migrar.cjs
    
    echo "⚙️ Ejecutando migraciones..."
    cd /var/www/bcb_global/backend
    node /tmp/migrar.cjs
    rm /tmp/migrar.cjs
    
    echo "🔄 Reiniciando el backend..."
    pm2 restart bcb-global-backend
    
    echo "💾 Guardando estado de PM2..."
    pm2 save
    
    echo "✅ Deploy finalizado exitosamente!"
  `;
  
  conn.exec(deployScript, (err, stream) => {
    if (err) {
      console.error('❌ Error en el deploy:', err);
      conn.end();
      return;
    }

    stream.on('close', (code, signal) => {
      console.log('\n🎉 ¡DEPLOY COMPLETADO CON ÉXITO!');
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err.message);
}).connect(config);
