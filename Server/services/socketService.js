// Server/services/socketService.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.IO instance
 * @param {import('http').Server} server 
 * @param {Array<string>} allowedOrigins 
 */
function initSocket(server, allowedOrigins = []) {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        try {
          const url = new URL(origin);
          const host = url.hostname;
          if (
            allowedOrigins.includes(origin) ||
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host === '0.0.0.0' ||
            host.endsWith('.vercel.app') ||
            host === 'vercel.app' ||
            host.endsWith('.onrender.com')
          ) {
            return callback(null, true);
          }
        } catch {
          // ignore
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const token = 
        socket.handshake.auth?.token || 
        socket.handshake.query?.token || 
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

      if (!token) {
        // Allow unauthenticated connection but without private room access
        return next();
      }

      const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          console.warn('⚠️ Socket auth failed:', err.message);
          return next(); // Still allow connection; client can re-auth
        }

        socket.user = decoded;
        socket.userId = (decoded.userId || decoded.id || decoded._id)?.toString();
        socket.userRole = (decoded.role || 'user').toLowerCase();
        next();
      });
    } catch (err) {
      console.warn('⚠️ Socket middleware error:', err.message);
      next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const userRole = socket.userRole;

    if (userId) {
      socket.join(`user:${userId}`);
      if (userRole) {
        socket.join(`role:${userRole}`);
      }
      console.log(`🔌 [Socket.IO] Authenticated user connected: ${userId} (${userRole}) [Socket ${socket.id}]`);
    } else {
      console.log(`🔌 [Socket.IO] Guest/unauthenticated socket connected [Socket ${socket.id}]`);
    }

    // Dynamic authenticate event if client signs in post-connection
    socket.on('authenticate', (token) => {
      if (!token) return;
      const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
      jwt.verify(token, secret, (err, decoded) => {
        if (!err && decoded) {
          socket.user = decoded;
          socket.userId = (decoded.userId || decoded.id || decoded._id)?.toString();
          socket.userRole = (decoded.role || 'user').toLowerCase();

          socket.join(`user:${socket.userId}`);
          if (socket.userRole) {
            socket.join(`role:${socket.userRole}`);
          }
          console.log(`🔌 [Socket.IO] Client dynamically authenticated: ${socket.userId}`);
          socket.emit('authenticated', { userId: socket.userId, role: socket.userRole });
        }
      });
    });

    // Join conversation thread room for live messaging
    socket.on('join_thread', ({ requestId }) => {
      if (requestId) {
        socket.join(`thread:${requestId}`);
      }
    });

    socket.on('leave_thread', ({ requestId }) => {
      if (requestId) {
        socket.leave(`thread:${requestId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      if (userId) {
        console.log(`🔌 [Socket.IO] User disconnected: ${userId} (${reason})`);
      }
    });
  });

  console.log('⚡ Socket.IO initialized and attached to HTTP server');
  return io;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
  return io;
}

/**
 * Emit event to a specific user
 * @param {string} userId 
 * @param {string} event 
 * @param {any} data 
 */
function sendToUser(userId, event, data) {
  if (!io || !userId) return false;
  io.to(`user:${userId.toString()}`).emit(event, data);
  return true;
}

/**
 * Emit event to a specific role (e.g. 'admin', 'owner', 'tenant')
 * @param {string} role 
 * @param {string} event 
 * @param {any} data 
 */
function sendToRole(role, event, data) {
  if (!io || !role) return false;
  io.to(`role:${role.toLowerCase()}`).emit(event, data);
  return true;
}

/**
 * Emit event to a conversation thread
 * @param {string} requestId 
 * @param {string} event 
 * @param {any} data 
 */
function sendToThread(requestId, event, data) {
  if (!io || !requestId) return false;
  io.to(`thread:${requestId.toString()}`).emit(event, data);
  return true;
}

/**
 * Broadcast new notification with updated unread count
 */
function emitNewNotification(recipientId, notification, unreadCount) {
  if (!recipientId) return;
  const idStr = recipientId.toString();
  sendToUser(idStr, 'notification:new', notification);
  if (typeof unreadCount === 'number') {
    sendToUser(idStr, 'notification:unread_count', { unreadCount });
  }
}

/**
 * Broadcast unread count update
 */
function emitUnreadCount(userId, unreadCount) {
  if (!userId) return;
  sendToUser(userId.toString(), 'notification:unread_count', { unreadCount });
}

/**
 * Broadcast new message event
 */
function emitNewMessage(recipientId, requestId, messageData, unreadMessagesCount) {
  if (recipientId) {
    sendToUser(recipientId.toString(), 'message:new', {
      requestId: requestId?.toString(),
      message: messageData,
      unreadMessagesCount
    });
  }
  if (requestId) {
    sendToThread(requestId.toString(), 'thread:message:new', {
      requestId: requestId.toString(),
      message: messageData
    });
  }
}

/**
 * Broadcast message read event
 */
function emitMessagesRead(userId, requestId) {
  if (userId) {
    sendToUser(userId.toString(), 'message:read', {
      requestId: requestId?.toString()
    });
  }
  if (requestId) {
    sendToThread(requestId.toString(), 'thread:messages:read', {
      userId: userId?.toString(),
      requestId: requestId.toString()
    });
  }
}

module.exports = {
  initSocket,
  getIO,
  sendToUser,
  sendToRole,
  sendToThread,
  emitNewNotification,
  emitUnreadCount,
  emitNewMessage,
  emitMessagesRead
};
