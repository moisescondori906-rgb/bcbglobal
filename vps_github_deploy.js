
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🚀 Iniciando despliegue desde GitHub en el servidor VPS...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const commands = [
    'cd /var/www/bcb_global && git pull origin main',
    'cd /var/www/bcb_global/backend && npm install',
    'cd /var/www/bcb_global/frontend && npm install && npm run build',
    'cd /var/www/bcb_global/backend && (pm2 delete bcb-global-backend || true) && pm2 start ecosystem.config.cjs',
    'pm2 delete bcb-global || true',
    'sleep 20',
    'pm2 status',
    'pm2 logs bcb-global-backend --lines 100 || true',
    'netstat -tulpn | grep 4000 || true',
    'curl -I http://127.0.0.1:4000/api/users/me || true'
  ];

  const executeNext = (index) => {
    if (index >= commands.length) {
      console.log('✨ Despliegue desde GitHub completado con éxito.');
      conn.end();
      return;
    }

    const cmd = commands[index];
    console.log(`\n🏃 Ejecutando: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`❌ Error al ejecutar "${cmd}":`, err);
        conn.end();
        return;
      }

      stream.on('close', (code, signal) => {
        if (code !== 0) {
          console.warn(`⚠️ El comando "${cmd}" terminó con código ${code}`);
        }
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
