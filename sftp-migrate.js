
import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const conn = new Client();
const config = { host: '173.249.55.143', port: 22, username: 'root', password: '14738941lp', readyTimeout: 120000 };

conn.on('ready', () => {
  console.log('✅ SSH Ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('✓ SFTP Connected');
    
    const buffer = readFileSync('c:\\Users\\Lenovo\\Desktop\\nuevo-proyecto\\bcb-global\\migrate-limites.mjs');
    sftp.writeFile('/var/www/bcb_global/migrate-limites.mjs', buffer, (err) => {
      if (err) throw err;
      console.log('✓ File uploaded');
      sftp.end();
      
      // Now run the migration
      console.log('\n📝 Running migration...');
      conn.exec('cd /var/www/bcb_global && node migrate-limites.mjs && rm -f migrate-limites.mjs', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
          console.log(`📝 Migration exited with code ${code}`);
          conn.end();
        }).on('data', (data) => process.stdout.write(data.toString())).stderr.on('data', (data) => process.stderr.write(data.toString()));
      });
    });
  });
}).connect(config);
