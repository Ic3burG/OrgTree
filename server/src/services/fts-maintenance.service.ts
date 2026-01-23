import db from '../db.js';

// ============================================================================
// Types
// ============================================================================

export interface FtsIntegrityResult {
  table: string;
  expected: number;
  actual: number;
  inSync: boolean;
}

export interface FtsHealthStatus {
  healthy: boolean;
  tables: FtsIntegrityResult[];
  lastChecked: string;
  issues: string[];
}

// ============================================================================
// FTS Integrity Checking
// ============================================================================

/**
 * Check if FTS indexes are in sync with source tables
 * Compares count of non-deleted items in source tables with FTS table counts
 */
export function checkFtsIntegrity(): FtsHealthStatus {
  const results: FtsIntegrityResult[] = [];
  const issues: string[] = [];

  try {
    // Check departments_fts
    const deptExpected = db
      .prepare('SELECT COUNT(*) as count FROM departments WHERE deleted_at IS NULL')
      .get() as { count: number };

    const deptActual = db
      .prepare('SELECT COUNT(DISTINCT rowid) as count FROM departments_fts')
      .get() as { count: number };

    const deptInSync = deptExpected.count === deptActual.count;
    results.push({
      table: 'departments_fts',
      expected: deptExpected.count,
      actual: deptActual.count,
      inSync: deptInSync,
    });

    if (!deptInSync) {
      issues.push(
        `departments_fts out of sync: expected ${deptExpected.count}, got ${deptActual.count}`
      );
    }

    // Check people_fts
    const peopleExpected = db
      .prepare('SELECT COUNT(*) as count FROM people WHERE deleted_at IS NULL')
      .get() as { count: number };

    const peopleActual = db
      .prepare('SELECT COUNT(DISTINCT rowid) as count FROM people_fts')
      .get() as { count: number };

    const peopleInSync = peopleExpected.count === peopleActual.count;
    results.push({
      table: 'people_fts',
      expected: peopleExpected.count,
      actual: peopleActual.count,
      inSync: peopleInSync,
    });

    if (!peopleInSync) {
      issues.push(
        `people_fts out of sync: expected ${peopleExpected.count}, got ${peopleActual.count}`
      );
    }

    // Check custom_fields_fts
    // Count distinct entities that have searchable custom field values
    const customFieldsExpected = db
      .prepare(
        `SELECT COUNT(DISTINCT v.entity_id || ':' || v.entity_type) as count
         FROM custom_field_values v
         JOIN custom_field_definitions d ON v.field_definition_id = d.id
         WHERE d.is_searchable = 1
           AND d.deleted_at IS NULL
           AND v.deleted_at IS NULL`
      )
      .get() as { count: number };

    const customFieldsActual = db
      .prepare('SELECT COUNT(*) as count FROM custom_fields_fts')
      .get() as { count: number };

    const customFieldsInSync = customFieldsExpected.count === customFieldsActual.count;
    results.push({
      table: 'custom_fields_fts',
      expected: customFieldsExpected.count,
      actual: customFieldsActual.count,
      inSync: customFieldsInSync,
    });

    if (!customFieldsInSync) {
      issues.push(
        `custom_fields_fts out of sync: expected ${customFieldsExpected.count}, got ${customFieldsActual.count}`
      );
    }

    const healthy = issues.length === 0;

    return {
      healthy,
      tables: results,
      lastChecked: new Date().toISOString(),
      issues,
    };
  } catch (err) {
    console.error('Error checking FTS integrity:', err);
    return {
      healthy: false,
      tables: results,
      lastChecked: new Date().toISOString(),
      issues: [`Error checking integrity: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

// ============================================================================
// FTS Rebuild Functions
// ============================================================================

/**
 * Rebuild departments_fts from scratch
 * Clears FTS table and repopulates from source table
 */
export function rebuildDepartmentsFts(): void {
  const transaction = db.transaction(() => {
    // Clear existing FTS data
    db.exec('INSERT INTO departments_fts(departments_fts) VALUES("delete-all")');

    // Repopulate with non-deleted departments
    db.exec(`
      INSERT INTO departments_fts(rowid, name, description)
      SELECT rowid, name, description
      FROM departments
      WHERE deleted_at IS NULL
    `);

    console.log('Rebuilt departments_fts index');
  });

  transaction();
}

/**
 * Rebuild people_fts from scratch
 * Clears FTS table and repopulates from source table
 */
export function rebuildPeopleFts(): void {
  const transaction = db.transaction(() => {
    // Clear existing FTS data
    db.exec('INSERT INTO people_fts(people_fts) VALUES("delete-all")');

    // Repopulate with non-deleted people
    db.exec(`
      INSERT INTO people_fts(rowid, name, title, email, phone)
      SELECT rowid, name, title, email, phone
      FROM people
      WHERE deleted_at IS NULL
    `);

    console.log('Rebuilt people_fts index');
  });

  transaction();
}

/**
 * Rebuild custom_fields_fts from scratch
 * Clears FTS table and repopulates from custom field values
 */
export function rebuildCustomFieldsFts(): void {
  const transaction = db.transaction(() => {
    // Clear existing FTS data
    db.exec('DELETE FROM custom_fields_fts');

    // Repopulate with searchable custom field values
    db.exec(`
      INSERT INTO custom_fields_fts (entity_id, entity_type, field_values)
      SELECT
        v.entity_id,
        v.entity_type,
        GROUP_CONCAT(v.value, ' ')
      FROM custom_field_values v
      JOIN custom_field_definitions d ON v.field_definition_id = d.id
      WHERE d.is_searchable = 1
        AND d.deleted_at IS NULL
        AND v.deleted_at IS NULL
      GROUP BY v.entity_id, v.entity_type
    `);

    console.log('Rebuilt custom_fields_fts index');
  });

  transaction();
}

/**
 * Rebuild all FTS indexes
 * Safe to run on production - uses transactions
 */
export function rebuildAllFtsIndexes(): FtsHealthStatus {
  console.log('Starting full FTS rebuild...');

  try {
    rebuildDepartmentsFts();
    rebuildPeopleFts();
    rebuildCustomFieldsFts();

    console.log('FTS rebuild completed successfully');

    // Return integrity check results
    return checkFtsIntegrity();
  } catch (err) {
    console.error('Error rebuilding FTS indexes:', err);
    throw err;
  }
}

// ============================================================================
// FTS Optimization
// ============================================================================

/**
 * Optimize FTS indexes to reclaim space and improve performance
 * Should be run periodically (e.g., nightly maintenance)
 */
export function optimizeFtsIndexes(): void {
  try {
    db.exec(`
      INSERT INTO departments_fts(departments_fts) VALUES('optimize');
      INSERT INTO people_fts(people_fts) VALUES('optimize');
    `);
    console.log('FTS indexes optimized');
  } catch (err) {
    console.error('Error optimizing FTS indexes:', err);
    throw err;
  }
}
