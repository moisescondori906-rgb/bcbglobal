
import { Client } from 'ssh2';

const conn = new Client();
const config = { host: '173.249.55.143', port: 22, username: 'root', password: '14738941lp', readyTimeout: 120000 };

conn.on('ready', () => {
  console.log('✅ SSH Ready');
  
  const commands = [
    'cd /var/www/bcb_global && git status',
    'cd /var/www/bcb_global && git diff backend/src/services/dbService.mjs'
  ];
  
  let i = 0;
  const execNext = () => {
    if (i >= commands.length) return conn.end();
    const cmd = commands[i];
    console.log(`\n📝 Executing: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('data', (data) => process.stdout.write(data.toString()));
      stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
      stream.on('close', () => { i++; execNext(); });
    });
  };
  
  execNext();
}).connect(config);
