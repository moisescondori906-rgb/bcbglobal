
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
    'rm -rf /var/www/bcb_global/backend/node_modules/.package-lock.json',
    'cd /var/www/bcb_global/backend && npm install',
    '# Asegurar almacenamiento persistente fuera del código fuente',
    'mkdir -p /var/www/bcb_global/storage/uploads/metodos_qr',
    'mkdir -p /var/www/bcb_global/storage/uploads/banners',
    'mkdir -p /var/www/bcb_global/storage/uploads/tareas',
    'mkdir -p /var/www/bcb_global/storage/uploads/comprobantes',
    'mkdir -p /var/www/bcb_global/storage/uploads/retiros',
    'mkdir -p /var/www/bcb_global/storage/uploads/comunicados',
    'chmod -R 777 /var/www/bcb_global/storage/uploads',
    '# Asegurar que el directorio public existe en backend',
    'mkdir -p /var/www/bcb_global/backend/public',
    '# Limpiar directorio de uploads en backend si es real para que ln pueda crear el symlink',
    'if [ -d /var/www/bcb_global/backend/public/uploads ] && [ ! -L /var/www/bcb_global/backend/public/uploads ]; then rm -rf /var/www/bcb_global/backend/public/uploads; fi',
    '# Crear symlink persistente',
    'ln -sfn /var/www/bcb_global/storage/uploads /var/www/bcb_global/backend/public/uploads',
    'ln -sfn /var/www/bcb_global/frontend/public/video /var/www/bcb_global/backend/public/video',
    'ln -sfn /var/www/bcb_global/frontend/public/imag /var/www/bcb_global/backend/public/imag',
    'cd /var/www/bcb_global/backend && node scripts/seed_12_tasks.mjs || true',
    'cd /var/www/bcb_global/backend && node scripts/allow_repeat_tasks.mjs || true',
    'cd /var/www/bcb_global/backend && node scripts/update_levels_2026.mjs || true',
    'cd /var/www/bcb_global/backend && node scripts/sync_official_levels.mjs || true',
    'cd /var/www/bcb_global/backend && node scripts/fix_premios_v2.mjs || true',
    'cd /var/www/bcb_global/backend && node scripts/upgrade_ruleta_v3.mjs || true',
    'cd /var/www/bcb_global/backend && node scripts/upgrade_ruleta_v4.mjs || true',
    'cd /var/www/bcb_global/frontend && npm install --force && VITE_API_URL=https://bcb-global.com/api VITE_BACKEND_URL=https://bcb-global.com npm run build',
    '# Sincronizar frontend a backend public SIN borrar el symlink de uploads',
    'rsync -a --delete --exclude="uploads" --exclude="video" --exclude="imag" /var/www/bcb_global/frontend/dist/ /var/www/bcb_global/backend/public/',
    '# Aplicar nueva configuración de Nginx si ha cambiado',
    'cp /var/www/bcb_global/bcb_global_nginx.conf /etc/nginx/sites-available/bcb_global.conf || true',
    'ln -sfn /etc/nginx/sites-available/bcb_global.conf /etc/nginx/sites-enabled/bcb_global.conf || true',
    'nginx -t && systemctl reload nginx || true',
    '# Ejecutar script de tickets para pasantes',
    'cd /var/www/bcb_global/backend && node scripts/grant_pasante_tickets.mjs || true',
    '# Iniciar PM2 en modo simple para mayor estabilidad',
    'cd /var/www/bcb_global/backend && pm2 start src/index.mjs --name "bcb-global-backend"',
    'sleep 15',
    'pm2 status',
    'pm2 logs bcb-global-backend --nostream --lines 20',
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
