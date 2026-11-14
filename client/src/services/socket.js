import { io } from 'socket.io-client';
import { API_URL } from './api.js';

let socket = null;

export function connectSocket(token) {
  disconnectSocket();
  socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'], reconnectionDelayMax: 10000 });
  return socket;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
  socket = null;
}
