import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🔍 Conectando al servidor para revisar...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida');
  
  const commands = [
    'cd /var/www/bcb_global && pwd',
    'cd /var/www/bcb_global && git status',
    'cd /var/www/bcb_global && git log --stat --oneline -3',
    'ls -la /var/www/bcb_global/frontend/public/imag/'
  ];

  commands.forEach((cmd, index) => {
    setTimeout(() => {
      conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        console.log(`\n📝 Ejecutando: ${cmd}`);
        console.log('───────────────────────────────────────────────────');
        stream
          .on('close', (code, signal) => {
            if (index === commands.length - 1) {
              console.log('\n✅ Chequeo completado, cerrando conexión');
              conn.end();
            }
          })
          .on('data', (data) => {
            console.log(data.toString());
          })
          .stderr.on('data', (data) => {
            console.error('❌ Error:', data.toString());
          });
      });
    }, index * 1000);
  });
  
}).on('error', (err) => {
  console.error('❌ Error de conexión:', err);
}).connect(config);
