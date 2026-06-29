
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 120000
};

conn.on('ready', () => {
  console.log('✅ SSH Ready');
  const commands = [
    'mysql -u root -p14738941lp -e "USE bcb_global; UPDATE niveles SET retiro_dia_inicio = 1, retiro_dia_fin = 5;"',
    'mysql -u root -p14738941lp -e "USE bcb_global; UPDATE metodos_qr SET dias_semana = \'1,2,3,4,5\';"',
    'redis-cli FLUSHALL',
    'pm2 restart bcb-global-backend'
  ];

  const execCmd = (i) => {
    if (i >= commands.length) return conn.end();
    console.log(`\n$ ${commands[i]}`);
    conn.exec(commands[i], (err, stream) => {
      if (err) throw err;
      stream.on('close', () => execCmd(i + 1))
            .on('data', data => process.stdout.write(data))
            .stderr.on('data', data => process.stderr.write(data));
    });
  };
  execCmd(0);
}).connect(config);
