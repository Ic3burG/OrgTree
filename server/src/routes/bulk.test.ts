import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bulkRouter from './bulk.js';
import * as bulkService from '../services/bulk.service.js';

// Mock dependencies
vi.mock('../services/bulk.service.js');

describe('Bulk Operations Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', bulkRouter);

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

  const createAuthToken = (userId = '1', role: 'user' | 'admin' | 'superuser' = 'user') => {
    return jwt.sign(
      { id: userId, email: 'test@example.com', name: 'Test User', role },
      'test-secret-key',
      { expiresIn: '1h' }
    );
  };

  describe('POST /api/organizations/:orgId/people/bulk-delete', () => {
    it('should delete multiple people', async () => {
      const mockResult = {
        success: true,
        deletedCount: 3,
        deletedIds: ['person1', 'person2', 'person3'],
      };

      vi.mocked(bulkService.bulkDeletePeople).mockReturnValue(mockResult as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/people/bulk-delete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          personIds: ['person1', 'person2', 'person3'],
        })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(bulkService.bulkDeletePeople).toHaveBeenCalledWith(
        'org1',
        ['person1', 'person2', 'person3'],
        expect.objectContaining({ id: '1' })
      );
    });

    it('should reject request with missing personIds', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/people/bulk-delete')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('personIds array is required');
    });

    it('should reject request with empty personIds array', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/people/bulk-delete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          personIds: [],
        })
        .expect(400);

      expect(response.body.message).toContain('personIds array cannot be empty');
    });

    it('should reject request exceeding maximum bulk size', async () => {
      const token = createAuthToken();
      const largeArray = Array(101).fill('person');
      
      const response = await request(app)
        .post('/api/organizations/org1/people/bulk-delete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          personIds: largeArray,
        })
        .expect(400);

      expect(response.body.message).toContain('exceeds maximum limit');
    });
  });

  describe('POST /api/organizations/:orgId/people/bulk-move', () => {
    it('should move multiple people to a department', async () => {
      const mockResult = {
        success: true,
        movedCount: 2,
        movedIds: ['person1', 'person2'],
      };

      vi.mocked(bulkService.bulkMovePeople).mockReturnValue(mockResult as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/people/bulk-move')
        .set('Authorization', `Bearer ${token}`)
        .send({
          personIds: ['person1', 'person2'],
          targetDepartmentId: 'dept1',
        })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(bulkService.bulkMovePeople).toHaveBeenCalledWith(
        'org1',
        ['person1', 'person2'],
        'dept1',
        expect.objectContaining({ id: '1' })
      );
    });

    it('should reject request with missing targetDepartmentId', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/people/bulk-move')
        .set('Authorization', `Bearer ${token}`)
        .send({
          personIds: ['person1'],
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'targetDepartmentId is required',
      });
    });
  });

  describe('PUT /api/organizations/:orgId/people/bulk-edit', () => {
    it('should edit multiple people', async () => {
      const mockResult = {
        success: true,
        updatedCount: 2,
        updatedIds: ['person1', 'person2'],
      };

      vi.mocked(bulkService.bulkEditPeople).mockReturnValue(mockResult as any);

      const token = createAuthToken();
      const response = await request(app)
        .put('/api/organizations/org1/people/bulk-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          personIds: ['person1', 'person2'],
          updates: {
            title: 'Senior Engineer',
          },
        })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(bulkService.bulkEditPeople).toHaveBeenCalledWith(
        'org1',
        ['person1', 'person2'],
        { title: 'Senior Engineer' },
        expect.objectContaining({ id: '1' })
      );
    });

    it('should reject request with missing updates', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .put('/api/organizations/org1/people/bulk-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          personIds: ['person1'],
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'updates object is required',
      });
    });

    it('should filter out disallowed update fields', async () => {
      const mockResult = {
        success: true,
        updatedCount: 1,
      };

      vi.mocked(bulkService.bulkEditPeople).mockReturnValue(mockResult as any);

      const token = createAuthToken();
      await request(app)
        .put('/api/organizations/org1/people/bulk-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          personIds: ['person1'],
          updates: {
            title: 'Engineer',
            name: 'Hacker', // Should be filtered out
            id: 'new-id', // Should be filtered out
          },
        })
        .expect(200);

      // Verify only allowed fields were passed
      expect(bulkService.bulkEditPeople).toHaveBeenCalledWith(
        'org1',
        ['person1'],
        { title: 'Engineer' },
        expect.anything()
      );
    });

    it('should reject request with no valid update fields', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .put('/api/organizations/org1/people/bulk-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          personIds: ['person1'],
          updates: {
            invalidField: 'value',
          },
        })
        .expect(400);

      expect(response.body.message).toContain('No valid update fields provided');
    });
  });

  describe('POST /api/organizations/:orgId/departments/bulk-delete', () => {
    it('should delete multiple departments', async () => {
      const mockResult = {
        success: true,
        deletedCount: 2,
        deletedIds: ['dept1', 'dept2'],
      };

      vi.mocked(bulkService.bulkDeleteDepartments).mockReturnValue(mockResult as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/departments/bulk-delete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          departmentIds: ['dept1', 'dept2'],
        })
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should reject request with invalid departmentIds', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .post('/api/organizations/org1/departments/bulk-delete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          departmentIds: 'not-an-array',
        })
        .expect(400);

      expect(response.body.message).toContain('departmentIds array is required');
    });
  });

  describe('PUT /api/organizations/:orgId/departments/bulk-edit', () => {
    it('should edit multiple departments', async () => {
      const mockResult = {
        success: true,
        updatedCount: 2,
      };

      vi.mocked(bulkService.bulkEditDepartments).mockReturnValue(mockResult as any);

      const token = createAuthToken();
      const response = await request(app)
        .put('/api/organizations/org1/departments/bulk-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          departmentIds: ['dept1', 'dept2'],
          updates: {
            parentId: 'parent-dept',
          },
        })
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should filter out disallowed department fields', async () => {
      const mockResult = { success: true, updatedCount: 1 };
      vi.mocked(bulkService.bulkEditDepartments).mockReturnValue(mockResult as any);

      const token = createAuthToken();
      await request(app)
        .put('/api/organizations/org1/departments/bulk-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          departmentIds: ['dept1'],
          updates: {
            name: 'New Name',
            organizationId: 'hacker', // Should be filtered out
          },
        })
        .expect(200);

      expect(bulkService.bulkEditDepartments).toHaveBeenCalledWith(
        'org1',
        ['dept1'],
        { name: 'New Name' },
        expect.anything()
      );
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/organizations/org1/people/bulk-delete')
        .send({
          personIds: ['person1'],
        })
        .expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });
});
