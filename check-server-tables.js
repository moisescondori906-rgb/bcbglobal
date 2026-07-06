
import { Client } from 'ssh2';

const config = { host: '173.249.55.143', port: 22, username: 'root', password: '14738941lp', readyTimeout: 120000 };

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connected!');
  const sqlCheck = `
    USE bcb_global;
    DESC compras_nivel;
    DESC retiros;
    DESC telegram_casos_bloqueo;
  `;
  conn.exec(`cd /var/www/bcb_global/backend && node -e "
const mysql = require('mysql2/promise');
async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });
  console.log('=== compras_nivel ===');
  const [c] = await conn.query('DESCRIBE compras_nivel');
  console.log(c);
  console.log('\\n=== retiros ===');
  const [r] = await conn.query('DESCRIBE retiros');
  console.log(r);
  console.log('\\n=== telegram_casos_bloqueo ===');
  try {
    const [t] = await conn.query('DESCRIBE telegram_casos_bloqueo');
    console.log(t);
  } catch(e){ console.log('telegram_casos_bloqueo not found:', e.message);}
  await conn.end();
}
check().catch(e => console.error(e));
"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect(config);
