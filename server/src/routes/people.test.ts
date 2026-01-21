import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../services/people.service.js');
vi.mock('../services/socket-events.service.js');

// Mock DB for audit/event logic
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

import peopleRouter from './people.js';
import * as peopleService from '../services/people.service.js';
import db from '../db.js';

describe('People Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;
  const testOrgId = 'org-1';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    app = express();
    app.use(express.json());
    app.use('/api', peopleRouter);

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

  describe('GET /api/departments/:deptId/people', () => {
    it('should return people in department', async () => {
      const mockPeople = [{ id: '1', name: 'Person 1' }];
      vi.mocked(peopleService.getPeopleByDepartment).mockResolvedValue(mockPeople as any);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/departments/dept-1/people')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockPeople);
      expect(peopleService.getPeopleByDepartment).toHaveBeenCalledWith('dept-1', 'user-1');
    });
  });

  describe('POST /api/departments/:deptId/people', () => {
    it('should create person', async () => {
      const newPerson = { id: '2', name: 'New Person' };
      vi.mocked(peopleService.createPerson).mockResolvedValue(newPerson as any);

      // Mock DB get for event emitting
      const getMock = vi.fn().mockReturnValue({ organization_id: testOrgId });
      vi.mocked(db.prepare).mockReturnValue({ get: getMock } as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/departments/dept-1/people')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Person',
          title: 'Dev',
          email: 'dev@example.com',
          is_starred: true,
        })
        .expect(201);

      expect(response.body).toEqual(newPerson);
      expect(peopleService.createPerson).toHaveBeenCalledWith(
        'dept-1',
        {
          name: 'New Person',
          title: 'Dev',
          email: 'dev@example.com',
          phone: undefined,
          isStarred: true,
          customFields: undefined,
        },
        'user-1'
      );
    });

    it('should require name', async () => {
      const token = createAuthToken();
      await request(app)
        .post('/api/departments/dept-1/people')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'No Name' })
        .expect(400);
    });
  });

  describe('GET /api/people/:personId', () => {
    it('should get person by ID', async () => {
      const mockPerson = { id: '1', name: 'Person 1' };
      vi.mocked(peopleService.getPersonById).mockResolvedValue(mockPerson as any);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/people/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockPerson);
    });
  });

  describe('PUT /api/people/:personId', () => {
    it('should update person', async () => {
      const updatedPerson = { id: '1', name: 'Updated Person', department_id: 'dept-1' };
      vi.mocked(peopleService.updatePerson).mockResolvedValue(updatedPerson as any);

      // Mock DB get for event emitting
      const getMock = vi.fn().mockReturnValue({ organization_id: testOrgId });
      vi.mocked(db.prepare).mockReturnValue({ get: getMock } as any);

      const token = createAuthToken();
      const response = await request(app)
        .put('/api/people/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Person', is_starred: false })
        .expect(200);

      expect(response.body).toEqual(updatedPerson);
      expect(peopleService.updatePerson).toHaveBeenCalledWith(
        '1',
        {
          name: 'Updated Person',
          title: undefined,
          email: undefined,
          phone: undefined,
          departmentId: undefined,
          isStarred: false,
          customFields: undefined,
        },
        'user-1'
      );
    });
  });

  describe('DELETE /api/people/:personId', () => {
    it('should delete person', async () => {
      // Mock DB get for audit trail/events
      const mockPerson = {
        id: '1',
        name: 'To Delete',
        departmentId: 'dept-1',
        organization_id: testOrgId,
      };
      const getMock = vi.fn().mockReturnValue(mockPerson);
      vi.mocked(db.prepare).mockReturnValue({ get: getMock } as any);

      vi.mocked(peopleService.deletePerson).mockResolvedValue(undefined);

      const token = createAuthToken();
      await request(app)
        .delete('/api/people/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(peopleService.deletePerson).toHaveBeenCalledWith('1', 'user-1');
    });
  });

  describe('PUT /api/people/:personId/move', () => {
    it('should move person to another department', async () => {
      const movedPerson = { id: '1', department_id: 'dept-2' };
      vi.mocked(peopleService.movePerson).mockResolvedValue(movedPerson as any);

      // Mock DB get for event emitting
      const getMock = vi.fn().mockReturnValue({ organization_id: testOrgId });
      vi.mocked(db.prepare).mockReturnValue({ get: getMock } as any);

      const token = createAuthToken();
      const response = await request(app)
        .put('/api/people/1/move')
        .set('Authorization', `Bearer ${token}`)
        .send({ departmentId: 'dept-2' })
        .expect(200);

      expect(response.body).toEqual(movedPerson);
      expect(peopleService.movePerson).toHaveBeenCalledWith('1', 'dept-2', 'user-1');
    });

    it('should require departmentId', async () => {
      const token = createAuthToken();
      await request(app)
        .put('/api/people/1/move')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });
  });
});
