
import { Client } from 'ssh2';

const conn = new Client();
const config = { host: '173.249.55.143', port: 22, username: 'root', password: '14738941lp', readyTimeout: 120000 };

conn.on('ready', () => {
  console.log('✅ SSH Ready');
  
  // Get last 200 lines of app.log
  conn.exec('cd /var/www/bcb_global/backend/logs && tail -200 app.log', (err, stream) => {
    if (err) throw err;
    console.log('\n📋 APP LOG (last 200 lines):');
    stream.on('data', (data) => process.stdout.write(data.toString()));
    stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
    stream.on('close', () => {
      // Get last 100 lines of err-0.log
      console.log('\n📋 ERROR LOG (last 100 lines):');
      conn.exec('cd /var/www/bcb_global/backend/logs && tail -100 err-0.log', (err2, stream2) => {
        if (err2) throw err2;
        stream2.on('data', (data) => process.stdout.write(data.toString()));
        stream2.stderr.on('data', (data) => process.stderr.write(data.toString()));
        stream2.on('close', () => conn.end());
      });
    });
  });
}).connect(config);
