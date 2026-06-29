import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🚀 Ejecutando migración en el servidor...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const commands = [
    'cd /var/www/bcb_global/backend',
    'node migrations/update-withdrawals-bank-accounts.mjs'
  ];
  
  conn.exec(commands.join(' && '), (err, stream) => {
    if (err) {
      console.error('❌ Error ejecutando comando:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('\n✅ Migración finalizada!');
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err.message);
}).connect(config);
