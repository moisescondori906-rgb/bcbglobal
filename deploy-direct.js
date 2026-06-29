import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 60000, // 60 seconds timeout
  keepaliveInterval: 10000,
  keepaliveCountMax: 3
};

console.log('🚀 Iniciando despliegue directo en VPS...');

function executeDeploy() {
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('✅ Conexión SSH establecida.');
    
    const commands = [
      'cd /var/www/bcb_global',
      'git config --global --add safe.directory /var/www/bcb_global',
      'git stash push -m "temp stash before deploy" || true',
      'git fetch origin main',
      'git reset --hard origin/main || true',
      'cd /var/www/bcb_global/backend',
      'npm install',
      'pm2 restart bcb-global-backend || pm2 start ecosystem.config.cjs --name bcb-global-backend',
      'pm2 save',
      'cd /var/www/bcb_global/frontend',
      'npm install',
      'npm run build',
      'nginx -t && systemctl restart nginx || true',
      'pm2 status',
      'echo "✅ Despliegue completado!"'
    ];
    
    conn.exec(commands.join(' && '), (err, stream) => {
      if (err) {
        console.error('❌ Error ejecutando comando:', err);
        conn.end();
        return;
      }
      stream.on('close', (code, signal) => {
        console.log('\n✅ Script finalizado!');
        conn.end();
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  }).on('error', (err) => {
    console.error('❌ Error de conexión SSH:', err.message);
    if (err.message.includes('ECONNRESET') || err.message.includes('Connection lost')) {
      console.log('🔄 Reintentando en 5 segundos...');
      setTimeout(executeDeploy, 5000);
    }
  }).connect(config);
}

executeDeploy();