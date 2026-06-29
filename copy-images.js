import { Client } from 'ssh2';

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('📁 Copiando imágenes a storage...');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conectado');
  
  const commands = `
cp -r /var/www/bcb_global/frontend/public/imag/* /var/www/bcb_global/storage/imag/
cp -r /var/www/bcb_global/frontend/public/video/* /var/www/bcb_global/storage/video/ 2>/dev/null || true
chmod -R 755 /var/www/bcb_global/storage/
ls -la /var/www/bcb_global/storage/imag/
  `;
  
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('data', (data) => console.log(data.toString()));
    stream.stderr.on('data', (data) => console.error(data.toString()));
    stream.on('close', () => {
      console.log('✅ Imágenes copiadas');
      conn.end();
    });
  });
}).on('error', err => console.error('Error:', err)).connect(config);
