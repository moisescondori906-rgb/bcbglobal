
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🚀 Iniciando despliegue remoto en VPS...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  // Combine all commands into one script
  const deployScript = `
    cd /var/www/bcb_global
    echo "📥 Actualizando código desde GitHub..."
    git pull origin main
    echo "️ Ejecutando migraciones de base de datos..."
    cd backend
    node scripts/add-one-use-per-user-column.mjs || true
    node scripts/fix-schema-safe.mjs || true
    echo "🗄️ Ejecutando migración de tickets..."
    node scripts/migrate-tickets.mjs || true
    echo "📦 Configurando Backend..."
    npm install
    echo "🔄 Reiniciando proceso PM2..."
    pm2 restart bcb-global-backend || pm2 start ecosystem.config.cjs --name bcb-global-backend
    pm2 save
    echo "🎨 Configurando Frontend..."
    cd ../frontend
    npm install
    npm run build
    echo "🌐 Actualizando configuración de Nginx..."
    sudo cp /var/www/bcb_global/bcb_global_nginx.conf /etc/nginx/sites-available/bcb_global
    sudo ln -sf /etc/nginx/sites-available/bcb_global /etc/nginx/sites-enabled/ || true
    echo "🌐 Verificando Nginx..."
    sudo nginx -t && sudo systemctl restart nginx || true
    echo "🩺 Verificando salud del sistema..."
    sleep 5
    pm2 status
    curl -s http://localhost:4000/api/health
    echo "📡 Enviando mensaje de prueba a Telegram..."
    cd /var/www/bcb_global/backend
    cat > test-telegram.mjs << 'EOF'
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

console.log('📡 Enviando mensaje de prueba...');

const testMessage = '✅ Prueba de mensaje desde el bot de BCB Global! Fecha y hora: ' + new Date().toLocaleString('es-BO');

// Create bots WITHOUT polling for test
const botAdmin = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_ADMIN, { polling: false });
const botRetiros = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_RETIROS, { polling: false });

async function sendTest() {
  try {
    console.log('Enviando a canal de retiros...');
    await botRetiros.sendMessage(process.env.TELEGRAM_CHAT_RETIROS, testMessage, { parse_mode: 'HTML' });
    console.log('✅ Mensaje enviado a retiros!');

    console.log('Enviando a admin...');
    await botAdmin.sendMessage(process.env.TELEGRAM_CHAT_ADMIN, testMessage, { parse_mode: 'HTML' });
    console.log('✅ Mensaje enviado a admin!');
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error);
  }
}

sendTest();
EOF
    node test-telegram.mjs
  `;

  console.log('\n🏃 Ejecutando script de despliegue...');
  
  conn.exec(deployScript, (err, stream) => {
    if (err) {
      console.error('❌ Error al ejecutar el script:', err);
      conn.end();
      return;
    }

    stream.on('close', (code, signal) => {
      if (code === 0) {
        console.log('\n✨ Despliegue completado con éxito.');
      } else {
        console.warn(`\n⚠️ El script terminó con código ${code}`);
      }
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
