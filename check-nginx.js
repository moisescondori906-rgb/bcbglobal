import { Client } from 'ssh2';

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 60000,
  keepaliveInterval: 10000,
  keepaliveCountMax: 3
};

console.log('🔍 Revisando estado de Nginx y PM2...');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const commands = [
    'systemctl status nginx',
    'nginx -t',
    'pm2 status'
  ];
  
  conn.exec(commands.join(' && echo "---" && '), (err, stream) => {
    if (err) {
      console.error('❌ Error:', err);
      conn.end();
      return;
    }
    stream.on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.log(data.toString());
    }).on('close', () => {
      conn.end();
    });
  });
}).connect(config);
