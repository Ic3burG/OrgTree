import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { checkOrgAccess } from './services/member.service.js';
import logger from './utils/logger.js';

let io = null;

/**
 * Initialize Socket.IO with the HTTP server
 * @param {http.Server} httpServer - The HTTP server instance
 * @param {string[]} allowedOrigins - CORS allowed origins
 * @returns {Server} Socket.IO server instance
 */
export function initializeSocket(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    },
    // Ping every 25 seconds, timeout after 60 seconds
    pingInterval: 25000,
    pingTimeout: 60000
  });

  // JWT Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info('Socket connected', {
      socketId: socket.id,
      userId: socket.user.id,
      userName: socket.user.name
    });

    // Join organization room
    socket.on('join:org', async (orgId) => {
      try {
        // Verify user has access to this organization
        const access = checkOrgAccess(orgId, socket.user.id);

        if (!access.hasAccess) {
          socket.emit('error', { message: 'Access denied to organization' });
          return;
        }

        // Leave any previous org rooms (user can only be in one org room at a time)
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('org:') && room !== `org:${orgId}`) {
            socket.leave(room);
          }
        });

        // Join the org room
        const roomName = `org:${orgId}`;
        socket.join(roomName);

        logger.info('User joined org room', {
          socketId: socket.id,
          userId: socket.user.id,
          orgId,
          role: access.role
        });

        socket.emit('joined:org', { orgId, role: access.role });
      } catch (err) {
        logger.error('Error joining org room', { error: err.message });
        socket.emit('error', { message: 'Failed to join organization' });
      }
    });

    // Leave organization room
    socket.on('leave:org', (orgId) => {
      const roomName = `org:${orgId}`;
      socket.leave(roomName);

      logger.info('User left org room', {
        socketId: socket.id,
        userId: socket.user.id,
        orgId
      });

      socket.emit('left:org', { orgId });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId: socket.user.id,
        reason
      });
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

/**
 * Get the Socket.IO server instance
 * @returns {Server|null} Socket.IO server instance
 */
export function getIO() {
  return io;
}

/**
 * Emit an event to all users in an organization room
 * @param {string} orgId - Organization ID
 * @param {string} eventType - Event type (e.g., 'department:created')
 * @param {Object} payload - Event payload
 */
export function emitToOrg(orgId, eventType, payload) {
  if (!io) {
    logger.warn('Socket.IO not initialized, skipping emit');
    return;
  }

  const roomName = `org:${orgId}`;
  io.to(roomName).emit(eventType, payload);

  logger.info('Emitted event to org', {
    orgId,
    eventType,
    room: roomName
  });
}

export default { initializeSocket, getIO, emitToOrg };
