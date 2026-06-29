import { io } from 'socket.io-client';

const isProd = import.meta.env.PROD;
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || (isProd ? window.location.origin : 'http://localhost:4000');

let socket = null;

export const initSocket = (userId) => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    query: { userId },
    transports: ['websocket'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Conectado al servidor de tiempo real');
  });

  socket.on('disconnect', () => {
    console.log('[SOCKET] Desconectado del servidor de tiempo real');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
