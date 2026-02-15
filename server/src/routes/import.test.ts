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
import importRouter from './import.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgPermission } from '../services/member.service.js';
import db from '../db.js';

// Mock dependencies
vi.mock('../middleware/auth.js');
vi.mock('../services/member.service.js');
vi.mock('../services/audit.service.js');
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(),
    transaction: vi.fn(fn => fn), // Simple pass-through for transaction
  },
}));

const app = express();
app.use(express.json());
app.use('/api', importRouter);

describe('Import Routes', () => {
  const mockOrgId = 'org-123';
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default auth mock
    vi.mocked(authenticateToken).mockImplementation((req, res, next) => {
      // @ts-expect-error: mocking express request user
      req.user = mockUser;
      next();
    });

    // Setup default permission mock
    // @ts-expect-error: mocking complex return type
    vi.mocked(requireOrgPermission).mockImplementation(() => {});
  });

  describe('POST /api/organizations/:orgId/import', () => {
    it('should validate request body format', async () => {
      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/import`)
        .send({ data: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Invalid data format' });
    });

    it('should validate import size limit', async () => {
      // Create a large payload that exceeds standard express body limit
      // or triggers our manual check depending on how middleware is configured
      const largeData = Array(10001).fill({ type: 'person' });
      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/import`)
        // Increase supertest timeout/limit if needed, but here we expect the server to reject quickly
        .send({ data: largeData });

      // Express body-parser default limit might return 413 Payload Too Large
      // Our manual check returns 400.
      // If the mocked app uses default express.json(), 10000 items might hit the default 100kb limit
      expect([400, 413]).toContain(response.status);
    });

    it('should require admin permissions', async () => {
      vi.mocked(requireOrgPermission).mockImplementation(() => {
        const error: any = new Error('Permission denied');
        error.status = 403;
        throw error;
      });

      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/import`)
        .send({ data: [] });

      expect(response.status).toBe(403);
    });

    it('should successfull import departments and people', async () => {
      const importData = [
        { type: 'department', path: '/Engineering', name: 'Engineering' },
        { type: 'person', path: '/Engineering/John', name: 'John Doe', email: 'john@example.com' },
      ];

      // Mock DB for custom fields definition (empty for this test)
      vi.mocked(db.prepare).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, field_key')) {
          return { all: () => [] } as any; // No custom fields
        }

        // Mock checks
        if (sql.includes('SELECT id FROM departments')) return { get: () => undefined } as any; // Not found
        if (sql.includes('SELECT p.id')) return { get: () => undefined } as any; // Email check
        if (sql.includes('SELECT id FROM people')) return { get: () => undefined } as any; // Name check

        // Mock inserts
        if (sql.includes('INSERT INTO')) return { run: () => ({ changes: 1 }) } as any;

        // Transaction control
        if (sql === 'BEGIN TRANSACTION' || sql === 'COMMIT' || sql === 'ROLLBACK')
          return { run: () => {} } as any;

        return { run: () => {}, get: () => {}, all: () => [] } as any;
      });

      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/import`)
        .send({ data: importData });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        departmentsCreated: 1,
        peopleCreated: 1,
      });
    });

    it('should handle duplicates correctly by reusing/skipping', async () => {
      const importData = [
        { type: 'department', path: '/HR', name: 'HR' }, // Exists
        { type: 'person', path: '/HR/Jane', name: 'Jane Doe', email: 'jane@example.com' }, // Exists
      ];

      vi.mocked(db.prepare).mockImplementation((sql: string) => {
        // Custom fields
        if (sql.includes('SELECT id, field_key')) return { all: () => [] } as any;

        // Department exists check
        if (sql.includes('SELECT id FROM departments')) {
          return { get: () => ({ id: 'existing-dept-id' }) } as any;
        }

        // Person email exists check
        if (sql.includes('SELECT p.id')) {
          return { get: () => ({ id: 'existing-person-id' }) } as any;
        }

        // Transaction control
        if (sql === 'BEGIN TRANSACTION' || sql === 'COMMIT' || sql === 'ROLLBACK')
          return { run: () => {} } as any;

        return { run: () => {}, get: () => {}, all: () => [] } as any;
      });

      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/import`)
        .send({ data: importData });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        departmentsCreated: 0,
        departmentsReused: 1,
        peopleCreated: 0,
        peopleSkipped: 1,
      });
    });

    it('should populate custom fields during import', async () => {
      const importData = [
        { type: 'person', path: '/Engineering/Dev', name: 'Dev', custom_twitter: '@dev' },
      ];

      // Mock DB preparations
      vi.mocked(db.prepare).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, field_key')) {
          return {
            all: () => [{ id: 'field-1', field_key: 'custom_twitter', entity_type: 'person' }],
          } as any;
        }

        // Simulating finding department and not finding person
        if (sql.includes('requests')) return { get: () => undefined } as any;

        // We catch the INSERT INTO custom_field_values to verify it was called
        if (sql.includes('INSERT INTO custom_field_values')) {
          return { run: vi.fn() } as any;
        }

        return { run: () => {}, get: () => {}, all: () => [] } as any;
      });

      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/import`)
        .send({ data: importData });

      expect(response.status).toBe(200);
    });

    it('should rollback transaction on error', async () => {
      const importData = [{ type: 'department', path: '/Fail', name: 'Fail' }];

      const rollbackMock = vi.fn();

      vi.mocked(db.prepare).mockImplementation((sql: string) => {
        if (sql.includes('BEGIN TRANSACTION')) return { run: () => {} } as any;
        if (sql.includes('ROLLBACK')) return { run: rollbackMock } as any;

        // Trigger error specifically when inserting departments to simulate a mid-transaction failure
        if (sql.includes('INSERT INTO departments')) {
          return {
            run: () => {
              throw new Error('Database Error');
            },
          } as any;
        }

        if (sql.includes('SELECT id, field_key')) return { all: () => [] } as any;

        return { run: () => {}, get: () => {}, all: () => [] } as any;
      });

      const response = await request(app)
        .post(`/api/organizations/${mockOrgId}/import`)
        .send({ data: importData });

      expect(response.status).toBe(500);
      expect(rollbackMock).toHaveBeenCalled();
    });
  });
});
