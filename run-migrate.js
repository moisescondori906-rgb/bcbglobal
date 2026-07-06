
import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 120000
};

const migrateContent = readFileSync('c:\\Users\\Lenovo\\Desktop\\nuevo-proyecto\\bcb-global\\migrate-limites.mjs', 'utf8');

conn.on('ready', () => {
  console.log('✅ SSH Ready');

  const commands = [
    `cd /var/www/bcb_global && echo '${migrateContent.replace(/'/g, "\\'")}' > migrate-limites.mjs`,
    `cd /var/www/bcb_global && node migrate-limites.mjs`,
    `cd /var/www/bcb_global && rm -f migrate-limites.mjs`
  ];

  let i = 0;
  const execNext = () => {
    if (i >= commands.length) {
      console.log('✅ All commands done!');
      return conn.end();
    }

    const cmd = commands[i];
    console.log(`\n📝 Executing: ${cmd}`);

    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error('❌ Error:', err);
        return conn.end();
      }

      stream.on('close', (code) => {
        console.log(`📝 Command exited with code ${code}`);
        i++;
        execNext();
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  };

  execNext();
}).connect(config);
