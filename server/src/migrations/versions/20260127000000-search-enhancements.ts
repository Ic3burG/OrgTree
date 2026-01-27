import { Migration } from '../index.js';

export const migration: Migration = {
  id: '20260127000000',
  name: 'Add search enhancements (trigram, analytics, saved searches)',
  up: db => {
    // 1. Create Trigram FTS tables for fuzzy matching
    // Using explicit transaction for safety
    db.transaction(() => {
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS departments_trigram USING fts5(
          name, description, content='departments', content_rowid='rowid',
          tokenize='trigram'
        );
        INSERT INTO departments_trigram(rowid, name, description) 
        SELECT rowid, name, description FROM departments WHERE deleted_at IS NULL;

        CREATE VIRTUAL TABLE IF NOT EXISTS people_trigram USING fts5(
          name, title, email, phone, content='people', content_rowid='rowid',
          tokenize='trigram'
        );
        INSERT INTO people_trigram(rowid, name, title, email, phone) 
        SELECT rowid, name, title, email, phone FROM people WHERE deleted_at IS NULL;
      `);

      // 2. Add triggers for Trigram tables
      db.exec(`
        -- Departments triggers
        CREATE TRIGGER IF NOT EXISTS departments_trigram_insert AFTER INSERT ON departments WHEN NEW.deleted_at IS NULL BEGIN
          INSERT INTO departments_trigram(rowid, name, description) VALUES (NEW.rowid, NEW.name, NEW.description);
        END;
        CREATE TRIGGER IF NOT EXISTS departments_trigram_delete AFTER DELETE ON departments BEGIN
          INSERT INTO departments_trigram(departments_trigram, rowid, name, description) VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
        END;
        CREATE TRIGGER IF NOT EXISTS departments_trigram_update_delete AFTER UPDATE ON departments WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL BEGIN
          INSERT INTO departments_trigram(departments_trigram, rowid, name, description) VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
        END;
        CREATE TRIGGER IF NOT EXISTS departments_trigram_update_undelete AFTER UPDATE ON departments WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL BEGIN
          INSERT INTO departments_trigram(rowid, name, description) VALUES (NEW.rowid, NEW.name, NEW.description);
        END;
        CREATE TRIGGER IF NOT EXISTS departments_trigram_update_normal AFTER UPDATE ON departments WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL BEGIN
          INSERT INTO departments_trigram(departments_trigram, rowid, name, description) VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
          INSERT INTO departments_trigram(rowid, name, description) VALUES (NEW.rowid, NEW.name, NEW.description);
        END;

        -- People triggers
        CREATE TRIGGER IF NOT EXISTS people_trigram_insert AFTER INSERT ON people WHEN NEW.deleted_at IS NULL BEGIN
          INSERT INTO people_trigram(rowid, name, title, email, phone) VALUES (NEW.rowid, NEW.name, NEW.title, NEW.email, NEW.phone);
        END;
        CREATE TRIGGER IF NOT EXISTS people_trigram_delete AFTER DELETE ON people BEGIN
          INSERT INTO people_trigram(people_trigram, rowid, name, title, email, phone) VALUES ('delete', OLD.rowid, OLD.name, OLD.title, OLD.email, OLD.phone);
        END;
        CREATE TRIGGER IF NOT EXISTS people_trigram_update_delete AFTER UPDATE ON people WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL BEGIN
          INSERT INTO people_trigram(people_trigram, rowid, name, title, email, phone) VALUES ('delete', OLD.rowid, OLD.name, OLD.title, OLD.email, OLD.phone);
        END;
        CREATE TRIGGER IF NOT EXISTS people_trigram_update_undelete AFTER UPDATE ON people WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL BEGIN
          INSERT INTO people_trigram(rowid, name, title, email, phone) VALUES (NEW.rowid, NEW.name, NEW.title, NEW.email, NEW.phone);
        END;
        CREATE TRIGGER IF NOT EXISTS people_trigram_update_normal AFTER UPDATE ON people WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL BEGIN
          INSERT INTO people_trigram(people_trigram, rowid, name, title, email, phone) VALUES ('delete', OLD.rowid, OLD.name, OLD.title, OLD.email, OLD.phone);
          INSERT INTO people_trigram(rowid, name, title, email, phone) VALUES (NEW.rowid, NEW.name, NEW.title, NEW.email, NEW.phone);
        END;
      `);

      // 3. Create Search Analytics table
      db.exec(`
        CREATE TABLE IF NOT EXISTS search_analytics (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL,
          user_id TEXT,
          query TEXT NOT NULL,
          result_count INTEGER NOT NULL,
          execution_time_ms INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_search_analytics_org_created ON search_analytics(organization_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON search_analytics(created_at DESC);
      `);

      // 4. Create Saved Searches table
      db.exec(`
        CREATE TABLE IF NOT EXISTS saved_searches (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          query TEXT NOT NULL,
          filters TEXT, -- JSON
          is_shared BOOLEAN DEFAULT 0,
          last_run_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
        CREATE INDEX IF NOT EXISTS idx_saved_searches_org ON saved_searches(organization_id);
      `);
    })();
  },
  down: db => {
    db.exec(`
      DROP TABLE IF EXISTS saved_searches;
      DROP TABLE IF EXISTS search_analytics;
      
      DROP TRIGGER IF EXISTS people_trigram_insert;
      DROP TRIGGER IF EXISTS people_trigram_delete;
      DROP TRIGGER IF EXISTS people_trigram_update_delete;
      DROP TRIGGER IF EXISTS people_trigram_update_undelete;
      DROP TRIGGER IF EXISTS people_trigram_update_normal;
      DROP TABLE IF EXISTS people_trigram;

      DROP TRIGGER IF EXISTS departments_trigram_insert;
      DROP TRIGGER IF EXISTS departments_trigram_delete;
      DROP TRIGGER IF EXISTS departments_trigram_update_delete;
      DROP TRIGGER IF EXISTS departments_trigram_update_undelete;
      DROP TRIGGER IF EXISTS departments_trigram_update_normal;
      DROP TABLE IF EXISTS departments_trigram;
    `);
  },
};
