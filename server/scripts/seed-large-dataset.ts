import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let dbPath = join(__dirname, '..', 'database.db');
if (process.env.DATABASE_URL) {
  dbPath = process.env.DATABASE_URL.replace(/^file:/, '');
}
const db = new Database(dbPath);

console.log('='.repeat(80));
console.log('🌱 SEEDING LARGE DATASET');
console.log('='.repeat(80));

const _TARGET_PEOPLE = 5000; // Reserved for future use
const DEPT_DEPTH = 5;
const MAX_CHILDREN_PER_DEPT = 6;
const PEOPLE_PER_DEPT_MIN = 20;
const PEOPLE_PER_DEPT_MAX = 80;

// Helper to get random int
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Transaction for speed
const seed = db.transaction(() => {
  // 1. Create Organization
  const orgId = randomUUID();
  console.log(`Creating Organization: Performance Corp (${orgId})`);

  // Note: 'created_by_id' assumes there is a user with id 'system-seed' or we should create one.
  // Since foreign keys are ON, valid user is needed.
  // Let's create a dummy user first to be safe

  const userId = 'system-seed';
  try {
    db.prepare(
      `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(userId, 'seed@example.com', 'hash', 'Seed User', 'admin');
  } catch {
    // ignore - user may already exist
  }

  db.prepare(
    `
    INSERT INTO organizations (id, name, created_at, updated_at, created_by_id)
    VALUES (?, ?, datetime('now'), datetime('now'), ?)
  `
  ).run(orgId, 'Performance Corp', userId);

  // Add user as member/owner of the org
  db.prepare(
    `
    INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id, created_at, updated_at)
    VALUES (?, ?, ?, 'owner', ?, datetime('now'), datetime('now'))
  `
  ).run(randomUUID(), orgId, userId, userId);

  // 2. Create Departments
  console.log('Generating Departments...');
  let deptCount = 0;
  let peopleCount = 0;

  const insertDept = db.prepare(`
    INSERT INTO departments (id, organization_id, parent_id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertPerson = db.prepare(`
    INSERT INTO people (id, department_id, name, title, email, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  function createDepts(parentId: string | null, currentDepth: number) {
    if (currentDepth > DEPT_DEPTH) return;

    const numChildren = currentDepth === 0 ? 1 : getRandomInt(1, MAX_CHILDREN_PER_DEPT);

    for (let i = 0; i < numChildren; i++) {
      // Stop if we have "enough" but we want a deep tree, so maybe just let it run naturally
      // until depth is hit.

      const deptId = randomUUID();
      const deptName = `Dept ${currentDepth}-${i}-${randomUUID().substring(0, 4)}`;

      insertDept.run(deptId, orgId, parentId, deptName);
      deptCount++;

      // Add People to this department
      const numPeople = getRandomInt(PEOPLE_PER_DEPT_MIN, PEOPLE_PER_DEPT_MAX);
      for (let p = 0; p < numPeople; p++) {
        const personId = randomUUID();
        const firstName = `User${peopleCount}`;
        const lastName = `Test${randomUUID().substring(0, 4)}`;

        insertPerson.run(
          personId,
          deptId,
          `${firstName} ${lastName}`,
          `Job Title ${getRandomInt(1, 100)}`,
          `${firstName}.${lastName}@example.com`,
          `555-01${getRandomInt(10, 99)}`
        );
        peopleCount++;
      }

      // Recurse
      createDepts(deptId, currentDepth + 1);
    }
  }

  // Start recursion
  createDepts(null, 0);

  return { deptCount, peopleCount, orgId };
});

try {
  const start = performance.now();
  const result = seed();
  const end = performance.now();

  console.log('✅ Seeding Complete!');
  console.log(`⏱️  Time taken: ${((end - start) / 1000).toFixed(2)}s`);
  console.log(`   Organization ID: ${result.orgId}`);
  console.log(`   Departments: ${result.deptCount}`);
  console.log(`   People: ${result.peopleCount}`);
} catch (err) {
  console.error('❌ Seeding Failed:', err);
} finally {
  db.close();
}
