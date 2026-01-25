import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  validateGedsUrl,
  cleanupTempFile,
  InvalidUrlError,
} from './geds-download.service.js';

describe('GEDS Download Service', () => {
  describe('validateGedsUrl', () => {
    it('should accept valid GEDS URL from .gc.ca domain', () => {
      const url = 'https://geds-sage.gc.ca/en/GEDS?pgid=015&dn=...';
      expect(() => validateGedsUrl(url)).not.toThrow();
    });

    it('should accept valid GEDS URL from canada.ca domain', () => {
      const url = 'https://canada.ca/some/path';
      expect(() => validateGedsUrl(url)).not.toThrow();
    });

    it('should accept valid GEDS URL from .canada.ca subdomain', () => {
      const url = 'https://geds.canada.ca/en/GEDS?pgid=026';
      expect(() => validateGedsUrl(url)).not.toThrow();
    });

    it('should reject non-HTTPS URL', () => {
      const url = 'http://geds-sage.gc.ca/en/GEDS';
      expect(() => validateGedsUrl(url)).toThrow(InvalidUrlError);
      expect(() => validateGedsUrl(url)).toThrow('must use HTTPS protocol');
    });

    it('should reject URL from disallowed domain', () => {
      const url = 'https://evil.com/fake-geds';
      expect(() => validateGedsUrl(url)).toThrow(InvalidUrlError);
      expect(() => validateGedsUrl(url)).toThrow('must be from an allowed domain');
    });

    it('should reject malformed URL', () => {
      const url = 'not-a-url';
      expect(() => validateGedsUrl(url)).toThrow(InvalidUrlError);
      expect(() => validateGedsUrl(url)).toThrow('Invalid URL format');
    });

    it('should reject empty URL', () => {
      const url = '';
      expect(() => validateGedsUrl(url)).toThrow(InvalidUrlError);
    });

    it('should reject URL with wrong protocol', () => {
      const url = 'ftp://geds-sage.gc.ca/file';
      expect(() => validateGedsUrl(url)).toThrow(InvalidUrlError);
      expect(() => validateGedsUrl(url)).toThrow('must use HTTPS protocol');
    });

    it('should accept URL with query parameters', () => {
      const url = 'https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=Y249Sm9obiBTbWl0aA%3D%3D';
      expect(() => validateGedsUrl(url)).not.toThrow();
    });

    it('should be case-insensitive for hostname', () => {
      const url = 'https://GEDS-SAGE.GC.CA/en/GEDS';
      expect(() => validateGedsUrl(url)).not.toThrow();
    });
  });

  describe('cleanupTempFile', () => {
    let tempDir: string;
    let testFile: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'geds-test-'));
      testFile = path.join(tempDir, 'test-file.xml');
    });

    afterEach(async () => {
      // Clean up test directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore errors
      }
    });

    it('should successfully delete existing file', async () => {
      // Create a test file
      await fs.writeFile(testFile, 'test content');

      // Verify file exists
      await expect(fs.access(testFile)).resolves.toBeUndefined();

      // Delete the file
      await cleanupTempFile(testFile);

      // Verify file is gone
      await expect(fs.access(testFile)).rejects.toThrow();
    });

    it('should not throw error when file does not exist', async () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.xml');

      // Should not throw
      await expect(cleanupTempFile(nonExistentFile)).resolves.toBeUndefined();
    });

    it('should not throw error when file is already deleted', async () => {
      // Create and then delete file
      await fs.writeFile(testFile, 'test content');
      await fs.unlink(testFile);

      // Should not throw even though file is already gone
      await expect(cleanupTempFile(testFile)).resolves.toBeUndefined();
    });

    it('should handle invalid path gracefully', async () => {
      const invalidPath = '/root/cannot-access/file.xml';

      // Should not throw even with permission errors
      await expect(cleanupTempFile(invalidPath)).resolves.toBeUndefined();
    });
  });
});
