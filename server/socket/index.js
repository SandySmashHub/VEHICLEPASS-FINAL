import { Server } from 'socket.io';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { allowedOrigins } from '../config/env.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: allowedOrigins(), credentials: true } });

  // Only authenticated, active users may connect; location data is only ever sent to the 'authorized' room.
  io.use(async (socket, next) => {
    try {
      const payload = verifyToken(socket.handshake.auth?.token);
      const user = await User.findById(payload.id).select('name role active');
      if (!user || !user.active) throw new Error('disabled');
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('authorized');
    if (socket.data.user.role === 'ADMIN') socket.join('admins');
  });

  return io;
}

export const emit = (event, payload) => io?.to('authorized').emit(event, payload);
