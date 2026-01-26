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
  statistics?: FtsStatistics;
}

export interface FtsStatistics {
  totalIndexedDepartments: number;
  totalIndexedPeople: number;
  totalIndexedCustomFields: number;
  ftsSize: {
    departments: number; // Estimated size in KB
    people: number;
    customFields: number;
  };
  recommendations: string[];
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

    // For external content FTS tables, count indexed rows by querying FTS5 shadow tables
    // The _data table has metadata rows (typically 2) plus actual indexed document rows
    const deptActualCount = (
      db.prepare('SELECT COUNT(*) as count FROM departments_fts_docsize').get() as { count: number }
    ).count;

    const deptInSync = deptExpected.count === deptActualCount;
    results.push({
      table: 'departments_fts',
      expected: deptExpected.count,
      actual: deptActualCount,
      inSync: deptInSync,
    });

    if (!deptInSync) {
      issues.push(
        `departments_fts out of sync: expected ${deptExpected.count}, got ${deptActualCount}`
      );
    }

    // Check people_fts
    const peopleExpected = db
      .prepare('SELECT COUNT(*) as count FROM people WHERE deleted_at IS NULL')
      .get() as { count: number };

    const peopleActualCount = (
      db.prepare('SELECT COUNT(*) as count FROM people_fts_docsize').get() as { count: number }
    ).count;

    const peopleInSync = peopleExpected.count === peopleActualCount;
    results.push({
      table: 'people_fts',
      expected: peopleExpected.count,
      actual: peopleActualCount,
      inSync: peopleInSync,
    });

    if (!peopleInSync) {
      issues.push(
        `people_fts out of sync: expected ${peopleExpected.count}, got ${peopleActualCount}`
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

    const customFieldsActualCount = (
      db.prepare('SELECT COUNT(*) as count FROM custom_fields_fts_docsize').get() as {
        count: number;
      }
    ).count;

    const customFieldsInSync = customFieldsExpected.count === customFieldsActualCount;
    results.push({
      table: 'custom_fields_fts',
      expected: customFieldsExpected.count,
      actual: customFieldsActualCount,
      inSync: customFieldsInSync,
    });

    if (!customFieldsInSync) {
      issues.push(
        `custom_fields_fts out of sync: expected ${customFieldsExpected.count}, got ${customFieldsActualCount}`
      );
    }

    const healthy = issues.length === 0;

    // Get FTS statistics for enhanced health monitoring
    const statistics = getFtsStatistics();

    return {
      healthy,
      tables: results,
      lastChecked: new Date().toISOString(),
      issues,
      statistics,
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
    db.exec("INSERT INTO departments_fts(departments_fts) VALUES('delete-all')");

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
    db.exec("INSERT INTO people_fts(people_fts) VALUES('delete-all')");

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
    db.exec("INSERT INTO custom_fields_fts(custom_fields_fts) VALUES('delete-all')");

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

// ============================================================================
// FTS Statistics
// ============================================================================

/**
 * Get FTS statistics for search performance monitoring
 */
export function getFtsStatistics(): FtsStatistics {
  const recommendations: string[] = [];

  // Get indexed counts from FTS5 shadow tables (subtract 2 for metadata rows)
  const deptCount = (
    db.prepare('SELECT COUNT(*) as count FROM departments_fts_docsize').get() as { count: number }
  ).count;

  const peopleCount = (
    db.prepare('SELECT COUNT(*) as count FROM people_fts_docsize').get() as { count: number }
  ).count;

  const customFieldsCount = (
    db.prepare('SELECT COUNT(*) as count FROM custom_fields_fts_docsize').get() as { count: number }
  ).count;

  // Estimate FTS index sizes (approximate, based on row count)
  // Since we can't easily get exact size per table in SQLite, estimate based on row count
  // Rough estimate: 1KB per department, 0.5KB per person, 0.3KB per custom field
  const deptSize = deptCount * 1;
  const peopleSize = peopleCount * 0.5;
  const customFieldsSize = customFieldsCount * 0.3;

  // Add recommendations based on statistics
  const totalSize = deptSize + peopleSize + customFieldsSize;
  if (totalSize > 10000) {
    // > 10MB
    recommendations.push('Consider running FTS optimization - indexes are large (>10MB)');
  }

  const totalCount = deptCount + peopleCount + customFieldsCount;
  if (totalCount === 0) {
    recommendations.push('FTS indexes are empty - run rebuild if you have data');
  } else if (totalCount < 10) {
    recommendations.push('Low item count - FTS may not provide significant benefits');
  }

  return {
    totalIndexedDepartments: deptCount,
    totalIndexedPeople: peopleCount,
    totalIndexedCustomFields: customFieldsCount,
    ftsSize: {
      departments: Math.round(deptSize),
      people: Math.round(peopleSize),
      customFields: Math.round(customFieldsSize),
    },
    recommendations,
  };
}
