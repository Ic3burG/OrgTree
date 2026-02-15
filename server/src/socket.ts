/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import type { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { checkOrgAccess } from './services/member.service.js';
import logger from './utils/logger.js';
import type { JWTPayload } from './types/index.js';

let io: Server | null = null;

/**
 * Initialize Socket.IO with the HTTP server
 */
export function initializeSocket(httpServer: HTTPServer, allowedOrigins: string[]): Server {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Ping every 25 seconds, timeout after 60 seconds
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // JWT Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }
      const decoded = jwt.verify(token, secret) as unknown as JWTPayload;
      socket.user = decoded;
      next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  // Connection handler
  io.on('connection', socket => {
    logger.info('Socket connected', {
      socketId: socket.id,
      userId: socket.user.id,
      userName: socket.user.name,
    });

    // Join user-specific room for private notifications
    const userRoom = `user:${socket.user.id}`;
    socket.join(userRoom);

    logger.info('User joined rooms', {
      socketId: socket.id,
      userId: socket.user.id,
      rooms: [userRoom],
    });

    // Join organization room
    socket.on('join:org', async (orgId: string) => {
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
          role: access.role,
        });

        socket.emit('joined:org', { orgId, role: access.role });
      } catch (err: unknown) {
        logger.error('Error joining org room', { error: (err as Error).message });
        socket.emit('error', { message: 'Failed to join organization' });
      }
    });

    // Leave organization room
    socket.on('leave:org', (orgId: string) => {
      const roomName = `org:${orgId}`;
      socket.leave(roomName);

      logger.info('User left org room', {
        socketId: socket.id,
        userId: socket.user.id,
        orgId,
      });

      socket.emit('left:org', { orgId });
    });

    // Join admin metrics room (superusers only)
    socket.on('join:admin:metrics', () => {
      // Only superusers can join the admin metrics room
      if (socket.user.role !== 'superuser') {
        socket.emit('error', { message: 'Access denied to admin metrics' });
        return;
      }

      socket.join('admin:metrics');
      logger.info('User joined admin metrics room', {
        socketId: socket.id,
        userId: socket.user.id,
      });
      socket.emit('joined:admin:metrics');
    });

    // Leave admin metrics room
    socket.on('leave:admin:metrics', () => {
      socket.leave('admin:metrics');
      logger.info('User left admin metrics room', {
        socketId: socket.id,
        userId: socket.user.id,
      });
      socket.emit('left:admin:metrics');
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId: socket.user.id,
        reason,
      });
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getIO(): Server | null {
  return io;
}

/**
 * Emit an event to all users in an organization room
 */
export function emitToOrg(orgId: string, eventType: string, payload: unknown): void {
  if (!io) {
    logger.warn('Socket.IO not initialized, skipping emit');
    return;
  }

  const roomName = `org:${orgId}`;
  io.to(roomName).emit(eventType, payload);

  logger.info('Emitted event to org', {
    orgId,
    eventType,
    room: roomName,
  });
}

/**
 * Emit an event to a specific user
 */
export function emitToUser(userId: string, eventType: string, payload: unknown): void {
  if (!io) {
    logger.warn('Socket.IO not initialized, skipping emit');
    return;
  }

  const roomName = `user:${userId}`;
  io.to(roomName).emit(eventType, payload);

  logger.info('Emitted event to user', {
    userId,
    eventType,
    room: roomName,
  });
}

/**
 * Emit an event to the admin metrics room (superusers only)
 */
export function emitToAdminMetrics(eventType: string, payload: unknown): void {
  if (!io) {
    logger.warn('Socket.IO not initialized, skipping emit');
    return;
  }

  io.to('admin:metrics').emit(eventType, payload);
}

/**
 * Get the count of active Socket.IO connections
 */
export function getActiveConnectionCount(): number {
  if (!io) {
    return 0;
  }
  return io.sockets.sockets.size;
}

export default {
  initializeSocket,
  getIO,
  emitToOrg,
  emitToUser,
  emitToAdminMetrics,
  getActiveConnectionCount,
};
