import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 60000
};

console.log('🧹 Limpieza profunda y reinicio en el VPS...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const commands = [
    'which lsof || echo "lsof missing"',
    'which fuser || echo "fuser missing"',
    'which ss || echo "ss missing"',
    'which netstat || echo "netstat missing"',
    'pm2 kill',
    'pkill -9 node',
    'pkill -9 pm2',
    'sleep 2',
    'fuser -k 4000/tcp || true',
    'cd /var/www/bcb_global/backend && pm2 start ecosystem.config.cjs',
    'sleep 5',
    'pm2 list',
    'ss -lntp | grep :4000 || lsof -i :4000 || echo "Port 4000 still not showing"',
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
