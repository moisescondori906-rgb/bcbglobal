
import { Client } from 'ssh2';
import { createWriteStream } from 'fs';
import { join } from 'path';

const conn = new Client();
const config = { host: '173.249.55.143', port: 22, username: 'root', password: '14738941lp', readyTimeout: 120000 };

conn.on('ready', () => {
  console.log('✅ SSH Ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const localPath = join(process.cwd(), 'withdrawals-server.mjs');
    console.log(`📥 Downloading withdrawals.mjs to ${localPath}`);
    const writeStream = createWriteStream(localPath);
    
    sftp.fastGet('/var/www/bcb_global/backend/src/handlers/api/withdrawals.mjs', localPath, (err) => {
      if (err) throw err;
      console.log('✅ File downloaded');
      sftp.end();
      conn.end();
    });
  });
}).connect(config);
