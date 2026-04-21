import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 60000
};

console.log('🔍 Verificando base de datos y tablas en el VPS...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const commands = [
    'mysql -u root -p14738941lp -e "SHOW DATABASES LIKE \'bcb_global\';"',
    'mysql -u root -p14738941lp -e "SHOW TABLES FROM bcb_global LIKE \'telegram_casos_bloqueo\';"',
    'mysql -u root -p14738941lp -e "CREATE TABLE IF NOT EXISTS bcb_global.telegram_casos_bloqueo (id INT AUTO_INCREMENT PRIMARY KEY, referencia_id VARCHAR(255) UNIQUE, tipo_operacion VARCHAR(50), estado_operativo VARCHAR(50) DEFAULT \'pendiente\', tomado_por VARCHAR(255), tomado_at DATETIME, resuelto_at DATETIME, telegram_message_id VARCHAR(255), INDEX(referencia_id));"'
  ];

  const executeNext = (index) => {
    if (index >= commands.length) {
      conn.end();
      return;
    }

    const cmd = commands[index];
    console.log(`\n🏃 Ejecutando: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`❌ Error al ejecutar "${cmd}":`, err);
        executeNext(index + 1);
        return;
      }

      stream.on('close', (code, signal) => {
        executeNext(index + 1);
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  };

  executeNext(0);
}).on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err.message);
}).connect(config);
