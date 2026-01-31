import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import gedsImportRouter from './geds-import.js';
import * as downloadService from '../services/geds-download.service.js';
import * as parserService from '../services/geds-parser.service.js';
import * as _memberService from '../services/member.service.js';
import fs from 'fs/promises';
import db from '../db.js';
import { randomUUID } from 'crypto';

// Mock dependencies
vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-user', name: 'Admin', email: 'admin@example.com' };
    next();
  },
}));

vi.mock('../services/member.service.js', () => ({
  requireOrgPermission: vi.fn(),
}));

vi.mock('../services/audit.service.js', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('../services/geds-download.service.js', () => ({
  downloadGedsXml: vi.fn(),
  cleanupTempFile: vi.fn(),
  InvalidUrlError: class extends Error {},
  DownloadTimeoutError: class extends Error {},
  FileSizeLimitError: class extends Error {},
  NetworkError: class extends Error {},
}));

vi.mock('../services/geds-parser.service.js', () => ({
  parseGedsXml: vi.fn(),
  ParseError: class extends Error {},
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
  readFile: vi.fn(),
}));

import { errorHandler } from '../middleware/errorHandler.js';

describe('GEDS Import Routes', () => {
  let app: express.Express;
  const orgId = randomUUID();

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', gedsImportRouter);
    app.use(errorHandler);

    // Setup DB
    const userId = 'admin-user';
    db.prepare(
      'INSERT OR IGNORE INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
    ).run(userId, 'admin@example.com', 'hash', 'Admin');
    db.prepare(
      'INSERT OR IGNORE INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)'
    ).run(orgId, 'Test Org', userId);
  });

  describe('POST /api/organizations/:orgId/import/geds-urls', () => {
    it('should successfully import from a valid URL', async () => {
      const urls = ['https://geds-sage.gc.ca/test.xml'];
      const mockParsedData = {
        departments: [{ type: 'department', name: 'Dept 1', path: '/Dept 1' }],
        people: [
          { type: 'person', name: 'John Doe', path: '/Dept 1/John Doe', email: 'john@example.com' },
        ],
      };

      (downloadService.downloadGedsXml as any).mockResolvedValue(undefined);
      (downloadService.cleanupTempFile as any).mockResolvedValue(undefined);
      (parserService.parseGedsXml as any).mockResolvedValue(mockParsedData);
      (fs.readFile as any).mockResolvedValue('<xml>content</xml>');

      const response = await request(app)
        .post(`/api/organizations/${orgId}/import/geds-urls`)
        .send({ urls });

      if (response.body.results[0].status === 'failed') {
        console.error('Import failed:', response.body.results[0].error);
      }

      expect(response.status).toBe(200);
      expect(response.body.results[0].status).toBe('success');
      expect(response.body.results[0].stats?.departments).toBe(1);
      expect(downloadService.downloadGedsXml).toHaveBeenCalled();
    });

    it('should return 400 if urls is not an array', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/import/geds-urls`)
        .send({ urls: 'not-an-array' });

      expect(response.status).toBe(400);
    });

    it('should handle individual URL failures', async () => {
      const urls = ['https://geds-sage.gc.ca/fail.xml'];
      (downloadService.downloadGedsXml as any).mockRejectedValue(new Error('Download failed'));
      (downloadService.cleanupTempFile as any).mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/organizations/${orgId}/import/geds-urls`)
        .send({ urls });

      expect(response.status).toBe(200);
      expect(response.body.results[0].status).toBe('failed');
      expect(response.body.results[0].error).toBe('Download failed');
    });
  });
});
