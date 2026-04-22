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
import backupRouter from './backup.js';
import * as backupService from '../services/backup.service.js';

// Mock dependencies
vi.mock('../services/backup.service.js');
vi.mock('../services/audit.service.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Backup Routes', () => {
  let app: express.Application;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', backupRouter);

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

  const createAuthToken = (userId = '1', role: 'user' | 'admin' | 'superuser' = 'superuser') => {
    return jwt.sign(
      { id: userId, email: 'superuser@example.com', name: 'Super User', role },
      'test-secret-key',
      { expiresIn: '1h' }
    );
  };

  describe('GET /api/admin/backups', () => {
    it('should list all backups', async () => {
      const mockBackups = [
        {
          filename: 'backup-2024-01-01.db',
          path: '/backups/backup-2024-01-01.db',
          size: 10485760,
          sizeMB: 10,
          timestamp: '2024-01-01',
          created: new Date('2024-01-01'),
        },
        {
          filename: 'backup-2024-01-02.db',
          path: '/backups/backup-2024-01-02.db',
          size: 12582912,
          sizeMB: 12,
          timestamp: '2024-01-02',
          created: new Date('2024-01-02'),
        },
      ];
      const mockStats = {
        count: 2,
        totalBackups: 2,
        backupDir: '/backups',
        totalSizeMB: 22,
        oldestBackup: new Date('2024-01-01'),
        newestBackup: new Date('2024-01-02'),
      };

      vi.mocked(backupService.listBackups).mockReturnValue(mockBackups);
      vi.mocked(backupService.getBackupStats).mockReturnValue(mockStats);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/admin/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        backups: mockBackups.map(b => ({ ...b, created: b.created.toISOString() })),
        stats: {
          ...mockStats,
          oldestBackup: mockStats.oldestBackup?.toISOString(),
          newestBackup: mockStats.newestBackup?.toISOString(),
        },
      });
    });

    it('should reject non-superuser requests', async () => {
      const token = createAuthToken('1', 'admin');
      const response = await request(app)
        .get('/api/admin/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({
        message: 'Insufficient permissions',
      });
    });

    it('should handle errors when listing backups', async () => {
      vi.mocked(backupService.listBackups).mockImplementation(() => {
        throw new Error('Failed to read backup directory');
      });

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/admin/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to list backups',
      });
    });
  });

  describe('POST /api/admin/backups', () => {
    it('should create a new backup', async () => {
      const mockBackupResult = {
        success: true,
        path: '/backups/backup-2024-01-01.db',
        sizeMB: 15,
        timestamp: '2024-01-01T10:00:00Z',
      };
      const mockCleanupResult = {
        kept: 7,
        deleted: 3,
        deletedFiles: ['old-backup-1.db', 'old-backup-2.db'],
      };

      vi.mocked(backupService.createBackup).mockResolvedValue(mockBackupResult);
      vi.mocked(backupService.cleanupOldBackups).mockReturnValue(mockCleanupResult);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/admin/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Backup created successfully',
        backup: {
          path: mockBackupResult.path,
          sizeMB: mockBackupResult.sizeMB,
          timestamp: mockBackupResult.timestamp,
          type: 'manual',
        },
        cleanup: {
          kept: 7,
          deleted: 3,
        },
      });
    });

    it('should support BACKUP_API_TOKEN authentication', async () => {
      const mockBackupResult = {
        success: true,
        path: '/backups/pre-migration.db',
        sizeMB: 10,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(backupService.createBackup).mockResolvedValue(mockBackupResult);
      process.env.BACKUP_API_TOKEN = 'test-api-token';

      const response = await request(app)
        .post('/api/admin/backup')
        .set('Authorization', 'Bearer test-api-token')
        .send({ type: 'manual' })
        .expect(200);

      expect(response.body.message).toBe('Backup created successfully');
      expect(response.body.backup.type).toBe('manual');
    });

    it('should handle backup creation failure', async () => {
      vi.mocked(backupService.createBackup).mockResolvedValue({
        success: false,
        error: 'Disk full',
      } as any);

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/admin/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Disk full',
      });
    });

    it('should handle backup service errors', async () => {
      vi.mocked(backupService.createBackup).mockRejectedValue(new Error('Database locked'));

      const token = createAuthToken();
      const response = await request(app)
        .post('/api/admin/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to create backup',
      });
    });

    it('should reject non-superuser requests', async () => {
      const token = createAuthToken('1', 'user');
      const response = await request(app)
        .post('/api/admin/backups')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({
        message: 'Insufficient permissions',
      });
    });
  });

  describe('DELETE /api/admin/backups/cleanup', () => {
    it('should cleanup old backups with default keep count', async () => {
      const mockResult = {
        kept: 7,
        deleted: 5,
        deletedFiles: ['backup-1.db', 'backup-2.db', 'backup-3.db'],
      };

      vi.mocked(backupService.cleanupOldBackups).mockReturnValue(mockResult);

      const token = createAuthToken();
      const response = await request(app)
        .delete('/api/admin/backups/cleanup')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Cleanup completed',
        kept: 7,
        deleted: 5,
        deletedFiles: mockResult.deletedFiles,
      });
      expect(backupService.cleanupOldBackups).toHaveBeenCalledWith(7);
    });

    it('should cleanup with custom keep count', async () => {
      vi.mocked(backupService.cleanupOldBackups).mockReturnValue({
        kept: 10,
        deleted: 2,
        deletedFiles: [],
      });

      const token = createAuthToken();
      await request(app)
        .delete('/api/admin/backups/cleanup?keep=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(backupService.cleanupOldBackups).toHaveBeenCalledWith(10);
    });

    it('should reject invalid keep count (too low)', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .delete('/api/admin/backups/cleanup?keep=0')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toEqual({
        message: 'Keep count must be between 1 and 30',
      });
    });

    it('should reject invalid keep count (too high)', async () => {
      const token = createAuthToken();
      const response = await request(app)
        .delete('/api/admin/backups/cleanup?keep=100')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toEqual({
        message: 'Keep count must be between 1 and 30',
      });
    });

    it('should handle cleanup errors', async () => {
      vi.mocked(backupService.cleanupOldBackups).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const token = createAuthToken();
      const response = await request(app)
        .delete('/api/admin/backups/cleanup')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to cleanup backups',
      });
    });
  });

  describe('GET /api/admin/backups/stats', () => {
    it('should return backup statistics', async () => {
      const mockStats = {
        totalBackups: 10,
        totalSizeMB: 150,
        oldestBackup: new Date('2024-01-01'),
        newestBackup: new Date('2024-01-10'),
        backupDir: '/tmp/backups',
      };

      vi.mocked(backupService.getBackupStats).mockReturnValue(mockStats);

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/admin/backups/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        ...mockStats,
        oldestBackup: mockStats.oldestBackup.toISOString(),
        newestBackup: mockStats.newestBackup.toISOString(),
      });
    });

    it('should handle stats retrieval errors', async () => {
      vi.mocked(backupService.getBackupStats).mockImplementation(() => {
        throw new Error('Stats unavailable');
      });

      const token = createAuthToken();
      const response = await request(app)
        .get('/api/admin/backups/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to get backup stats',
      });
    });
  });

  describe('Authentication', () => {
    it('should reject all requests without authentication', async () => {
      const response = await request(app).get('/api/admin/backups').expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });
});
