import { Server } from 'socket.io';
import logger from '../utils/logger.mjs';

let io = null;

/**
 * Inicializa el servidor de WebSockets v12.0.0
 * @param {import('http').Server} server 
 */
export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // En producción, permitir orígenes específicos o "*"
        callback(null, true);
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket'], // Forzar websocket para evitar errores 400 en cluster PM2
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      logger.info(`[SOCKET] Usuario conectado: ${userId} (Socket ID: ${socket.id})`);
    }

    socket.on('disconnect', () => {
      if (userId) {
        logger.info(`[SOCKET] Usuario desconectado: ${userId}`);
      }
    });
  });

  return io;
}

/**
 * Envía un mensaje a un usuario específico
 */
export function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Envía un mensaje a todos los usuarios
 */
export function emitToAll(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

export default { initSocket, emitToUser, emitToAll };
