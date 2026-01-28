import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import https from 'https';
import { Readable } from 'stream';
import { EventEmitter } from 'events';
import {
  downloadGedsXml,
  NetworkError,
  DownloadTimeoutError,
  FileSizeLimitError,
} from './geds-download.service.js';

vi.mock('https');

describe('GEDS Download Service', () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'geds-test-'));
    testFile = path.join(tempDir, 'test-file.xml');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('downloadGedsXml', () => {
    it('should successfully download file', async () => {
      const mockResponse = Readable.from(['<xml></xml>']);
      (mockResponse as any).statusCode = 200;
      (mockResponse as any).headers = { 'content-length': '11' };

      vi.mocked(https.get).mockImplementation((_url: any, _options: any, callback?: any) => {
        if (typeof _options === 'function') callback = _options;
        callback(mockResponse);
        return {
          on: vi.fn(),
          setTimeout: vi.fn(),
          destroy: vi.fn(),
        } as any;
      });

      await downloadGedsXml('https://geds-sage.gc.ca/en/GEDS', testFile);

      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('<xml></xml>');
    });

    it('should handle redirects (302)', async () => {
      const mockRedirectResponse: any = new EventEmitter();
      mockRedirectResponse.statusCode = 302;
      mockRedirectResponse.headers = { location: 'https://geds.canada.ca/new-location' };

      const mockFinalResponse = Readable.from(['redirected content']);
      (mockFinalResponse as any).statusCode = 200;
      (mockFinalResponse as any).headers = {};

      vi.mocked(https.get).mockImplementation((url: any, options: any, callback?: any) => {
        if (typeof options === 'function') callback = options;

        if (url.toString().includes('new-location')) {
          callback(mockFinalResponse);
        } else {
          callback(mockRedirectResponse);
        }

        return {
          on: vi.fn(),
          setTimeout: vi.fn(),
          destroy: vi.fn(),
        } as any;
      });

      await downloadGedsXml('https://geds-sage.gc.ca/en/GEDS', testFile);

      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('redirected content');
    });

    it('should throw NetworkError on 404', async () => {
      const mockResponse: any = new EventEmitter();
      mockResponse.statusCode = 404;
      mockResponse.statusMessage = 'Not Found';

      vi.mocked(https.get).mockImplementation((url: any, options: any, callback?: any) => {
        if (typeof options === 'function') callback = options;
        callback(mockResponse);
        return { on: vi.fn(), setTimeout: vi.fn() } as any;
      });

      await expect(downloadGedsXml('https://geds-sage.gc.ca/en/GEDS', testFile)).rejects.toThrow(
        NetworkError
      );
    });

    it('should throw FileSizeLimitError if Content-Length too large', async () => {
      const mockResponse: any = new EventEmitter();
      mockResponse.statusCode = 200;
      mockResponse.headers = { 'content-length': (60 * 1024 * 1024).toString() }; // 60MB > 50MB

      vi.mocked(https.get).mockImplementation((url: any, options: any, callback?: any) => {
        if (typeof options === 'function') callback = options;
        callback(mockResponse);
        return { on: vi.fn(), setTimeout: vi.fn() } as any;
      });

      await expect(downloadGedsXml('https://geds-sage.gc.ca/en/GEDS', testFile)).rejects.toThrow(
        FileSizeLimitError
      );
    });

    it('should throw DownloadTimeoutError on timeout', async () => {
      vi.mocked(https.get).mockImplementation((_url: any, _options: any, _callback?: any) => {
        const req: any = new EventEmitter();
        req.setTimeout = (_ms: number, cb: () => void) => {
          setTimeout(cb, 10);
        };
        req.destroy = vi.fn();
        return req;
      });

      await expect(downloadGedsXml('https://geds-sage.gc.ca/en/GEDS', testFile)).rejects.toThrow(
        DownloadTimeoutError
      );
    });
  });
});
