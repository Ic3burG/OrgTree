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
import request from 'supertest';
import express from 'express';
import bulkRouter from './bulk.js';
import { authenticateToken } from '../middleware/auth.js';
import * as bulkService from '../services/bulk.service.js';

// Mock dependencies
vi.mock('../middleware/auth.js');
vi.mock('../services/bulk.service.js');

const app = express();
app.use(express.json());
app.use('/api', bulkRouter);

describe('Bulk Routes', () => {
  const mockOrgId = 'org-123';
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default auth mock
    vi.mocked(authenticateToken).mockImplementation((req, _res, next) => {
      // @ts-expect-error: mocking express request user
      req.user = mockUser;
      next();
    });
  });

  describe('POST /api/organizations/:orgId/people/bulk-delete', () => {
    it('should call bulkDeletePeople service', async () => {
      vi.mocked(bulkService.bulkDeletePeople).mockReturnValue({ success: true, count: 2 } as any);

      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/people/bulk-delete`)
        .send({ personIds: ['p1', 'p2'] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, count: 2 });
      expect(bulkService.bulkDeletePeople).toHaveBeenCalledWith(mockOrgId, ['p1', 'p2'], mockUser);
    });

    it('should validate personIds array', async () => {
      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/people/bulk-delete`)
        .send({ personIds: [] }); // Empty array

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('array cannot be empty');
    });
  });

  describe('POST /api/organizations/:orgId/people/bulk-move', () => {
    it('should call bulkMovePeople service', async () => {
      vi.mocked(bulkService.bulkMovePeople).mockReturnValue({ success: true, moved: 2 } as any);

      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/people/bulk-move`)
        .send({ personIds: ['p1', 'p2'], targetDepartmentId: 'dept-2' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, moved: 2 });
      expect(bulkService.bulkMovePeople).toHaveBeenCalledWith(
        mockOrgId,
        ['p1', 'p2'],
        'dept-2',
        mockUser
      );
    });

    it('should require targetDepartmentId', async () => {
      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/people/bulk-move`)
        .send({ personIds: ['p1'] }); // Missing targetDepartmentId

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('targetDepartmentId is required');
    });
  });

  describe('PUT /api/organizations/:orgId/people/bulk-edit', () => {
    it('should call bulkEditPeople service with sanitized updates', async () => {
      vi.mocked(bulkService.bulkEditPeople).mockResolvedValue({ success: true, updated: 2 } as any);

      const updates = {
        title: 'New Title',
        invalidField: 'Should be ignored',
      };

      const response = await request(app)
        .put(`/api/organizations/${mockOrgId}/people/bulk-edit`)
        .send({ personIds: ['p1', 'p2'], updates });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, updated: 2 });

      expect(bulkService.bulkEditPeople).toHaveBeenCalledWith(
        mockOrgId,
        ['p1', 'p2'],
        { title: 'New Title' }, // Only allowed fields
        mockUser
      );
    });

    it('should reject if no valid updates provided', async () => {
      const response = await request(app)
        .put(`/api/organizations/${mockOrgId}/people/bulk-edit`)
        .send({
          personIds: ['p1'],
          updates: { invalidField: 'value' },
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No valid update fields provided');
    });
  });

  describe('POST /api/organizations/:orgId/departments/bulk-delete', () => {
    it('should call bulkDeleteDepartments service', async () => {
      vi.mocked(bulkService.bulkDeleteDepartments).mockReturnValue({
        success: true,
        count: 1,
      } as any);

      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/departments/bulk-delete`)
        .send({ departmentIds: ['d1'] });

      expect(response.status).toBe(200);
      expect(bulkService.bulkDeleteDepartments).toHaveBeenCalledWith(mockOrgId, ['d1'], mockUser);
    });
  });

  describe('PUT /api/organizations/:orgId/departments/bulk-edit', () => {
    it('should call bulkEditDepartments service', async () => {
      vi.mocked(bulkService.bulkEditDepartments).mockReturnValue({
        success: true,
        updated: 1,
      } as any);

      const response = await request(app)
        .put(`/api/organizations/${mockOrgId}/departments/bulk-edit`)
        .send({
          departmentIds: ['d1'],
          updates: { description: 'Updated' },
        });

      expect(response.status).toBe(200);
      expect(bulkService.bulkEditDepartments).toHaveBeenCalledWith(
        mockOrgId,
        ['d1'],
        { description: 'Updated' },
        mockUser
      );
    });
  });
});
