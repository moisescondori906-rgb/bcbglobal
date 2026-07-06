
import { Client } from 'ssh2';

const config = { host: '173.249.55.143', port: 22, username: 'root', password: '14738941lp', readyTimeout: 120000 };

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH ready!');
  const sqlFileContent = `DESCRIBE compras_nivel;\nDESCRIBE retiros;\n`;
  
  conn.exec(`cd /var/www/bcb_global/backend && echo "${sqlFileContent}" > check.sql && node -e "
const fs = require('fs');
const dotenv = require('dotenv');
const { execSync } = require('child_process');
dotenv.config({ path: '.env' });
const mysqlCmd = \`mysql -h \${process.env.DB_HOST} -P \${process.env.DB_PORT} -u \${process.env.DB_USER} -p\${process.env.DB_PASSWORD} \${process.env.DB_NAME} < check.sql\`;
console.log(execSync(mysqlCmd, { encoding: 'utf8' }));
fs.unlinkSync('check.sql');
"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect(config);
