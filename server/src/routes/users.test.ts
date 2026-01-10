import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import usersRouter from './users.js';
import * as usersService from '../services/users.service.js';

// Mock dependencies
vi.mock('../services/users.service.js');
vi.mock('../services/audit.service.js');

// Mock express-rate-limit to avoid rate limiting in tests
vi.mock('express-rate-limit', () => ({
  default: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}));

describe('Users Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', usersRouter);

    // Setup error handler
    app.use(
      (
        _err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        res.status(500).json({ message: _err.message });
      }
    );
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const createAuthToken = (userId = '1', role: 'user' | 'admin' | 'superuser' = 'superuser') => {
    return jwt.sign(
      { id: userId, email: 'superuser@example.com', name: 'Super User', role },
      'test-secret-key',
      { expiresIn: '1h' }
    );
  };

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const mockResult = {
        user: {
          id: '1',
          name: 'New User',
          email: 'newuser@example.com',
          role: 'user',
        },
        temporaryPassword: 'temp-password-123',
      };

      vi.mocked(usersService.createAdminUser).mockResolvedValue(mockResult as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          role: 'user',
        })
        .expect(201);

      expect(response.body).toEqual(mockResult);
      expect(usersService.createAdminUser).toHaveBeenCalledWith(
        'New User',
        'newuser@example.com',
        'user'
      );
    });

    it('should reject request with missing name', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newuser@example.com',
          role: 'user',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Name, email, and role are required',
      });
    });

    it('should reject request with missing email', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New User',
          role: 'user',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Name, email, and role are required',
      });
    });

    it('should reject request with missing role', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New User',
          email: 'newuser@example.com',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Name, email, and role are required',
      });
    });

    it('should reject non-superuser requests', async () => {
      const token = createAuthToken('1', 'user');
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          role: 'user',
        })
        .expect(403);

      expect(response.body).toEqual({
        message: 'Insufficient permissions',
      });
    });
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@example.com', role: 'user' },
        { id: '2', name: 'User 2', email: 'user2@example.com', role: 'admin' },
      ];

      vi.mocked(usersService.getAllUsers).mockReturnValue(mockUsers as any);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockUsers);
      expect(usersService.getAllUsers).toHaveBeenCalled();
    });

    it('should reject non-superuser requests', async () => {
      const token = createAuthToken('1', 'admin');
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({
        message: 'Insufficient permissions',
      });
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a specific user', async () => {
      const mockUser = {
        id: '1',
        name: 'User 1',
        email: 'user1@example.com',
        role: 'user',
      };

      vi.mocked(usersService.getUserById).mockReturnValue(mockUser as any);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockUser);
      expect(usersService.getUserById).toHaveBeenCalledWith('1');
    });

    it('should handle user not found', async () => {
      vi.mocked(usersService.getUserById).mockImplementation(() => {
        throw new Error('User not found');
      });

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/users/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'User not found',
      });
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user details', async () => {
      const mockUser = {
        id: '1',
        name: 'Updated Name',
        email: 'updated@example.com',
        role: 'user',
      };

      vi.mocked(usersService.updateUser).mockReturnValue(mockUser as any);

      const token = createAuthToken();
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          email: 'updated@example.com',
        })
        .expect(200);

      expect(response.body).toEqual(mockUser);
      expect(usersService.updateUser).toHaveBeenCalledWith('1', {
        name: 'Updated Name',
        email: 'updated@example.com',
      });
    });

    it('should allow update with only name', async () => {
      const mockUser = {
        id: '1',
        name: 'Updated Name',
        email: 'original@example.com',
        role: 'user',
      };

      vi.mocked(usersService.updateUser).mockReturnValue(mockUser as any);

      const token = createAuthToken();
      await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(usersService.updateUser).toHaveBeenCalledWith('1', {
        name: 'Updated Name',
        email: undefined,
      });
    });

    it('should reject update with no fields', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        message: 'At least one field (name or email) is required',
      });
    });
  });

  describe('PUT /api/users/:id/role', () => {
    it('should update user role', async () => {
      const mockUser = {
        id: '1',
        name: 'User 1',
        email: 'user1@example.com',
        role: 'admin',
      };

      vi.mocked(usersService.updateUserRole).mockReturnValue(mockUser as any);

      const token = createAuthToken();
      const response = await request(app)
        .put('/api/users/1/role')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'admin',
        })
        .expect(200);

      expect(response.body).toEqual(mockUser);
      expect(usersService.updateUserRole).toHaveBeenCalledWith('1', 'admin', '1');
    });

    it('should reject request with missing role', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .put('/api/users/1/role')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        message: 'Role is required',
      });
    });
  });

  describe('POST /api/users/:id/reset-password', () => {
    it('should reset user password', async () => {
      const mockResult = {
        message: 'Password reset successfully',
        temporaryPassword: 'new-temp-password',
      };

      vi.mocked(usersService.resetUserPassword).mockResolvedValue(mockResult as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/users/1/reset-password')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(usersService.resetUserPassword).toHaveBeenCalledWith('1');
    });

    it('should handle password reset errors', async () => {
      vi.mocked(usersService.resetUserPassword).mockRejectedValue(
        new Error('User not found')
      );

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/users/999/reset-password')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'User not found',
      });
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user', async () => {
      vi.mocked(usersService.deleteUser).mockReturnValue({ message: 'User deleted' });

      const token = createAuthToken();
      await request(app)
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(usersService.deleteUser).toHaveBeenCalledWith('1', '1');
    });

    it('should handle deletion errors', async () => {
      vi.mocked(usersService.deleteUser).mockImplementation(() => {
        throw new Error('Cannot delete last superuser');
      });

      const token = createAuthToken();
      const response = await request(app)
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Cannot delete last superuser',
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });
});
