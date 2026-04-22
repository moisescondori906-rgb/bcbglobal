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
    echo "--- RESTARTING PM2 ---" &&
    cd /var/www/bcb_global/backend &&
    pm2 delete all || true &&
    pm2 start ecosystem.config.cjs &&
    sleep 5 &&
    echo "--- CHECKING PORTS AGAIN ---" &&
    ss -tulpn | grep 4000
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
