
import { Client } from 'ssh2';

const config = { host: '173.249.55.143', port: 22, username: 'root', password: '14738941lp', readyTimeout: 120000 };

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH ready!');
  const sqlCmd = `
    cd /var/www/bcb_global/backend && cat > check-cols.js << 'EOF'
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function go() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });
  
  console.log('=== compras_nivel ===');
  const [c] = await conn.query('DESCRIBE compras_nivel');
  console.log(JSON.stringify(c, null, 2));
  
  console.log('\\n=== retiros ===');
  const [r] = await conn.query('DESCRIBE retiros');
  console.log(JSON.stringify(r, null, 2));
  
  console.log('\\n=== telegram_casos_bloqueo ===');
  try {
    const [t] = await conn.query('DESCRIBE telegram_casos_bloqueo');
    console.log(JSON.stringify(t, null, 2));
  } catch(e) { console.log('Table not found'); }
  
  await conn.end();
}
go().catch(e => console.error(e));
EOF

node check-cols.js
rm -f check-cols.js
  `;
  conn.exec(sqlCmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect(config);
