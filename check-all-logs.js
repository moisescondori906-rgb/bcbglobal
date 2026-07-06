
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
  
  const commands = [
    'pm2 logs bcb-global-backend --nostream --lines 100 --out',
    'cd /var/www/bcb_global && ls -la backend/logs/'
  ];

  const execCmd = (i) => {
    if (i >= commands.length) return conn.end();
    console.log(`\n📝 Executing: ${commands[i]}`);
    conn.exec(commands[i], (err, stream) => {
      if (err) {
        console.error('❌ Error:', err);
        return conn.end();
      }
      stream.on('close', (code) => {
        console.log(`\n📝 Command exited with code ${code}`);
        execCmd(i + 1);
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  };
  execCmd(0);
}).connect(config);
