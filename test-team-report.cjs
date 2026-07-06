const { Client } = require('ssh2');

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🧪 Probando team-report con un usuario real...\n');

const testScript = `
  cd /var/www/bcb_global/backend
  node -e "
    const mysql = require('mysql2/promise');
    require('dotenv').config();
    
    (async () => {
      console.log('1. Conectando a BD...');
      const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
      });
      
      const TEST_USER_ID = '74955867-b8cd-461e-9db1-de26b5213734'; // Tiene referidos según la tabla
      
      console.log('2. Testeando con usuario ID:', TEST_USER_ID);
      
      // Nivel A
      console.log('3. Consultando Nivel A...');
      const [level1] = await conn.execute('SELECT u.id, u.nombre_usuario, u.telefono FROM usuarios u WHERE u.invitado_por = ?', [TEST_USER_ID]);
      console.log('   Nivel A:', level1.length, 'usuarios');
      console.table(level1);
      
      // Nivel B
      let level2 = [];
      if (level1.length > 0) {
        console.log('4. Consultando Nivel B...');
        [level2] = await conn.execute('SELECT u.id, u.nombre_usuario FROM usuarios u WHERE u.invitado_por IN (?)', [level1.map(u => u.id)]);
        console.log('   Nivel B:', level2.length, 'usuarios');
      }
      
      // Nivel C
      let level3 = [];
      if (level2.length > 0) {
        console.log('5. Consultando Nivel C...');
        [level3] = await conn.execute('SELECT u.id, u.nombre_usuario FROM usuarios u WHERE u.invitado_por IN (?)', [level2.map(u => u.id)]);
        console.log('   Nivel C:', level3.length, 'usuarios');
      }
      
      console.log('\\n✅ Resultado esperado para niveles:');
      console.log('   - Nivel A:', level1.length);
      console.log('   - Nivel B:', level2.length);
      console.log('   - Nivel C:', level3.length);
      
      // Ahora probamos la función desde dbService.mjs
      console.log('\\n📦 Importando dbService...');
      const { getUserTeamReport } = await import('./src/services/dbService.mjs');
      
      console.log('6. Ejecutando getUserTeamReport...');
      const report = await getUserTeamReport(TEST_USER_ID);
      
      console.log('\\n📊 Reporte completo:');
      console.log('   Resumen:', report.resumen);
      console.log('   Niveles:', JSON.stringify(report.niveles, null, 2));
      
      await conn.end();
    })();
  "
`;

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado SSH\n');
  
  conn.exec(testScript, (err, stream) => {
    if (err) {
      console.error('❌ Error:', err);
      conn.end();
      return;
    }
    
    stream.on('close', () => {
      console.log('\n✅ Prueba terminada');
      conn.end();
    }).on('data', (data) => process.stdout.write(data.toString())).stderr.on('data', (data) => process.stderr.write(data.toString()));
  });
}).connect(config);
