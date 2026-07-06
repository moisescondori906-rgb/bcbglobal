const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🔍 Iniciando diagnóstico de team-report...\n');

const diagnosticScript = `
  cd /var/www/bcb_global/backend
  node -e "
    const mysql = require('mysql2/promise');
    require('dotenv').config();
    
    (async () => {
      console.log('🔌 Conectando a la base de datos...');
      const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
      });
      console.log('✅ Conectado');
      
      console.log('\\n📊 PRIMEROS 10 USUARIOS EN LA BD:');
      const [usuarios] = await conn.execute('SELECT id, nombre_usuario, telefono, invitado_por, created_at FROM usuarios LIMIT 10');
      console.table(usuarios);
      
      console.log('\\n🎯 VERIFICANDO USUARIO ESPECÍFICO (que tienes 12 integrantes en nivel A):');
      console.log('   Por favor, ingresa el ID del usuario que está usando (o su teléfono)');
      
      // Buscamos el usuario que tiene referidos
      console.log('\\n🔍 Buscando el usuario con más referidos:');
      const [referidosPorUsuario] = await conn.execute(
        \`SELECT 
          inv.id, inv.nombre_usuario, inv.telefono,
          COUNT(ref.id) as total_referidos_directos
        FROM usuarios inv
        LEFT JOIN usuarios ref ON ref.invitado_por = inv.id
        GROUP BY inv.id, inv.nombre_usuario, inv.telefono
        ORDER BY total_referidos_directos DESC
        LIMIT 5\`
      );
      console.table(referidosPorUsuario);
      
      if (referidosPorUsuario.length > 0) {
        const usuarioTest = referidosPorUsuario[0];
        console.log('\\n🧪 TESTEANDO getUserTeamReport CON EL USUARIO:', usuarioTest.nombre_usuario, '(', usuarioTest.telefono, ')');
        console.log('   ID:', usuarioTest.id);
        
        // Simulamos la consulta de getUserTeamReport
        console.log('\\n1️⃣ Nivel A (Directos):');
        const [level1] = await conn.execute(
          'SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre, u.nivel_id FROM usuarios u LEFT JOIN niveles n ON u.nivel_id = n.id WHERE u.invitado_por = ?',
          [usuarioTest.id]
        );
        console.log('   Total nivel A:', level1.length);
        console.table(level1.slice(0, 5));
        
        if (level1.length > 0) {
          console.log('\\n2️⃣ Nivel B:');
          const [level2] = await conn.execute(
            'SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre, u.nivel_id FROM usuarios u LEFT JOIN niveles n ON u.nivel_id = n.id WHERE u.invitado_por IN (?)',
            [level1.map(u => u.id)]
          );
          console.log('   Total nivel B:', level2.length);
          
          if (level2.length > 0) {
            console.log('\\n3️⃣ Nivel C:');
            const [level3] = await conn.execute(
              'SELECT u.id, u.nombre_usuario, u.telefono, u.created_at, n.nombre as nivel_nombre, u.nivel_id FROM usuarios u LEFT JOIN niveles n ON u.nivel_id = n.id WHERE u.invitado_por IN (?)',
              [level2.map(u => u.id)]
            );
            console.log('   Total nivel C:', level3.length);
          }
        }
      }
      
      await conn.end();
      console.log('\\n🏁 Diagnóstico terminado');
    })();
  "
`;

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida\n');
  
  conn.exec(diagnosticScript, (err, stream) => {
    if (err) {
      console.error('❌ Error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code, signal) => {
      console.log('\n✅ Diagnóstico completado');
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
