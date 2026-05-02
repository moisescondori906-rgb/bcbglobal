import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

/**
 * Multer config para subidas locales de video
 */
const localVideoStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'tareas');
    try {
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `${uuidv4()}${ext}`);
  }
});

export const uploadLocalVideo = multer({
  storage: localVideoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten archivos de video.'));
  }
});

/**
 * Asegura que el directorio de uploads exista.
 */
async function ensureUploadsDir(folder = '') {
  const dir = path.join(UPLOADS_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Guarda un buffer como archivo localmente y devuelve la URL.
 * @param {Buffer} buffer 
 * @param {Object} options 
 * @returns {Promise<{secure_url: string}>}
 */
export async function uploadImageBuffer(buffer, options = {}) {
  const folder = options.folder ? options.folder.replace('bcb_global/', '') : 'general';
  const dir = await ensureUploadsDir(folder);
  
  const filename = `${uuidv4()}.jpg`;
  const filepath = path.join(dir, filename);
  
  await fs.writeFile(filepath, buffer);
  
  // La URL será relativa al servidor, e.g., /uploads/banners/uuid.jpg
  const relativeUrl = `/uploads/${folder}/${filename}`;
  
  return {
    secure_url: relativeUrl,
    public_id: filename
  };
}

/**
 * Símil para videos si fuera necesario.
 */
export async function uploadVideoBuffer(buffer, options = {}) {
  const folder = options.folder ? options.folder.replace('bcb_global/', '') : 'videos';
  const dir = await ensureUploadsDir(folder);
  
  const filename = `${uuidv4()}.mp4`;
  const filepath = path.join(dir, filename);
  
  await fs.writeFile(filepath, buffer);
  
  const relativeUrl = `/uploads/${folder}/${filename}`;
  
  return {
    secure_url: relativeUrl,
    public_id: filename
  };
}

export async function deleteLocalFile(filepath) {
  try {
    const fullPath = path.join(UPLOADS_DIR, filepath.replace('/uploads/', ''));
    await fs.unlink(fullPath);
    return true;
  } catch (err) {
    console.error('Error deleting local file:', err);
    return false;
  }
}
