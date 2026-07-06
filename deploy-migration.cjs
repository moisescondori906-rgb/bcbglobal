
const { Client } = require('ssh2');

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🗄️ Iniciando migración...');

conn.on('ready', () =&gt; {
  console.log('✅ Conexión SSH establecida.');
  
  const deployScript = `
    cd /var/www/bcb_global
    echo "📥 Actualizando código..."
    git pull origin main
    echo "🗄️ Ejecutando migración de tickets..."
    cd backend
    node scripts/migrate-tickets.js
    echo "🔄 Reiniciando backend..."
    pm2 restart bcb-global-backend
    pm2 save
    echo "✅ Todo listo!"
  `;
  
  conn.exec(deployScript, (err, stream) =&gt; {
    if (err) {
      console.error('❌ Error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code, signal) =&gt; {
      console.log('\n✨ Proceso completado.');
      conn.end();
    }).on('data', (data) =&gt; {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) =&gt; {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) =&gt; {
  console.error('❌ Error de conexión:', err.message);
}).connect(config);

