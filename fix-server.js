import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🔧 Conectando al servidor para arreglar...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida');
  
  const commands = [
    'cd /var/www/bcb_global && git remote -v',
    'cd /var/www/bcb_global && git config --get remote.origin.url',
    'cd /var/www/bcb_global && git branch -a',
    'cd /var/www/bcb_global && git fetch --all',
    'cd /var/www/bcb_global && git reset --hard origin/main'
  ];

  let cmdIndex = 0;
  
  function runNextCommand() {
    if (cmdIndex >= commands.length) {
      console.log('\n✅ Todos los comandos ejecutados');
      conn.end();
      return;
    }

    const cmd = commands[cmdIndex];
    console.log(`\n📝 Ejecutando: ${cmd}`);
    console.log('───────────────────────────────────────────────────');
    cmdIndex++;
    
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      
      stream
        .on('close', (code, signal) => {
          console.log('\n✅ Comando completado');
          setTimeout(runNextCommand, 500);
        })
        .on('data', (data) => {
          console.log(data.toString());
        })
        .stderr.on('data', (data) => {
          console.error(data.toString());
        });
    });
  }
  
  runNextCommand();
  
}).on('error', (err) => {
  console.error('❌ Error de conexión:', err);
}).connect(config);
