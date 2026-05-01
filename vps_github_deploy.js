
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 120000 // Aumentado a 120s
};

console.log('🚀 Iniciando despliegue desde GitHub en el servidor VPS...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
   const commands = [
    'cd /var/www/bcb_global && git fetch origin && git reset --hard origin/main',
    'find /var/www/bcb_global/backend/src -name "*.js" -delete',
    'fuser -k 4000/tcp || true',
    'pm2 stop bcb-global-backend || true',
    'pm2 delete bcb-global-backend || true',
    'cd /var/www/bcb_global/backend && npm install',
    'mkdir -p /var/www/bcb_global/backend/public/uploads',
    'ln -sfn /var/www/bcb_global/frontend/public/video /var/www/bcb_global/backend/public/video',
    'ln -sfn /var/www/bcb_global/frontend/public/imag /var/www/bcb_global/backend/public/imag',
    'cd /var/www/bcb_global/backend && node scripts/seed_12_tasks.mjs || true',
    'cd /var/www/bcb_global/backend && node scripts/allow_repeat_tasks.mjs || true',
    'cd /var/www/bcb_global/frontend && npm install && VITE_API_URL=https://bcb-global.com/api VITE_BACKEND_URL=https://bcb-global.com npm run build',
    'rsync -a --delete /var/www/bcb_global/frontend/dist/ /var/www/bcb_global/backend/public/',
    'cd /var/www/bcb_global/backend && pm2 start ecosystem.config.cjs',
    'sleep 10',
    'pm2 status',
    'curl -v http://127.0.0.1:4000/api/health'
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
