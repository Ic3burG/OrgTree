import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import {
  initializeSocket,
  getIO,
  emitToOrg,
  emitToUser,
  emitToAdminMetrics,
  getActiveConnectionCount,
} from './socket.js';
import * as memberService from './services/member.service.js';

// Mock dependencies
const mServerInstance = {
  use: vi.fn(),
  on: vi.fn(),
  to: vi.fn().mockReturnThis(),
  emit: vi.fn(),
  sockets: {
    sockets: new Map(),
  },
};

vi.mock('socket.io', () => {
  return {
    Server: vi.fn().mockImplementation(function () {
      return mServerInstance;
    }),
  };
});

vi.mock('jsonwebtoken');
vi.mock('./services/member.service.js');
vi.mock('./utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Socket.IO Infrastructure', () => {
  const mockHttpServer: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    mServerInstance.sockets.sockets.clear();
    initializeSocket(mockHttpServer, ['*']);
  });

  it('should initialize correctly', () => {
    expect(Server).toHaveBeenCalled();
    expect(getIO()).toBe(mServerInstance);
    expect(mServerInstance.use).toHaveBeenCalled();
    expect(mServerInstance.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  describe('Authentication Middleware', () => {
    it('should reject connection if token is missing', () => {
      const middleware = vi.mocked(mServerInstance.use).mock.calls[0]![0];
      const mockNext = vi.fn();
      const mockSocket: any = { handshake: { auth: {} } };

      middleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Authentication required');
    });

    it('should allow connection if token is valid', () => {
      const middleware = vi.mocked(mServerInstance.use).mock.calls[0]![0];
      const mockNext = vi.fn();
      const mockUser = { id: 'u1', name: 'User 1', role: 'admin' };
      const mockSocket: any = { handshake: { auth: { token: 'valid' } } };
      vi.mocked(jwt.verify).mockReturnValue(mockUser as any);

      middleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockSocket.user).toEqual(mockUser);
    });
  });

  describe('Connection Handlers', () => {
    let mockSocket: any;
    const mockUser = { id: 'u1', name: 'User 1', role: 'admin' };

    beforeEach(() => {
      mockSocket = {
        id: 'socket-1',
        user: mockUser,
        join: vi.fn(),
        leave: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
        rooms: new Set(['socket-1']),
      };
    });

    it('should register events on connection', () => {
      const connectionHandler = vi
        .mocked(mServerInstance.on)
        .mock.calls.find(c => c[0] === 'connection')![1];
      connectionHandler(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('user:u1');
      expect(mockSocket.on).toHaveBeenCalledWith('join:org', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leave:org', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('join:admin:metrics', expect.any(Function));
    });

    it('should handle join:org', async () => {
      const connectionHandler = vi
        .mocked(mServerInstance.on)
        .mock.calls.find(c => c[0] === 'connection')![1];
      connectionHandler(mockSocket);

      const joinOrgHandler = mockSocket.on.mock.calls.find((c: any) => c[0] === 'join:org')[1];
      vi.mocked(memberService.checkOrgAccess).mockReturnValue({
        hasAccess: true,
        role: 'admin',
      } as any);

      await joinOrgHandler('org-1');

      expect(mockSocket.join).toHaveBeenCalledWith('org:org-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('joined:org', { orgId: 'org-1', role: 'admin' });
    });

    it('should prevent join:org if no access', async () => {
      const connectionHandler = vi
        .mocked(mServerInstance.on)
        .mock.calls.find(c => c[0] === 'connection')![1];
      connectionHandler(mockSocket);

      const joinOrgHandler = mockSocket.on.mock.calls.find((c: any) => c[0] === 'join:org')[1];
      vi.mocked(memberService.checkOrgAccess).mockReturnValue({ hasAccess: false } as any);

      await joinOrgHandler('org-1');

      expect(mockSocket.join).not.toHaveBeenCalledWith('org:org-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Access denied to organization',
      });
    });

    it('should handle join:admin:metrics', () => {
      mockSocket.user.role = 'superuser';
      const connectionHandler = vi
        .mocked(mServerInstance.on)
        .mock.calls.find(c => c[0] === 'connection')![1];
      connectionHandler(mockSocket);

      const handler = mockSocket.on.mock.calls.find((c: any) => c[0] === 'join:admin:metrics')[1];
      handler();

      expect(mockSocket.join).toHaveBeenCalledWith('admin:metrics');
      expect(mockSocket.emit).toHaveBeenCalledWith('joined:admin:metrics');
    });

    it('should forbid join:admin:metrics for non-superusers', () => {
      mockSocket.user.role = 'admin';
      const connectionHandler = vi
        .mocked(mServerInstance.on)
        .mock.calls.find(c => c[0] === 'connection')![1];
      connectionHandler(mockSocket);

      const handler = mockSocket.on.mock.calls.find((c: any) => c[0] === 'join:admin:metrics')[1];
      handler();

      expect(mockSocket.join).not.toHaveBeenCalledWith('admin:metrics');
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Access denied to admin metrics',
      });
    });
  });

  describe('Emission Helpers', () => {
    it('should emit to org', () => {
      emitToOrg('org-1', 'event', { data: 1 });
      expect(mServerInstance.to).toHaveBeenCalledWith('org:org-1');
      expect(mServerInstance.emit).toHaveBeenCalledWith('event', { data: 1 });
    });

    it('should emit to user', () => {
      emitToUser('u1', 'event', { data: 2 });
      expect(mServerInstance.to).toHaveBeenCalledWith('user:u1');
      expect(mServerInstance.emit).toHaveBeenCalledWith('event', { data: 2 });
    });

    it('should emit to admin metrics', () => {
      emitToAdminMetrics('metrics', { cpu: 50 });
      expect(mServerInstance.to).toHaveBeenCalledWith('admin:metrics');
      expect(mServerInstance.emit).toHaveBeenCalledWith('metrics', { cpu: 50 });
    });

    it('should return active connection count', () => {
      mServerInstance.sockets.sockets.set('s1', {});
      mServerInstance.sockets.sockets.set('s2', {});
      expect(getActiveConnectionCount()).toBe(2);
    });
  });
});
