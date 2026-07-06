const { Client } = require('ssh2');

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🔍 Checking PM2 processes...\n');

const debugScript = `
  cd /var/www/bcb_global/backend
  echo "=== PM2 LIST:"
  pm2 list
  echo
  echo "=== PM2 DESCRIBE:"
  pm2 describe bcb-global-backend
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
