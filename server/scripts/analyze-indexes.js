import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use the database from the parent directory
const dbPath = join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

console.log('='.repeat(80));
console.log('DATABASE INDEX ANALYSIS');
console.log('='.repeat(80));
console.log();

// Get all tables
const tables = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts'
  ORDER BY name
`).all();

console.log('📊 TABLES:');
tables.forEach(t => console.log(`  - ${t.name}`));
console.log();

// Get all indexes
console.log('🔍 EXISTING INDEXES:');
console.log();

for (const table of tables) {
  const indexes = db.prepare(`
    SELECT
      m.name as index_name,
      m.sql
    FROM sqlite_master m
    WHERE m.type = 'index'
      AND m.tbl_name = ?
      AND m.name NOT LIKE 'sqlite_%'
    ORDER BY m.name
  `).all(table.name);

  if (indexes.length > 0) {
    console.log(`📋 ${table.name}:`);
    indexes.forEach(idx => {
      console.log(`   ✓ ${idx.index_name}`);
      if (idx.sql) {
        console.log(`     ${idx.sql}`);
      }
    });
    console.log();
  }
}

// Analyze query patterns
console.log('='.repeat(80));
console.log('QUERY PATTERN ANALYSIS');
console.log('='.repeat(80));
console.log();

// Test queries that are likely to be slow
const testQueries = [
  {
    name: 'Get departments by organization',
    query: 'SELECT * FROM departments WHERE organization_id = ? AND deleted_at IS NULL',
    params: ['test-org-id']
  },
  {
    name: 'Get departments with parent hierarchy',
    query: 'SELECT * FROM departments WHERE parent_id = ? AND deleted_at IS NULL',
    params: ['test-dept-id']
  },
  {
    name: 'Get people by department',
    query: 'SELECT * FROM people WHERE department_id = ? AND deleted_at IS NULL',
    params: ['test-dept-id']
  },
  {
    name: 'Get audit logs with filters',
    query: 'SELECT * FROM audit_logs WHERE organization_id = ? AND action_type = ? ORDER BY created_at DESC LIMIT 50',
    params: ['test-org-id', 'created']
  },
  {
    name: 'Get active invitations',
    query: "SELECT * FROM invitations WHERE organization_id = ? AND status = ? AND expires_at > datetime('now')",
    params: ['test-org-id', 'pending']
  },
  {
    name: 'Get organization members',
    query: 'SELECT * FROM organization_members WHERE organization_id = ? AND user_id = ?',
    params: ['test-org-id', 'test-user-id']
  }
];

testQueries.forEach(({ name, query, params }) => {
  console.log(`\n📝 ${name}:`);
  console.log(`   Query: ${query}`);

  // Get query plan
  const plan = db.prepare(`EXPLAIN QUERY PLAN ${query}`).all(...params);

  console.log('   Query Plan:');
  plan.forEach(step => {
    const detail = step.detail || '';
    const usesIndex = detail.includes('USING INDEX') || detail.includes('SEARCH');
    const scanType = usesIndex ? '✓' : '⚠️ ';
    console.log(`   ${scanType} ${detail}`);
  });
});

console.log();
console.log('='.repeat(80));
console.log('RECOMMENDATIONS');
console.log('='.repeat(80));
console.log();

// Analyze missing indexes
const recommendations = [
  {
    table: 'departments',
    column: 'deleted_at',
    reason: 'Frequently filtered for soft delete checks'
  },
  {
    table: 'departments',
    column: 'parent_id',
    reason: 'Used for hierarchical queries'
  },
  {
    table: 'people',
    column: 'deleted_at',
    reason: 'Frequently filtered for soft delete checks'
  },
  {
    table: 'audit_logs',
    column: 'action_type',
    reason: 'Used for filtering logs by action type'
  },
  {
    table: 'invitations',
    columns: ['status', 'expires_at'],
    reason: 'Used together for finding active invitations'
  },
  {
    table: 'organizations',
    column: 'created_by_id',
    reason: 'Used for filtering organizations by creator'
  }
];

console.log('Potential indexes to add:');
console.log();

recommendations.forEach((rec, idx) => {
  if (rec.columns) {
    console.log(`${idx + 1}. CREATE INDEX idx_${rec.table}_${rec.columns.join('_')} ON ${rec.table}(${rec.columns.join(', ')});`);
  } else {
    console.log(`${idx + 1}. CREATE INDEX idx_${rec.table}_${rec.column} ON ${rec.table}(${rec.column});`);
  }
  console.log(`   Reason: ${rec.reason}`);
  console.log();
});

console.log('='.repeat(80));
console.log();

db.close();
