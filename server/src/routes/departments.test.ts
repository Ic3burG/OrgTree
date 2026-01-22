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
          parentId: undefined,
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
          parentId: undefined,
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
