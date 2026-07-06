const { Client } = require('ssh2');

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🚀 Solucionando error de internarLevel...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const deployScript = `
    cd /var/www/bcb_global
    echo "📥 Actualizando código..."
    git pull origin main
    echo "🔄 Reiniciando backend..."
    pm2 restart bcb-global-backend
    pm2 save
    echo "✅ Todo listo!"
  `;
  
  conn.exec(deployScript, (err, stream) => {
    if (err) {
      console.error('❌ Error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code, signal) => {
      console.log('\n✨ Deploy completado!');
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ Error de conexión:', err.message);
}).connect(config);
