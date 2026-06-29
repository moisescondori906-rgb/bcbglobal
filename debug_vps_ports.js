import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 60000
};

console.log('🔍 Investigando procesos y puertos en el VPS...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const commands = [
    'pm2 list',
    'ps aux | grep node',
    'lsof -i :4000 || ss -lntp | grep :4000',
    'curl -v http://localhost:4000/api/health',
    'curl -v http://173.249.55.143:4000/api/health'
  ];

  const executeNext = (index) => {
    if (index >= commands.length) {
      conn.end();
      return;
    }

    const cmd = commands[index];
    console.log(`\n🏃 Ejecutando: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`❌ Error al ejecutar "${cmd}":`, err);
        executeNext(index + 1);
        return;
      }

      stream.on('close', (code, signal) => {
        executeNext(index + 1);
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  };

  executeNext(0);
}).on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err.message);
}).connect(config);
