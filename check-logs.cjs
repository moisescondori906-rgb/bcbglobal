const { Client } = require('ssh2');

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🔍 Checking server logs...\n');

const debugScript = `
  echo "=== PM2 LOGS LAST 50 LINES:"
  pm2 logs bcb-global-backend --lines 100 --nostream
  echo
  echo "=== RECENT NGINX ERROR LOGS:"
  tail -100 /var/log/nginx/error.log
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ SSH Connected!');
  
  conn.exec(debugScript, (err, stream) => {
    if (err) { console.error('❌', err); conn.end(); return; }
    
    stream.on('close', () => { conn.end(); })
          .on('data', (data) => { console.log(data.toString()); })
          .stderr.on('data', (data) => { console.error(data.toString()); });
  });
}).connect(config);
