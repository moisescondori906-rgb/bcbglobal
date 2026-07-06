
const { Client } = require('ssh2');

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🔍 FASE 1: MAPA DE RELACIONES COMPLETO');
console.log('Tablas con relación a usuarios:');
console.log(`
- usuarios (tabla principal)
  ↳ actividad_tareas: ON DELETE CASCADE
  ↳ movimientos_saldo: ON DELETE CASCADE
  ↳ compras_nivel: ON DELETE CASCADE
  ↳ retiros: ON DELETE CASCADE
  ↳ tarjetas_bancarias: ON DELETE CASCADE
  ↳ tickets_sorteo: ON DELETE CASCADE
  ↳ historial_recompensas (usuario_receptor): ON DELETE CASCADE
  ↳ historial_recompensas (usuario_generador): ON DELETE SET NULL
  ↳ solicitudes_dispositivo: ON DELETE CASCADE
  ↳ sorteos_ganadores: ON DELETE CASCADE
  ↳ idempotencia: (FK a usuario_id, no tiene ON DELETE)
  ↳ auditoria_financiera: (FK a usuario_id, no tiene ON DELETE)
  ↳ notificaciones: ON DELETE CASCADE
  ↳ respuestas_cuestionario: ON DELETE CASCADE
  ↳ metodos_qr (admin_id): ON DELETE CASCADE
  ↳ ruleta_forzada: (FK a usuario_id, no tiene ON DELETE)
  ↳ logs_ruleta: (FK a usuario_id, no tiene ON DELETE)
  ↳ sorteo_config_personalizada: (target_id si target_type=usuario, no tiene FK)
  ↳ usuarios (invitado_por): ON DELETE SET NULL
  ↳ compras_nivel (procesado_por): ON DELETE SET NULL
  ↳ retiros (procesado_por): ON DELETE SET NULL
  ↳ solicitudes_dispositivo (admin_id): ON DELETE SET NULL
`);

console.log('\n🚀 Conectando al servidor...');

conn.on('ready', () =&gt; {
  console.log('✅ Conexión SSH establecida');
  
  const script = `
    cd /var/www/bcb_global/backend
    node -e "
      const mysql = require('mysql2/promise');
      const dotenv = require('dotenv');
      dotenv.config();
      
      (async () =&gt; {
        const conn = await mysql.createConnection({
          host: process.env.MYSQL_HOST,
          user: process.env.MYSQL_USER,
          password: process.env.MYSQL_PASSWORD,
          database: process.env.MYSQL_DATABASE
        });
        
        console.log('\\n🔍 FASE 2: LOCALIZAR REGISTROS');
        const [userRows] = await conn.execute(\`SELECT * FROM usuarios WHERE telefono = '+59162338686'\`);
        
        if (userRows.length === 0) {
          console.log('❌ No se encontró el usuario con teléfono +59162338686');
          await conn.end();
          return;
        }
        
        const user = userRows[0];
        console.log('✅ Usuario encontrado:');
        console.log('ID:', user.id);
        console.log('Teléfono:', user.telefono);
        console.log('Nombre de usuario:', user.nombre_usuario);
        
        // Búsqueda en todas las tablas
        const tables = [
          { name: 'actividad_tareas', column: 'usuario_id' },
          { name: 'movimientos_saldo', column: 'usuario_id' },
          { name: 'compras_nivel', column: 'usuario_id' },
          { name: 'retiros', column: 'usuario_id' },
          { name: 'tarjetas_bancarias', column: 'usuario_id' },
          { name: 'tickets_sorteo', column: 'usuario_id' },
          { name: 'historial_recompensas', column: 'usuario_receptor' },
          { name: 'historial_recompensas', column: 'usuario_generador' },
          { name: 'solicitudes_dispositivo', column: 'usuario_id' },
          { name: 'sorteos_ganadores', column: 'usuario_id' },
          { name: 'idempotencia', column: 'usuario_id' },
          { name: 'auditoria_financiera', column: 'usuario_id' },
          { name: 'notificaciones', column: 'usuario_id' },
          { name: 'respuestas_cuestionario', column: 'usuario_id' },
          { name: 'metodos_qr', column: 'admin_id' },
          { name: 'ruleta_forzada', column: 'usuario_id' },
          { name: 'logs_ruleta', column: 'usuario_id' },
          { name: 'compras_nivel', column: 'procesado_por' },
          { name: 'retiros', column: 'procesado_por' },
          { name: 'solicitudes_dispositivo', column: 'admin_id' },
          { name: 'usuarios', column: 'invitado_por' }
        ];
        
        console.log('\\n📋 Listado de registros encontrados:');
        for (const table of tables) {
          const [rows] = await conn.execute(\`SELECT COUNT(*) as total FROM \${table.name} WHERE \${table.column} = ?\`, [user.id]);
          if (rows[0].total &gt; 0) {
            console.log(\`- \${table.name} (\${table.column}): \${rows[0].total} registros\`);
          }
        }
        
        // También buscar si hay registros en comunidados_home.created_by
        const [comunicados] = await conn.execute(\`SELECT COUNT(*) as total FROM comunicados_home WHERE created_by = ?\`, [user.id]);
        if (comunicados[0].total &gt; 0) {
          console.log(\`- comunicados_home (created_by): \${comunicados[0].total} registros\`);
        }
        
        await conn.end();
      })();
    "
  `;
  
  conn.exec(script, (err, stream) =&gt; {
    if (err) {
      console.error('❌ Error:', err);
      conn.end();
      return;
    }
    
    stream.on('data', (data) =&gt; {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) =&gt; {
      process.stderr.write(data.toString());
    }).on('close', () =&gt; {
      console.log('\n✅ Script ejecutado con éxito');
      conn.end();
    });
  });
}).on('error', (err) =&gt; {
  console.error('❌ Error de conexión:', err);
}).connect(config);
