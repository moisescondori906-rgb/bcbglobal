
import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 90000
};

console.log('🛠️ Aplicando configuración de Nginx para bcb-global.com (no-www)...');

const nginxConfig = fs.readFileSync('bcb_global_nginx.conf', 'utf8');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const commands = [
    `echo '${nginxConfig.replace(/'/g, "'\\''")}' > /etc/nginx/sites-available/bcb_global`,
    'nginx -t',
    'systemctl reload nginx'
  ];

  const executeNext = (index) => {
    if (index >= commands.length) {
      console.log('✨ Configuración de Nginx actualizada con éxito.');
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

      stream.on('close', (code) => {
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
