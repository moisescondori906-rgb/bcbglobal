import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 60000
};

console.log('🔍 Investigando estado del backend en el VPS...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const commands = [
    'pm2 status',
    'netstat -tulpn | grep :4000',
    'tail -n 50 /var/www/bcb_global/backend/logs/out.log',
    'tail -n 50 /var/www/bcb_global/backend/logs/err.log',
    'curl -I http://127.0.0.1:4000/api/health'
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
