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

// Mock dependencies
vi.mock('../services/custom-fields.service.js', () => ({
  getFieldDefinitions: vi.fn(),
  createFieldDefinition: vi.fn(),
  updateFieldDefinition: vi.fn(),
  deleteFieldDefinition: vi.fn(),
  reorderFieldDefinitions: vi.fn(),
}));

vi.mock('../services/socket-events.service.js', () => ({
  emitCustomFieldCreated: vi.fn(),
  emitCustomFieldUpdated: vi.fn(),
  emitCustomFieldDeleted: vi.fn(),
  emitCustomFieldsReordered: vi.fn(),
}));

// Mock Auth Middleware
vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    next();
  },
}));

vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      run: vi.fn(),
      all: vi.fn(),
    })),
  },
}));

import db from '../db.js';
import {
  getFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
  reorderFieldDefinitions,
} from '../services/custom-fields.service.js';
import customFieldRoutes from './custom-fields.js';

const app = express();
app.use(express.json());
app.use('/api', customFieldRoutes);

describe('Custom Fields Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/organizations/:orgId/custom-fields', () => {
    it('should return field definitions', async () => {
      const mockFields = [{ id: 'f1', name: 'Field 1' }];
      vi.mocked(getFieldDefinitions).mockResolvedValue(mockFields as any);

      const res = await request(app)
        .get('/api/organizations/org-1/custom-fields?entityType=person')
        .expect(200);

      expect(res.body).toEqual(mockFields);
      expect(getFieldDefinitions).toHaveBeenCalledWith('org-1', 'person', 'user-123');
    });

    it('should default to "all" if type is missing or invalid', async () => {
      vi.mocked(getFieldDefinitions).mockResolvedValue([]);

      await request(app).get('/api/organizations/org-1/custom-fields'); // No query param
      expect(getFieldDefinitions).toHaveBeenCalledWith('org-1', 'all', 'user-123');

      await request(app).get('/api/organizations/org-1/custom-fields?entityType=invalid');
      expect(getFieldDefinitions).toHaveBeenCalledWith('org-1', 'all', 'user-123');
    });
  });

  describe('POST /api/organizations/:orgId/custom-fields', () => {
    it('should create field definition', async () => {
      const fieldData = {
        entity_type: 'person',
        name: 'New Field',
        field_type: 'text',
        options: null,
      };
      const createdField = { id: 'f1', ...fieldData };
      vi.mocked(createFieldDefinition).mockResolvedValue(createdField as any);

      const res = await request(app)
        .post('/api/organizations/org-1/custom-fields')
        .send(fieldData)
        .expect(201);

      expect(res.body).toEqual(createdField);
      expect(createFieldDefinition).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining(fieldData),
        'user-123'
      );
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/organizations/org-1/custom-fields')
        .send({ name: 'Only Name' })
        .expect(400);
    });
  });

  describe('PUT /api/organizations/:orgId/custom-fields/:fieldId', () => {
    it('should update field definition', async () => {
      const updateData = { name: 'Updated Name', options: ['A', 'B'] };
      const updatedField = { id: 'f1', organization_id: 'org-1', ...updateData };
      vi.mocked(updateFieldDefinition).mockResolvedValue(updatedField as any);

      const res = await request(app)
        .put('/api/organizations/org-1/custom-fields/f1')
        .send(updateData)
        .expect(200);

      expect(res.body).toEqual(updatedField);
      expect(updateFieldDefinition).toHaveBeenCalledWith(
        'f1',
        expect.objectContaining(updateData),
        'user-123'
      );
    });
  });

  describe('DELETE /api/organizations/:orgId/custom-fields/:fieldId', () => {
    it('should delete field definition', async () => {
      // Mock DB fetch before delete
      vi.mocked(db.prepare).mockReturnValue({
        get: vi
          .fn()
          .mockReturnValue({ organization_id: 'org-1', entity_type: 'person', name: 'Field 1' }),
      } as any);

      vi.mocked(deleteFieldDefinition).mockResolvedValue(undefined);

      await request(app).delete('/api/organizations/org-1/custom-fields/f1').expect(204);

      expect(deleteFieldDefinition).toHaveBeenCalledWith('f1', 'user-123');
    });
  });

  describe('PUT /api/organizations/:orgId/custom-fields/reorder', () => {
    it('should reorder fields', async () => {
      vi.mocked(reorderFieldDefinitions).mockResolvedValue(undefined);

      await request(app)
        .put('/api/organizations/org-1/custom-fields/reorder')
        .send({ entity_type: 'person', orderedIds: ['f2', 'f1'] })
        .expect(200);

      expect(reorderFieldDefinitions).toHaveBeenCalledWith(
        'org-1',
        'person',
        ['f2', 'f1'],
        'user-123'
      );
    });

    it('should validate reorder data', async () => {
      await request(app)
        .put('/api/organizations/org-1/custom-fields/reorder')
        .send({ entity_type: 'person' }) // Missing orderedIds
        .expect(400);
    });
  });
});
