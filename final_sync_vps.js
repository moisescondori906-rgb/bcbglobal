
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

const LOCAL_DIST_PATH = 'C:/Users/Lenovo/Documents/SAV-main/frontend/dist';
const REMOTE_DIST_PATH = '/var/www/bcb_global/frontend/dist';
const LOCAL_BACKEND_PATH = 'C:/Users/Lenovo/Documents/SAV-main/backend/src';
const REMOTE_BACKEND_PATH = '/var/www/bcb_global/backend/src';
const LOCAL_DB_CONFIG = 'C:/Users/Lenovo/Documents/SAV-main/backend/src/config/db.js';
const REMOTE_DB_CONFIG = '/var/www/bcb_global/backend/src/config/db.js';

console.log('🚀 Iniciando sincronización final con el servidor VPS...');

async function uploadDir(sftp, localDir, remoteDir) {
  if (!fs.existsSync(localDir)) {
      console.warn(`⚠️ Directorio local no existe: ${localDir}`);
      return;
  }
  const files = fs.readdirSync(localDir);
  
  await new Promise((resolve) => {
    conn.exec(`mkdir -p ${remoteDir}`, () => resolve());
  });

  for (const file of files) {
    const localFilePath = path.join(localDir, file);
    const remoteFilePath = path.posix.join(remoteDir, file);
    const stats = fs.statSync(localFilePath);

    if (stats.isDirectory()) {
      await uploadDir(sftp, localFilePath, remoteFilePath);
    } else {
      await new Promise((resolve, reject) => {
        sftp.fastPut(localFilePath, remoteFilePath, (err) => {
          if (err) {
            console.error(`❌ Error subiendo ${file}:`, err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }
}

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');

  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('❌ Error SFTP:', err.message);
      conn.end();
      return;
    }

    try {
      console.log('📤 Sincronizando Frontend (dist)...');
      await uploadDir(sftp, LOCAL_DIST_PATH, REMOTE_DIST_PATH);
      
      console.log('📤 Sincronizando Backend (src)...');
      await uploadDir(sftp, LOCAL_BACKEND_PATH, REMOTE_BACKEND_PATH);

      console.log('🔄 Reiniciando aplicación y limpiando puertos...');
      const commands = [
        'pm2 delete bcb-global || true',
        'fuser -k 4000/tcp || true',
        'pkill -9 node || true',
        'sleep 3',
        'cd /var/www/bcb_global/backend && pm2 start src/index.js --name bcb-global',
        'sleep 5',
        'pm2 status',
        'curl -s http://localhost:4000/api/health'
      ];

      const executeNext = (index) => {
        if (index >= commands.length) {
          console.log('✨ Sincronización y despliegue completados con éxito.');
          conn.end();
          return;
        }
        console.log(`🏃 Ejecutando: ${commands[index]}`);
        conn.exec(commands[index], (err, stream) => {
          if (err) { console.error(err); executeNext(index + 1); return; }
          stream.on('close', () => executeNext(index + 1))
                .on('data', (data) => process.stdout.write(data.toString()))
                .stderr.on('data', (data) => process.stderr.write(data.toString()));
        });
      };
      executeNext(0);

    } catch (error) {
      console.error('❌ Error crítico durante la sincronización:', error.message);
      conn.end();
    }
  });
}).on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err.message);
}).connect(config);
