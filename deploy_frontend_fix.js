
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

console.log('🚀 Iniciando despliegue de corrección del Frontend en VPS...');

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
      
      console.log('🔄 Reiniciando aplicación por seguridad...');
      const commands = [
        'pm2 restart bcb-global',
        'pm2 status'
      ];

      const executeNext = (index) => {
        if (index >= commands.length) {
          console.log('✨ Despliegue del Frontend completado con éxito.');
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
