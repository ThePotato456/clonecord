const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { readData, writeData } = require('./lib/store');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const serverRoutes = require('./routes/server.routes');
const channelRoutes = require('./routes/channel.routes');
const messageRoutes = require('./routes/message.routes');

function createApp() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
    })
  );
  app.use((req, _res, next) => {
    req.io = io;
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/servers', serverRoutes);
  app.use('/api/channels', channelRoutes);
  app.use('/api/messages', messageRoutes);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      return next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const db = readData();
    const user = db.users.find((entry) => entry.id === socket.userId);
    if (user) {
      user.status = 'online';
      user.lastSeenAt = new Date().toISOString();
      writeData(db);

      socket.join(`user:${user.id}`);
      (user.serverIds || []).forEach((serverId) => socket.join(`server:${serverId}`));
    }

    socket.on('server:join', ({ serverId }) => {
      if (!serverId) return;
      socket.join(`server:${serverId}`);
    });

    socket.on('server:leave', ({ serverId }) => {
      if (!serverId) return;
      socket.leave(`server:${serverId}`);
    });

    socket.on('channel:join', ({ serverId, channelId }) => {
      if (!serverId || !channelId) return;
      socket.join(`channel:${serverId}:${channelId}`);
    });

    socket.on('channel:leave', ({ serverId, channelId }) => {
      if (!serverId || !channelId) return;
      socket.leave(`channel:${serverId}:${channelId}`);
    });

    socket.on('typing:start', ({ serverId, channelId }) => {
      if (!serverId || !channelId) return;
      socket.to(`channel:${serverId}:${channelId}`).emit('typing:user_typing', {
        userId: socket.userId,
        username: socket.username,
      });
    });

    socket.on('typing:end', ({ serverId, channelId }) => {
      if (!serverId || !channelId) return;
      socket.to(`channel:${serverId}:${channelId}`).emit('typing:user_stopped', {
        userId: socket.userId,
        username: socket.username,
      });
    });

    socket.on('disconnect', () => {
      const current = readData();
      const currentUser = current.users.find((entry) => entry.id === socket.userId);
      if (currentUser) {
        currentUser.status = 'offline';
        currentUser.lastSeenAt = new Date().toISOString();
        writeData(current);
      }
    });
  });

  return { app, server, io };
}

module.exports = {
  createApp,
};
