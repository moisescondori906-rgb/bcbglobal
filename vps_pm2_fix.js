
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const commands = [
    'pm2 stop all || true',
    'pm2 delete all || true',
    'fuser -k 4000/tcp || true',
    'cd /var/www/bcb_global/backend && pm2 start ecosystem.config.cjs --env production',
    'sleep 5',
    'pm2 status',
    'pm2 logs --lines 50 --raw'
  ];

  const executeNext = (index) => {
    if (index >= commands.length) {
      conn.end();
      return;
    }

    const cmd = commands[index];
    console.log(`\n🏃 Ejecutando: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) { console.error(err); conn.end(); return; }

      stream.on('close', () => executeNext(index + 1))
            .on('data', (data) => process.stdout.write(data.toString()))
            .stderr.on('data', (data) => process.stderr.write(data.toString()));
    });
  };

  executeNext(0);
}).on('error', (err) => {
  console.error('❌ Error SSH:', err.message);
}).connect(config);
