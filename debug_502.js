import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

conn.on('ready', () => {
  // 1. Ver los logs de Nginx (Error 502 suele estar aquí)
  // 2. Ver la configuración de Nginx para ver a qué puerto está enviando
  // 3. Ver qué puertos están escuchando en el servidor
  const cmd = `
    echo "--- NGINX ERROR LOG ---" &&
    tail -n 20 /var/log/nginx/error.log &&
    echo "--- NGINX CONFIG (bcb-global) ---" &&
    cat /etc/nginx/sites-enabled/bcb_global || cat /etc/nginx/conf.d/bcb_global.conf || echo "No config found" &&
    echo "--- LISTENING PORTS ---" &&
    netstat -tulpn | grep LISTEN
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
