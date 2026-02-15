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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import membersRouter from './members.js';
import * as memberService from '../services/member.service.js';
import * as socketEvents from '../services/socket-events.service.js';

// Mock dependencies
vi.mock('../services/member.service.js');
vi.mock('../services/socket-events.service.js');
vi.mock('../services/audit.service.js', () => ({
  createAuditLog: vi.fn(),
}));
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      run: vi.fn(),
    })),
  },
}));

describe('Members Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', membersRouter);

    // Setup error handler
    app.use(
      (_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ message: _err.message });
      }
    );
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const createAuthToken = (userId = '1', role: 'user' | 'admin' | 'superuser' = 'user') => {
    return jwt.sign(
      { id: userId, email: 'test@example.com', name: 'Test User', role },
      'test-secret-key',
      { expiresIn: '1h' }
    );
  };

  describe('GET /api/organizations/:orgId/members', () => {
    it('should return all members of an organization', async () => {
      const mockMembers = [
        {
          id: '1',
          userId: 'user1',
          userName: 'Alice',
          userEmail: 'alice@example.com',
          role: 'admin',
        },
        { id: '2', userId: 'user2', userName: 'Bob', userEmail: 'bob@example.com', role: 'editor' },
      ];

      const mockOwner = {
        created_by_id: 'owner1',
        name: 'Owner User',
        email: 'owner@example.com',
      };

      vi.mocked(memberService.requireOrgPermission).mockReturnValue({ allowed: true } as any);
      vi.mocked(memberService.getOrgMembers).mockReturnValue(mockMembers as any);

      const dbMock = await import('../db.js');
      vi.mocked(dbMock.default.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue(mockOwner),
      } as any);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/organizations/org1/members')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        owner: {
          id: expect.any(String),
          joined_at: expect.any(String),
          organization_id: 'org1',
          user_id: 'owner1',
          role: 'owner',
          userName: 'Owner User',
          userEmail: 'owner@example.com',
          user: {
            id: 'owner1',
            name: 'Owner User',
            email: 'owner@example.com',
          },
        },
        members: mockMembers,
      });
      expect(memberService.requireOrgPermission).toHaveBeenCalledWith('org1', '1', 'admin');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/organizations/org1/members').expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });

  describe('POST /api/organizations/:orgId/members', () => {
    it('should add a new member', async () => {
      const mockMember = {
        id: '1',
        userId: 'user1',
        userName: 'Alice',
        userEmail: 'alice@example.com',
        role: 'editor',
      };

      vi.mocked(memberService.addOrgMember).mockReturnValue(mockMember as any);
      vi.mocked(socketEvents.emitMemberAdded).mockReturnValue(undefined);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: 'user1',
          role: 'editor',
        })
        .expect(201);

      expect(response.body).toEqual(mockMember);
      expect(memberService.addOrgMember).toHaveBeenCalledWith('org1', 'user1', 'editor', '1');
      expect(socketEvents.emitMemberAdded).toHaveBeenCalled();
    });

    it('should reject request with missing userId', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'editor',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'userId and role are required',
      });
    });

    it('should reject request with missing role', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: 'user1',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'userId and role are required',
      });
    });

    it('should reject request with invalid role', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: 'user1',
          role: 'invalid',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Invalid role. Must be: viewer, editor, or admin',
      });
    });
  });

  describe('PUT /api/organizations/:orgId/members/:memberId', () => {
    it('should update member role', async () => {
      const mockMember = {
        id: '1',
        userId: 'user1',
        userName: 'Alice',
        role: 'admin',
      };

      vi.mocked(memberService.updateMemberRole).mockReturnValue(mockMember as any);
      vi.mocked(socketEvents.emitMemberUpdated).mockReturnValue(undefined);

      const token = createAuthToken();
      const response = await request(app)
        .put('/api/organizations/org1/members/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'admin',
        })
        .expect(200);

      expect(response.body).toEqual(mockMember);
      expect(memberService.updateMemberRole).toHaveBeenCalledWith('org1', '1', 'admin', '1');
      expect(socketEvents.emitMemberUpdated).toHaveBeenCalled();
    });

    it('should reject update with missing role', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .put('/api/organizations/org1/members/1')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        message: 'role is required',
      });
    });

    it('should reject update with invalid role', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .put('/api/organizations/org1/members/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'superadmin',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Invalid role. Must be: viewer, editor, or admin',
      });
    });
  });

  describe('DELETE /api/organizations/:orgId/members/:memberId', () => {
    it('should remove a member', async () => {
      const mockMember = {
        id: '1',
        userId: 'user1',
        role: 'editor',
        userName: 'Alice',
        email: 'alice@example.com',
      };

      const dbMock = await import('../db.js');
      vi.mocked(dbMock.default.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue(mockMember),
      } as any);

      vi.mocked(memberService.removeOrgMember).mockResolvedValue(undefined as any);
      vi.mocked(socketEvents.emitMemberRemoved).mockReturnValue(undefined);

      const token = createAuthToken();
      await request(app)
        .delete('/api/organizations/org1/members/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(memberService.removeOrgMember).toHaveBeenCalledWith('org1', '1', '1');
      expect(socketEvents.emitMemberRemoved).toHaveBeenCalled();
    });

    it('should handle removal errors', async () => {
      vi.mocked(memberService.removeOrgMember).mockRejectedValue(
        new Error('Cannot remove last admin')
      );

      const token = createAuthToken();
      const response = await request(app)
        .delete('/api/organizations/org1/members/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Cannot remove last admin',
      });
    });
  });

  describe('POST /api/organizations/:orgId/members/by-email', () => {
    it('should add member by email successfully', async () => {
      const mockResult = {
        success: true,
        member: {
          id: '1',
          userId: 'user1',
          userName: 'Alice',
          userEmail: 'alice@example.com',
          role: 'editor',
        },
      };

      vi.mocked(memberService.addMemberByEmail).mockReturnValue(mockResult as any);
      vi.mocked(socketEvents.emitMemberAdded).mockReturnValue(undefined);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/members/by-email')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'alice@example.com',
          role: 'editor',
        })
        .expect(201);

      expect(response.body).toEqual(mockResult);
      expect(memberService.addMemberByEmail).toHaveBeenCalledWith(
        'org1',
        'alice@example.com',
        'editor',
        '1'
      );
      expect(socketEvents.emitMemberAdded).toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      const mockResult = {
        success: false,
        error: 'user_not_found',
      };

      vi.mocked(memberService.addMemberByEmail).mockReturnValue(mockResult as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/members/by-email')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'nonexistent@example.com',
          role: 'editor',
        })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(socketEvents.emitMemberAdded).not.toHaveBeenCalled();
    });

    it('should reject request with missing email', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/members/by-email')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'editor',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email is required',
      });
    });

    it('should reject request with missing role', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/members/by-email')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'alice@example.com',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Role is required',
      });
    });

    it('should reject request with invalid role', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/members/by-email')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'alice@example.com',
          role: 'owner',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Invalid role. Must be: viewer, editor, or admin',
      });
    });
  });
});
