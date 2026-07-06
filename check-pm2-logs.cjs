const { Client } = require('ssh2');

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🔍 Directly checking PM2 log files...\n');

const debugScript = `
  cd /root/.pm2/logs/
  ls -la
  echo
  echo "=== bcb-global-backend-out.log LAST 200 LINES:"
  tail -200 bcb-global-backend-out.log
  echo
  echo "=== bcb-global-backend-error.log LAST 200 LINES:"
  tail -200 bcb-global-backend-error.log
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
