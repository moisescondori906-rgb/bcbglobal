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
    echo "--- CHECKING IF BACKEND STARTS ---" &&
    cd /var/www/bcb_global/backend &&
    export NODE_ENV=production &&
    export PORT=4000 &&
    timeout 10s node src/index.mjs || echo "Backend failed or timeout"
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
