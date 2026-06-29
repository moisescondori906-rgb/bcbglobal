import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🚀 Desplegando sincronización en tiempo real (Refresh 2s)...');

conn.on('ready', () => {
  const commands = [
    'cd /var/www/bcb_global && git fetch origin && git reset --hard origin/main',
    'cd /var/www/bcb_global/frontend && npm run build',
    'pm2 restart bcb-global-backend'
  ];

  const execute = (i) => {
    if (i >= commands.length) {
      console.log('✨ Despliegue de Tiempo Real completado.');
      conn.end();
      return;
    }
    console.log(`\n🏃 Ejecutando: ${commands[i]}`);
    conn.exec(commands[i], (err, stream) => {
      if (err) {
        console.error(err);
        conn.end();
        return;
      }
      stream.on('close', () => execute(i + 1))
            .on('data', d => process.stdout.write(d.toString()))
            .stderr.on('data', d => process.stderr.write(d.toString()));
    });
  };

  execute(0);
}).on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err.message);
}).connect(config);
