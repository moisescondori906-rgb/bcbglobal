import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

conn.on('ready', () => {
  const cmd = `
    echo "--- PM2 LIST ---" &&
    pm2 list &&
    echo "--- PM2 ENV FOR APP 0 ---" &&
    pm2 show 0 | grep PORT &&
    echo "--- CHECKING BACKEND LOGS ---" &&
    tail -n 50 /var/www/bcb_global/backend/logs/out.log
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect(config);
