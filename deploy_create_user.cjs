const { Client } = require('ssh2');

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🔄 Iniciando proceso para crear usuario...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const deployScript = `
    cd /var/www/bcb_global
    echo "📥 Actualizando código..."
    git pull origin main
    echo "👤 Creando usuario +59162338686..."
    cd backend
    node scripts/create_user_+59162338686.mjs
    echo "✅ Proceso completado!"
  `;
  
  conn.exec(deployScript, (err, stream) => {
    if (err) {
      console.error('❌ Error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code, signal) => {
      console.log('\n✨ Finalizado.');
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
