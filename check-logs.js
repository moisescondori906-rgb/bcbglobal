
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 120000
};

conn.on('ready', () => {
  console.log('✅ SSH Ready');
  
  conn.exec('pm2 logs bcb-global-backend --nostream --lines 50 --err', (err, stream) => {
    if (err) {
      console.error('❌ Error:', err);
      return conn.end();
    }
    stream.on('close', (code) => {
      console.log(`\n📝 Command exited with code ${code}`);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect(config);
