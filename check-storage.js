import { Client } from 'ssh2';

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🔍 Verificando storage...');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conectado');
  
  const commands = `
mkdir -p /var/www/bcb_global/storage/uploads
mkdir -p /var/www/bcb_global/storage/video
mkdir -p /var/www/bcb_global/storage/imag
ln -sfn /var/www/bcb_global/storage/uploads /var/www/bcb_global/backend/public/uploads
ln -sfn /var/www/bcb_global/storage/video /var/www/bcb_global/backend/public/video
ln -sfn /var/www/bcb_global/storage/imag /var/www/bcb_global/backend/public/imag
ls -la /var/www/bcb_global/
ls -la /var/www/bcb_global/storage/
  `;
  
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('data', (data) => console.log(data.toString()));
    stream.stderr.on('data', (data) => console.error(data.toString()));
    stream.on('close', () => {
      console.log('✅ Verificación completada');
      conn.end();
    });
  });
}).on('error', err => console.error('Error:', err)).connect(config);
