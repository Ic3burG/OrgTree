#!/usr/bin/env node

/**
 * OrgTree Database Backup Script
 *
 * Usage:
 *   node scripts/backup.js                    # Create backup with auto cleanup
 *   node scripts/backup.js --list             # List all backups
 *   node scripts/backup.js --stats            # Show backup statistics
 *   node scripts/backup.js --cleanup          # Clean old backups only
 *   node scripts/backup.js --restore <file>   # Restore from backup
 *
 * Environment Variables:
 *   BACKUP_DIR        - Directory to store backups (default: ./backups)
 *   BACKUP_RETENTION  - Number of backups to keep (default: 7)
 *   DATABASE_URL      - Database file path
 *
 * For Render Cron Jobs:
 *   Command: node server/scripts/backup.js
 *   Schedule: 0 2 * * * (daily at 2 AM UTC)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Import backup service after env is loaded
const { createBackup, listBackups, cleanupOldBackups, restoreFromBackup, getBackupStats } =
  await import('../src/services/backup.service.js');

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log('OrgTree Database Backup Utility');
  console.log('================================\n');

  try {
    switch (command) {
      case '--list':
        await listAllBackups();
        break;

      case '--stats':
        showStats();
        break;

      case '--cleanup':
        await cleanup();
        break;

      case '--restore': {
        const backupFile = args[1];
        if (!backupFile) {
          console.error('Error: Please specify a backup file to restore');
          console.log('Usage: node scripts/backup.js --restore <filename>');
          process.exit(1);
        }
        await restore(backupFile);
        break;
      }

      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        // Default: create backup and cleanup old ones
        await createBackupWithCleanup();
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error:', errorMessage);
    process.exit(1);
  }
}

async function createBackupWithCleanup() {
  console.log('Creating database backup...\n');

  const result = await createBackup();

  if (result.success) {
    console.log('✅ Backup created successfully!');
    console.log(`   Path: ${result.path}`);
    console.log(`   Size: ${result.sizeMB} MB`);
    console.log(`   Time: ${result.timestamp}\n`);

    // Clean up old backups
    console.log('Cleaning up old backups...');
    const cleanup = cleanupOldBackups();
    console.log(`   Kept: ${cleanup.kept} backups`);
    console.log(`   Deleted: ${cleanup.deleted} backups`);
    if (cleanup.deletedFiles.length > 0) {
      cleanup.deletedFiles.forEach(f => console.log(`   - ${f}`));
    }
  } else {
    console.error('❌ Backup failed:', result.error);
    process.exit(1);
  }
}

async function listAllBackups() {
  const backups = listBackups();

  if (backups.length === 0) {
    console.log('No backups found.');
    return;
  }

  console.log(`Found ${backups.length} backup(s):\n`);
  console.log('Filename                              Size (MB)   Created');
  console.log('─'.repeat(70));

  backups.forEach(backup => {
    const created = backup.created.toISOString().replace('T', ' ').substring(0, 19);
    console.log(
      `${backup.filename.padEnd(38)} ${backup.sizeMB.toString().padStart(8)}   ${created}`
    );
  });
}

function showStats() {
  const stats = getBackupStats();

  console.log('Backup Statistics:');
  console.log('─'.repeat(40));
  console.log(`  Backup Directory: ${stats.backupDir}`);
  console.log(`  Total Backups:    ${stats.totalBackups}`);
  console.log(`  Total Size:       ${stats.totalSizeMB} MB`);

  if (stats.newestBackup) {
    console.log(`  Newest Backup:    ${stats.newestBackup.toISOString()}`);
    if (stats.oldestBackup) {
      console.log(`  Oldest Backup:    ${stats.oldestBackup.toISOString()}`);
    }
  }
}

async function cleanup() {
  console.log('Cleaning up old backups...\n');

  const result = cleanupOldBackups();

  console.log(`✅ Cleanup complete`);
  console.log(`   Kept: ${result.kept} backups`);
  console.log(`   Deleted: ${result.deleted} backups`);

  if (result.deletedFiles.length > 0) {
    console.log('\nDeleted files:');
    result.deletedFiles.forEach(f => console.log(`   - ${f}`));
  }
}

async function restore(filename: string) {
  const backups = listBackups();
  const backup = backups.find(b => b.filename === filename);

  if (!backup) {
    console.error(`Error: Backup "${filename}" not found.`);
    console.log('\nAvailable backups:');
    backups.forEach(b => console.log(`  - ${b.filename}`));
    process.exit(1);
  }

  console.log('⚠️  WARNING: This will overwrite the current database!');
  console.log(`   Restoring from: ${backup.filename}`);
  console.log(`   Backup date: ${backup.created.toISOString()}\n`);

  // In a real scenario, you'd want to prompt for confirmation
  // For CLI usage, we'll proceed directly
  console.log('Restoring database...\n');

  const result = await restoreFromBackup(backup.path);

  if (result.success) {
    console.log('✅ Database restored successfully!');
    console.log('   ⚠️  Please restart the server for changes to take effect.');
  } else {
    console.error('❌ Restore failed:', result.error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`Usage: node scripts/backup.js [command]

Commands:
  (no command)      Create a new backup and clean up old ones
  --list            List all available backups
  --stats           Show backup statistics
  --cleanup         Clean up old backups (keep last N)
  --restore <file>  Restore database from a backup file
  --help, -h        Show this help message

Environment Variables:
  BACKUP_DIR        Directory to store backups (default: ./backups)
  BACKUP_RETENTION  Number of backups to keep (default: 7)
  DATABASE_URL      Database file path

Examples:
  node scripts/backup.js                     # Daily backup with cleanup
  node scripts/backup.js --list              # Show all backups
  node scripts/backup.js --restore orgtree-backup-2026-01-04-100000.db
`);
}

main().catch(console.error);
