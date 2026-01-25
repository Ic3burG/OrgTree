import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createBackup, listBackups, cleanupOldBackups, getBackupStats, restoreFromBackup } from './backup.service.js';
import db from '../db.js';

// Mock dependencies
vi.mock('fs');

// We don't mock path because we want real path manipulation logic
// but we mock db and logger
vi.mock('../db.js', () => ({
  default: {
    backup: vi.fn(),
    close: vi.fn(),
    name: '/mock/current/db.sqlite',
  },
}));

vi.mock('../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock better-sqlite3 for the restore verification
vi.mock('better-sqlite3', () => {
  return {
    default: class MockDatabase {
      constructor() {}
      prepare() {
        return {
          get: () => ({ ok: 1 }),
        };
      }
      close() {}
    },
  };
});

describe('Backup Service', () => {
  const mockDate = new Date('2026-01-01T12:00:00Z');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    // Default FS mocks
    (fs.existsSync as Mock).mockReturnValue(true);
    (fs.mkdirSync as Mock).mockReturnValue(undefined);
    (fs.statSync as Mock).mockReturnValue({
      size: 1024 * 1024 * 5, // 5MB
      mtime: mockDate,
      isFile: () => true,
    });
    (fs.readdirSync as Mock).mockReturnValue([]);
    (fs.unlinkSync as Mock).mockReturnValue(undefined);
    (fs.copyFileSync as Mock).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createBackup', () => {
    it('should create a backup successfully', async () => {
      // Mock db.backup success
      (db.backup as Mock).mockResolvedValue(undefined);

      const result = await createBackup();

      expect(fs.existsSync).toHaveBeenCalled(); // Checks dir
      expect(db.backup).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.sizeMB).toBe(5);
      expect(result.path).toContain('orgtree-backup-');
    });

    it('should handle db.backup failure', async () => {
      const error = new Error('Backup failed');
      (db.backup as Mock).mockRejectedValue(error);

      const result = await createBackup();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Backup failed');
    });

    it('should create backup directory if it does not exist', async () => {
      (fs.existsSync as Mock).mockReturnValue(false); // Dir doesn't exist

      await createBackup();

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('backups'), { recursive: true });
    });

    it('should accept a custom path', async () => {
      const customPath = '/custom/path/backup.db';
      await createBackup(customPath);

      expect(db.backup).toHaveBeenCalledWith(customPath);
      expect(fs.statSync).toHaveBeenCalledWith(customPath);
    });
  });

  describe('listBackups', () => {
    it('should list and sort backups correctly', () => {
      const file1 = 'orgtree-backup-2026-01-01.db';
      const file2 = 'orgtree-backup-2026-01-02.db';
      const otherFile = 'readme.txt';

      (fs.readdirSync as Mock).mockReturnValue([file1, file2, otherFile]);
      
      // Mock stats for sorting
      (fs.statSync as Mock).mockImplementation((filePath: string) => ({
        size: 1024,
        mtime: filePath.includes('2026-01-02') ? new Date('2026-01-02') : new Date('2026-01-01'),
        isFile: () => true,
      }));

      const backups = listBackups();

      expect(backups).toHaveLength(2);
      expect(backups[0].filename).toBe(file2); // Newest first
      expect(backups[1].filename).toBe(file1);
      expect(backups.map(b => b.filename)).not.toContain(otherFile);
    });

    it('should return empty array if no backups found', () => {
      (fs.readdirSync as Mock).mockReturnValue([]);
      const backups = listBackups();
      expect(backups).toEqual([]);
    });
  });

  describe('cleanupOldBackups', () => {
    it('should not delete anything if count is within limit', () => {
      const files = ['orgtree-backup-1.db', 'orgtree-backup-2.db'];
      (fs.readdirSync as Mock).mockReturnValue(files);
      // Mock statSync to just work
      (fs.statSync as Mock).mockReturnValue({ size: 100, mtime: new Date() });

      const result = cleanupOldBackups(5);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(result.deleted).toBe(0);
      expect(result.kept).toBe(2);
    });

    it('should delete oldest backups if limit exceeded', () => {
      const files = ['orgtree-backup-new.db', 'orgtree-backup-medium.db', 'orgtree-backup-old.db'];
      (fs.readdirSync as Mock).mockReturnValue(files);
      
      (fs.statSync as Mock).mockImplementation((p: string) => {
        const name = path.basename(p);
        let date = new Date();
        if (name === 'orgtree-backup-old.db') date = new Date('2020-01-01');
        if (name === 'orgtree-backup-medium.db') date = new Date('2021-01-01');
        if (name === 'orgtree-backup-new.db') date = new Date('2022-01-01');
        return { size: 100, mtime: date };
      });

      // Keep 2, expecting 'old.db' to be deleted (since it's sorted last)
      const result = cleanupOldBackups(2);

      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(result.deleted).toBe(1);
      expect(result.kept).toBe(2);
      expect(result.deletedFiles).toContain('orgtree-backup-old.db');
    });

    it('should handle deletion errors gracefully', () => {
       const files = ['orgtree-backup-new.db', 'orgtree-backup-old.db'];
       (fs.readdirSync as Mock).mockReturnValue(files);
       (fs.statSync as Mock).mockImplementation((p) => {
           return { size: 100, mtime: p.includes('old') ? new Date('2020-01-01') : new Date('2022-01-01') };
       });

       (fs.unlinkSync as Mock).mockImplementation(() => {
           throw new Error('Permission denied');
       });

       const result = cleanupOldBackups(1);

       // Should catch error and continue
       expect(result.deleted).toBe(0); // Failed to delete 1
       expect(result.deletedFiles).toHaveLength(0); // Actually didn't push to deleted array
    });
  });

  describe('getBackupStats', () => {
    it('should calculate stats correctly', () => {
      (fs.readdirSync as Mock).mockReturnValue(['orgtree-backup-1.db', 'orgtree-backup-2.db']);
      (fs.statSync as Mock).mockReturnValue({ size: 1024 * 1024, mtime: mockDate });

      const stats = getBackupStats();

      expect(stats.totalBackups).toBe(2);
      expect(stats.totalSizeMB).toBe(2); // 1MB * 2
      expect(stats.oldestBackup).toEqual(mockDate);
      expect(stats.newestBackup).toEqual(mockDate);
    });

    it('should return zero stats for empty directory', () => {
      (fs.readdirSync as Mock).mockReturnValue([]);
      const stats = getBackupStats();
      expect(stats.totalBackups).toBe(0);
      expect(stats.totalSizeMB).toBe(0);
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore successfully', async () => {
      const result = await restoreFromBackup('/path/to/backup.db');
      
      expect(result.success).toBe(true);
      expect(fs.copyFileSync).toHaveBeenCalledWith('/path/to/backup.db', '/mock/current/db.sqlite');
      expect(db.close).toHaveBeenCalled();
    });

    it('should fail if backup file does not exist', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);
      
      const result = await restoreFromBackup('/missing.db');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(db.close).not.toHaveBeenCalled();
    });
  });
});
