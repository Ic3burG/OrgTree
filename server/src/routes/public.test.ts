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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import publicRouter from './public.js';
import * as invitationService from '../services/invitation.service.js';

// Mock dependencies
vi.mock('../services/invitation.service.js');
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn(),
    })),
  },
}));

// Mock express-rate-limit to avoid rate limiting in tests
vi.mock('express-rate-limit', () => ({
  default: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}));

describe('Public Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api/public', publicRouter);

    // Setup error handler
    app.use(
      (_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ message: _err.message });
      }
    );
  });

  describe('GET /api/public/org/:shareToken', () => {
    it.skip('should return public organization data', async () => {
      const mockOrg = {
        id: 'org1',
        name: 'Public Org',
        created_at: '2024-01-01',
      };

      const mockDepartments = [
        {
          id: 'dept1',
          organization_id: 'org1',
          parent_id: null,
          name: 'Engineering',
          description: 'Engineering team',
          sort_order: 0,
        },
      ];

      const mockPeople = [
        {
          id: 'person1',
          department_id: 'dept1',
          name: 'John Doe',
          title: 'Engineer',
          email: 'john@example.com',
          phone: '123-456-7890',
          sort_order: 0,
        },
      ];

      const dbMock = await import('../db.js');
      const getMock = vi.fn();
      const allMock = vi.fn();

      getMock.mockReturnValueOnce(mockOrg);
      allMock.mockReturnValueOnce(mockDepartments).mockReturnValueOnce(mockPeople);

      vi.mocked(dbMock.default.prepare).mockReturnValue({
        get: getMock,
        all: allMock,
      } as any);

      const response = await request(app).get('/api/public/org/valid-share-token').expect(200);

      expect(response.body).toEqual({
        id: 'org1',
        name: 'Public Org',
        createdAt: '2024-01-01',
        departments: [
          {
            id: 'dept1',
            organizationId: 'org1',
            parentId: null,
            name: 'Engineering',
            description: 'Engineering team',
            sortOrder: 0,
            people: [
              {
                id: 'person1',
                departmentId: 'dept1',
                name: 'John Doe',
                title: 'Engineer',
                email: 'john@example.com',
                phone: '123-456-7890',
                sortOrder: 0,
              },
            ],
          },
        ],
      });
    });

    it('should return 404 for invalid share token', async () => {
      const dbMock = await import('../db.js');
      vi.mocked(dbMock.default.prepare).mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const response = await request(app).get('/api/public/org/invalid-token').expect(404);

      expect(response.body).toEqual({
        message: 'Organization not found or not public',
      });
    });

    it('should handle organizations with no departments', async () => {
      const mockOrg = {
        id: 'org1',
        name: 'Empty Org',
        created_at: '2024-01-01',
      };

      const dbMock = await import('../db.js');
      const getMock = vi.fn().mockReturnValue(mockOrg);
      const allMock = vi.fn().mockReturnValue([]);

      vi.mocked(dbMock.default.prepare).mockReturnValue({
        get: getMock,
        all: allMock,
      } as any);

      const response = await request(app).get('/api/public/org/valid-token').expect(200);

      expect(response.body.departments).toEqual([]);
    });
  });

  describe('GET /api/public/invitation/:token', () => {
    it('should return invitation details', async () => {
      const mockInvitation = {
        id: '1',
        token: 'invite-token',
        email: 'user@example.com',
        role: 'editor',
        organizationName: 'Test Org',
        invitedBy: 'Admin',
      };

      vi.mocked(invitationService.getInvitationByToken).mockReturnValue(mockInvitation as any);

      const response = await request(app).get('/api/public/invitation/invite-token').expect(200);

      expect(response.body).toEqual(mockInvitation);
      expect(invitationService.getInvitationByToken).toHaveBeenCalledWith('invite-token');
    });

    it('should return 404 for invalid invitation token', async () => {
      vi.mocked(invitationService.getInvitationByToken).mockReturnValue(null);

      const response = await request(app).get('/api/public/invitation/invalid-token').expect(404);

      expect(response.body).toEqual({
        message: 'Invitation not found',
      });
    });
  });
});
