
import { Client } from 'ssh2';

const conn = new Client();
const config = { host: '173.249.55.143', port: 22, username: 'root', password: '14738941lp', readyTimeout: 120000 };

conn.on('ready', () => {
  console.log('✅ SSH Ready');
  
  const commands = [
    'cd /var/www/bcb_global && git status',
    'pm2 logs --nostream --lines 100 bcb-global-backend'
  ];
  
  let i = 0;
  const execNext = () => {
    if (i >= commands.length) return conn.end();
    const cmd = commands[i];
    console.log(`\n📝 Executing: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('data', (d) => process.stdout.write(d.toString()));
      stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
      stream.on('close', () => { i++; execNext(); });
    });
  };
  
  execNext();
}).connect(config);
