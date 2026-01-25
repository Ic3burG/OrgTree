/**
 * Check organization membership for debugging
 * Run with: npx tsx server/scripts/check-org-membership.ts
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.db');
const db = new Database(dbPath);

const orgId = '7614b3e4-ed69-489b-a76c-628d999a7a44';

console.log('\n=== Organization Details ===');
const org = db
  .prepare('SELECT id, name, created_by_id, is_public, created_at FROM organizations WHERE id = ?')
  .get(orgId) as any;

if (!org) {
  console.log('❌ Organization not found!');
  process.exit(1);
}

console.log('Organization:', org);

console.log('\n=== Organization Creator ===');
const creator = db
  .prepare('SELECT id, email, name, role FROM users WHERE id = ?')
  .get(org.created_by_id) as any;

console.log('Creator:', creator);

console.log('\n=== All Members in organization_members Table ===');
const members = db
  .prepare(
    `
  SELECT om.*, u.email, u.name, u.role as system_role
  FROM organization_members om
  JOIN users u ON om.user_id = u.id
  WHERE om.organization_id = ?
`
  )
  .all(orgId) as any[];

if (members.length === 0) {
  console.log('❌ NO MEMBERS FOUND in organization_members table!');
  console.log('   This is the problem - the creator was never added as a member.');
} else {
  console.log(`Found ${members.length} member(s):`);
  members.forEach((m) => {
    console.log(`  - ${m.email} (${m.name}) - Role: ${m.role}, System: ${m.system_role}`);
  });
}

console.log('\n=== Diagnosis ===');
const creatorIsMember = members.some((m) => m.user_id === org.created_by_id);

if (!creatorIsMember) {
  console.log('❌ ISSUE FOUND: Organization creator is NOT in organization_members table!');
  console.log(`   Creator: ${creator.email} (ID: ${creator.id})`);
  console.log(`   This user needs to be added with role "owner"`);
  console.log('\n   Fix: Run the migration script to add missing owners.');
} else {
  console.log('✅ Creator is properly registered as a member');
  const creatorMembership = members.find((m) => m.user_id === org.created_by_id);
  console.log(`   Role: ${creatorMembership?.role}`);
}

console.log('\n=== All Users in System ===');
const allUsers = db.prepare('SELECT id, email, name, role FROM users').all() as any[];
console.log(`Total users: ${allUsers.length}`);
allUsers.forEach((u) => {
  console.log(`  - ${u.email} (${u.name}) - System role: ${u.role}`);
});

db.close();
