import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import { setIO } from './utils/realtime.js';

export function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: true, credentials: true } });

  io.use(async (socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      const user = await User.findById(id).lean();
      if (!user) return next(new Error('unauthorized'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const u = socket.data.user;
    socket.join(`user:${u._id}`);
    if (u.role === 'student') socket.join(`students:${u.hostel}`);
    if (u.role === 'council') socket.join(`council:${u.hostel}`);
    if (u.role === 'authority') socket.join(`authority:${u.authority}`);
  });

  setIO(io);
  return io;
}
