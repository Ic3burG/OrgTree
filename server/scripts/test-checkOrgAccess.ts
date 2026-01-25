/**
 * Test checkOrgAccess for a specific user and organization
 * This simulates exactly what happens when search is called
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle DATABASE_URL the same way as db.ts
let dbPath: string;
if (process.env.DATABASE_URL) {
  // Remove 'file:' prefix if present (used in production)
  dbPath = process.env.DATABASE_URL.replace(/^file:/, '');
} else {
  // Development fallback
  dbPath = path.join(__dirname, '../database.db');
}

const db = new Database(dbPath);

// CONFIGURATION: Change these to test different users
const TEST_ORG_ID = '7614b3e4-ed69-489b-a76c-628d999a7a44';
const TEST_USER_EMAIL = 'ojdavis@gmail.com'; // Change to test different user

console.log('\n=== TESTING checkOrgAccess() LOGIC ===\n');

// Get user ID from email
const user = db
  .prepare('SELECT id, email, name, role FROM users WHERE email = ?')
  .get(TEST_USER_EMAIL) as { id: string; email: string; name: string; role: string } | undefined;

if (!user) {
  console.log(`❌ User not found: ${TEST_USER_EMAIL}`);
  db.close();
  process.exit(1);
}

console.log(`Testing user: ${user.email}`);
console.log(`User ID: ${user.id}`);
console.log(`System role: ${user.role}\n`);

// Get organization info
const org = db
  .prepare('SELECT id, name, created_by_id, is_public FROM organizations WHERE id = ?')
  .get(TEST_ORG_ID) as
  | { id: string; name: string; created_by_id: string; is_public: number }
  | undefined;

if (!org) {
  console.log(`❌ Organization not found: ${TEST_ORG_ID}`);
  db.close();
  process.exit(1);
}

console.log(`Organization: "${org.name}"`);
console.log(`Org ID: ${org.id}`);
console.log(`Creator ID: ${org.created_by_id}`);
console.log(`Is Public: ${org.is_public === 1 ? 'Yes' : 'No'}\n`);

console.log('=== STEP-BY-STEP checkOrgAccess() SIMULATION ===\n');

// Step 1: Check superuser
console.log('Step 1: Check if user is superuser');
if (user.role === 'superuser') {
  console.log('✅ User IS superuser');
  console.log('   → Result: { hasAccess: true, role: "owner", isOwner: false }');
  console.log('   → Search will SUCCEED (superuser bypass)\n');
  db.close();
  process.exit(0);
} else {
  console.log(`❌ User is NOT superuser (role: ${user.role})`);
  console.log('   → Continuing to next check...\n');
}

// Step 2: Check if user is creator
console.log('Step 2: Check if user is the organization creator');
if (org.created_by_id === user.id) {
  console.log('✅ User IS the creator');
  console.log('   → Result: { hasAccess: true, role: "owner", isOwner: true }');
  console.log('   → Search will SUCCEED (creator bypass)\n');
  db.close();
  process.exit(0);
} else {
  console.log('❌ User is NOT the creator');
  console.log(`   Creator ID: ${org.created_by_id}`);
  console.log(`   User ID:    ${user.id}`);
  console.log('   → Continuing to next check...\n');
}

// Step 3: Check organization_members table
console.log('Step 3: Check organization_members table');
console.log(
  `SQL: SELECT role FROM organization_members WHERE organization_id = '${TEST_ORG_ID}' AND user_id = '${user.id}'\n`
);

const memberRecord = db
  .prepare('SELECT role FROM organization_members WHERE organization_id = ? AND user_id = ?')
  .get(TEST_ORG_ID, user.id) as { role: string } | undefined;

if (memberRecord) {
  console.log(`✅ User FOUND in organization_members with role: ${memberRecord.role}`);
  console.log(`   → Result: { hasAccess: true, role: "${memberRecord.role}", isOwner: false }`);
  console.log('   → Search will SUCCEED\n');
} else {
  console.log('❌ User NOT FOUND in organization_members table');
  console.log('   → Result: { hasAccess: false, role: null, isOwner: false }');
  console.log('   → Search will FAIL with 404 error\n');
}

console.log('=== FINAL RESULT ===\n');

if (memberRecord) {
  console.log(`✅ User ${user.email} SHOULD be able to search`);
  console.log('   If they CANNOT search, check:');
  console.log('   1. Is the frontend sending the correct organization ID?');
  console.log('   2. Is the frontend sending the correct auth token?');
  console.log('   3. Is there middleware blocking the request before it reaches search service?');
} else {
  console.log(`❌ User ${user.email} CANNOT search`);
  console.log('   REASON: Not in organization_members table');
  console.log(
    '   SOLUTION: Add them using the admin panel, or run migration if they are the creator'
  );
}

// Show all members for reference
console.log('\n=== ALL MEMBERS IN THIS ORGANIZATION ===\n');
const allMembers = db
  .prepare(
    `
  SELECT
    om.user_id,
    om.role as org_role,
    u.email,
    u.name,
    u.role as system_role
  FROM organization_members om
  JOIN users u ON om.user_id = u.id
  WHERE om.organization_id = ?
`
  )
  .all(TEST_ORG_ID) as Array<{
  user_id: string;
  org_role: string;
  email: string;
  name: string;
  system_role: string;
}>;

if (allMembers.length === 0) {
  console.log('⚠️  NO MEMBERS in organization_members (only superusers can search)');
} else {
  allMembers.forEach((m, index) => {
    console.log(`${index + 1}. ${m.email} (${m.name})`);
    console.log(`   Org Role: ${m.org_role}, System Role: ${m.system_role}`);
  });
}

db.close();
