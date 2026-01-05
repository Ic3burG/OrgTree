import fs from 'fs';
import path from 'path';
import db from '../db.js';
import logger from '../utils/logger.js';

// Default backup directory (can be overridden via environment variable)
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

// Default retention: keep last 7 daily backups
const MAX_BACKUPS = parseInt(process.env.BACKUP_RETENTION || '7', 10);

/**
 * Ensure backup directory exists
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logger.info('Created backup directory', { path: BACKUP_DIR });
  }
}

/**
 * Generate backup filename with timestamp
 * Format: orgtree-backup-YYYY-MM-DD-HHMMSS.db
 */
function generateBackupFilename() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/T/, '-').replace(/:/g, '').replace(/\..+/, '');
  return `orgtree-backup-${timestamp}.db`;
}

/**
 * Create a backup of the database
 * Uses SQLite's backup API for consistency
 *
 * @param {string} [customPath] - Optional custom backup path
 * @returns {Promise<{success: boolean, path?: string, size?: number, error?: string}>}
 */
export async function createBackup(customPath = null) {
  try {
    ensureBackupDir();

    const backupPath = customPath || path.join(BACKUP_DIR, generateBackupFilename());

    logger.info('Starting database backup', { destination: backupPath });

    // Use better-sqlite3's backup method for consistent backups
    // This creates a snapshot even while the database is in use
    await db.backup(backupPath);

    // Get backup file size
    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    logger.info('Database backup completed', {
      path: backupPath,
      sizeMB,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      path: backupPath,
      size: stats.size,
      sizeMB: parseFloat(sizeMB),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Database backup failed', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * List all available backups
 * @returns {Array<{filename: string, path: string, size: number, created: Date}>}
 */
export function listBackups() {
  ensureBackupDir();

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('orgtree-backup-') && f.endsWith('.db'))
    .map(filename => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        path: filePath,
        size: stats.size,
        sizeMB: parseFloat((stats.size / (1024 * 1024)).toFixed(2)),
        created: stats.mtime,
      };
    })
    .sort((a, b) => b.created - a.created); // Newest first

  return files;
}

/**
 * Clean up old backups, keeping only the most recent N
 * @param {number} [keepCount] - Number of backups to keep (default: MAX_BACKUPS)
 * @returns {{deleted: number, kept: number, deletedFiles: string[]}}
 */
export function cleanupOldBackups(keepCount = MAX_BACKUPS) {
  const backups = listBackups();
  const deletedFiles = [];

  if (backups.length <= keepCount) {
    logger.info('No backups to clean up', {
      total: backups.length,
      keepCount,
    });
    return { deleted: 0, kept: backups.length, deletedFiles };
  }

  // Delete oldest backups beyond the keep count
  const toDelete = backups.slice(keepCount);

  for (const backup of toDelete) {
    try {
      fs.unlinkSync(backup.path);
      deletedFiles.push(backup.filename);
      logger.info('Deleted old backup', { filename: backup.filename });
    } catch (error) {
      logger.error('Failed to delete backup', {
        filename: backup.filename,
        error: error.message,
      });
    }
  }

  logger.info('Backup cleanup completed', {
    deleted: deletedFiles.length,
    kept: keepCount,
  });

  return {
    deleted: deletedFiles.length,
    kept: Math.min(backups.length, keepCount),
    deletedFiles,
  };
}

/**
 * Restore database from a backup file
 * WARNING: This will overwrite the current database!
 *
 * @param {string} backupPath - Path to the backup file
 * @returns {{success: boolean, error?: string}}
 */
export function restoreFromBackup(backupPath) {
  try {
    // Verify backup file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Verify it's a valid SQLite database
    const testDb = new db.constructor(backupPath, { readonly: true });
    const check = testDb.prepare('SELECT 1 as ok').get();
    testDb.close();

    if (!check || check.ok !== 1) {
      throw new Error('Invalid SQLite database file');
    }

    // Get current database path
    const currentDbPath = db.name;

    logger.warn('Starting database restore', {
      from: backupPath,
      to: currentDbPath,
    });

    // Close current database connection
    db.close();

    // Copy backup over current database
    fs.copyFileSync(backupPath, currentDbPath);

    logger.info('Database restore completed', {
      from: backupPath,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Database restored. Server restart required.',
    };
  } catch (error) {
    logger.error('Database restore failed', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get backup statistics
 * @returns {{totalBackups: number, totalSizeMB: number, oldestBackup: Date|null, newestBackup: Date|null}}
 */
export function getBackupStats() {
  const backups = listBackups();

  if (backups.length === 0) {
    return {
      totalBackups: 0,
      totalSizeMB: 0,
      oldestBackup: null,
      newestBackup: null,
      backupDir: BACKUP_DIR,
    };
  }

  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

  return {
    totalBackups: backups.length,
    totalSizeMB: parseFloat((totalSize / (1024 * 1024)).toFixed(2)),
    oldestBackup: backups[backups.length - 1].created,
    newestBackup: backups[0].created,
    backupDir: BACKUP_DIR,
  };
}

export default {
  createBackup,
  listBackups,
  cleanupOldBackups,
  restoreFromBackup,
  getBackupStats,
};
