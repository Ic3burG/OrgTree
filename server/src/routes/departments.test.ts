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
// Mock dependencies before importing routes
vi.mock('../services/department.service.js');
vi.mock('../services/socket-events.service.js');
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

import departmentsRouter from './departments.js';
import * as departmentService from '../services/department.service.js';
import db from '../db.js';

describe('Departments Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;
  const testOrgId = 'org-1';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    app = express();
    app.use(express.json());
    app.use('/api', departmentsRouter);

    // Error handler
    app.use(
      (_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ message: _err.message });
      }
    );
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const createAuthToken = (userId = 'user-1', role = 'viewer') => {
    return jwt.sign(
      { id: userId, email: 'user@example.com', name: 'Test User', role },
      'test-secret-key',
      { expiresIn: '1h' }
    );
  };

  describe('GET /api/organizations/:orgId/departments', () => {
    it('should return list of departments', async () => {
      const mockDepts = [
        { id: '1', name: 'Dept A' },
        { id: '2', name: 'Dept B' },
      ];
      vi.mocked(departmentService.getDepartments).mockResolvedValue(mockDepts as any);

      const token = createAuthToken();
      const response = await request(app)
        .get(`/api/organizations/${testOrgId}/departments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockDepts);
      expect(departmentService.getDepartments).toHaveBeenCalledWith(testOrgId, 'user-1');
    });
  });

  describe('GET /api/organizations/:orgId/departments/:deptId', () => {
    it('should return department by ID', async () => {
      const mockDept = { id: '1', name: 'Dept A' };
      vi.mocked(departmentService.getDepartmentById).mockResolvedValue(mockDept as any);

      const token = createAuthToken();
      const response = await request(app)
        .get(`/api/organizations/${testOrgId}/departments/1`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockDept);
      expect(departmentService.getDepartmentById).toHaveBeenCalledWith(testOrgId, '1', 'user-1');
    });
  });

  describe('POST /api/organizations/:orgId/departments', () => {
    it('should create a department', async () => {
      const newDept = { id: '3', name: 'New Dept' };
      vi.mocked(departmentService.createDepartment).mockResolvedValue(newDept as any);

      const token = createAuthToken();
      const response = await request(app)
        .post(`/api/organizations/${testOrgId}/departments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Dept', description: 'Desc' })
        .expect(201);

      expect(response.body).toEqual(newDept);
      expect(departmentService.createDepartment).toHaveBeenCalledWith(
        testOrgId,
        {
          name: 'New Dept',
          description: 'Desc',
          parentId: null,
          customFields: undefined,
        },
        'user-1'
      );
    });

    it('should require name', async () => {
      const token = createAuthToken();
      await request(app)
        .post(`/api/organizations/${testOrgId}/departments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No Name' })
        .expect(400);
    });
  });

  describe('PUT /api/organizations/:orgId/departments/:deptId', () => {
    it('should update department', async () => {
      const updatedDept = { id: '1', name: 'Updated Dept' };
      vi.mocked(departmentService.updateDepartment).mockResolvedValue(updatedDept as any);

      const token = createAuthToken();
      const response = await request(app)
        .put(`/api/organizations/${testOrgId}/departments/1`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Dept' })
        .expect(200);

      expect(response.body).toEqual(updatedDept);
      expect(departmentService.updateDepartment).toHaveBeenCalledWith(
        testOrgId,
        '1',
        {
          name: 'Updated Dept',
          description: undefined,
          parentId: null,
          customFields: undefined,
        },
        'user-1'
      );
    });

    it('should prevent empty name update', async () => {
      const token = createAuthToken();
      await request(app)
        .put(`/api/organizations/${testOrgId}/departments/1`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('DELETE /api/organizations/:orgId/departments/:deptId', () => {
    it('should delete department', async () => {
      // Mock DB get for audit trail
      const mockDept = { id: '1', name: 'To Delete', organization_id: testOrgId };
      const getMock = vi.fn().mockReturnValue(mockDept);
      vi.mocked(db.prepare).mockReturnValue({ get: getMock } as any);

      vi.mocked(departmentService.deleteDepartment).mockResolvedValue({ success: true });

      const token = createAuthToken();
      await request(app)
        .delete(`/api/organizations/${testOrgId}/departments/1`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(departmentService.deleteDepartment).toHaveBeenCalledWith(testOrgId, '1', 'user-1');
    });
  });
});
