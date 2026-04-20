
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
  
  conn.exec('cat /var/www/bcb_global/backend/.env', (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }

    stream.on('close', () => conn.end())
          .on('data', (data) => process.stdout.write(data.toString()))
          .stderr.on('data', (data) => process.stderr.write(data.toString()));
  });
}).on('error', (err) => {
  console.error('❌ Error SSH:', err.message);
}).connect(config);
