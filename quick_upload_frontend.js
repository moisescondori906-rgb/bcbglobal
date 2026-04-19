
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

console.log('🚀 Iniciando subida rápida del Frontend...');

async function uploadDir(sftp, localDir, remoteDir) {
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
      console.log('📤 Subiendo archivos de dist...');
      await uploadDir(sftp, LOCAL_DIST_PATH, REMOTE_DIST_PATH);
      console.log('✨ Subida completada.');
      conn.end();
    } catch (error) {
      console.error('❌ Error:', error.message);
      conn.end();
    }
  });
}).on('error', (err) => {
  console.error('❌ Error SSH:', err.message);
}).connect(config);
