
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const sql = "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '14738941lp'; FLUSH PRIVILEGES;";
  conn.exec(`mysql -u root -e "${sql}"`, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }

    stream.on('close', (code) => {
      console.log(`\nExit code: ${code}`);
      conn.end();
    })
    .on('data', (data) => process.stdout.write(data.toString()))
    .stderr.on('data', (data) => process.stderr.write(data.toString()));
  });
}).on('error', (err) => {
  console.error('❌ Error SSH:', err.message);
}).connect(config);
