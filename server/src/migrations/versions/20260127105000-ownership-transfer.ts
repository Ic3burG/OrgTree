import { Database } from 'better-sqlite3';
import type { Migration } from '../index.js';

export const migration: Migration = {
  id: '20260127105000',
  name: 'ownership-transfer',

  up: (db: Database) => {
    // Create ownership_transfers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS ownership_transfers (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        from_user_id TEXT NOT NULL,
        to_user_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
        initiated_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        completed_at INTEGER,
        reason TEXT,
        cancellation_reason TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (from_user_id) REFERENCES users(id),
        FOREIGN KEY (to_user_id) REFERENCES users(id)
      );
    `);

    // Create indices for ownership_transfers
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ownership_transfers_org 
      ON ownership_transfers(organization_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ownership_transfers_status 
      ON ownership_transfers(status);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ownership_transfers_to_user 
      ON ownership_transfers(to_user_id);
    `);

    // Create ownership_transfer_audit_log table
    db.exec(`
      CREATE TABLE IF NOT EXISTS ownership_transfer_audit_log (
        id TEXT PRIMARY KEY,
        transfer_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('initiated', 'accepted', 'rejected', 'cancelled', 'expired')),
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        metadata TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (transfer_id) REFERENCES ownership_transfers(id) ON DELETE CASCADE,
        FOREIGN KEY (actor_id) REFERENCES users(id)
      );
    `);

    // Create indices for ownership_transfer_audit_log
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transfer_audit_transfer 
      ON ownership_transfer_audit_log(transfer_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transfer_audit_timestamp 
      ON ownership_transfer_audit_log(timestamp);
    `);

    console.log('✓ Created ownership_transfers table');
    console.log('✓ Created ownership_transfer_audit_log table');
    console.log('✓ Created all required indices');
  },

  down: (db: Database) => {
    // Drop tables in reverse order (audit log first due to foreign key)
    db.exec('DROP TABLE IF EXISTS ownership_transfer_audit_log;');
    db.exec('DROP TABLE IF EXISTS ownership_transfers;');

    console.log('✓ Dropped ownership_transfer_audit_log table');
    console.log('✓ Dropped ownership_transfers table');
  },
};
