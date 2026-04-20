
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
    'cd /var/www/bcb_global && git fetch origin && git reset --hard origin/main',
    'find /var/www/bcb_global/backend/src -name "*.js" -delete',
    'fuser -k 4000/tcp || true',
    'pm2 kill',
    'cd /var/www/bcb_global/backend && npm install',
    'cd /var/www/bcb_global/frontend && npm install && npm run build',
    'cd /var/www/bcb_global/backend && mkdir -p logs && pm2 flush && pm2 start ecosystem.config.cjs',
    'sleep 20',
    'pm2 status',
    'tail -n 100 /var/www/bcb_global/backend/logs/out.log || true',
    'tail -n 100 /var/www/bcb_global/backend/logs/err.log || true',
    'curl -v http://127.0.0.1:4000/health || true'
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
