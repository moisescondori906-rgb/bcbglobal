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
    echo "--- NGINX SITES ENABLED ---" &&
    ls -la /etc/nginx/sites-enabled/ &&
    echo "--- SS LISTEN PORTS ---" &&
    ss -tulpn | grep LISTEN &&
    echo "--- UFW STATUS ---" &&
    ufw status || echo "ufw not found"
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
