/**
 * Diagnose why non-creator members cannot search
 * Checks organization_members table for all users in a specific organization
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.db');
const db = new Database(dbPath);

const orgId = '7614b3e4-ed69-489b-a76c-628d999a7a44';

console.log('\n=== DIAGNOSING ORGANIZATION MEMBER SEARCH PERMISSIONS ===\n');
console.log(`Organization ID: ${orgId}\n`);

// Get organization info
const org = db
  .prepare('SELECT id, name, created_by_id FROM organizations WHERE id = ?')
  .get(orgId) as { id: string; name: string; created_by_id: string } | undefined;

if (!org) {
  console.log('❌ Organization not found!');
  db.close();
  process.exit(1);
}

console.log(`Organization: "${org.name}"`);
console.log(`Creator ID: ${org.created_by_id}\n`);

// Get creator info
const creator = db
  .prepare('SELECT id, email, name, role FROM users WHERE id = ?')
  .get(org.created_by_id) as { id: string; email: string; name: string; role: string } | undefined;

if (creator) {
  console.log(`Creator: ${creator.email} (${creator.name})`);
  console.log(`Creator System Role: ${creator.role}\n`);
}

// Get all members in organization_members table
const members = db
  .prepare(
    `
  SELECT
    om.id as member_id,
    om.user_id,
    om.role as org_role,
    om.added_by_id,
    om.created_at,
    u.email,
    u.name,
    u.role as system_role
  FROM organization_members om
  JOIN users u ON om.user_id = u.id
  WHERE om.organization_id = ?
  ORDER BY om.created_at ASC
`
  )
  .all(orgId) as Array<{
  member_id: string;
  user_id: string;
  org_role: string;
  added_by_id: string;
  created_at: string;
  email: string;
  name: string;
  system_role: string;
}>;

console.log(`=== MEMBERS IN organization_members TABLE: ${members.length} ===\n`);

if (members.length === 0) {
  console.log('⚠️  NO MEMBERS FOUND in organization_members table!');
  console.log('This means ONLY superusers can search (they bypass permission checks).\n');
  console.log('DIAGNOSIS: Migration needs to run to add missing creator.\n');
} else {
  members.forEach((member, index) => {
    const isCreator = member.user_id === org.created_by_id;
    const canSearchViaTable = true; // If in table, should be able to search
    const canSearchViaSuperuser = member.system_role === 'superuser';
    const canSearchViaCreator = isCreator; // Creators have bypass in checkOrgAccess

    console.log(`${index + 1}. ${member.email} (${member.name})`);
    console.log(`   User ID: ${member.user_id}`);
    console.log(`   Org Role: ${member.org_role}`);
    console.log(`   System Role: ${member.system_role}`);
    console.log(`   Added: ${member.created_at}`);
    console.log(`   ${isCreator ? '👑 CREATOR' : '👥 MEMBER'}`);
    console.log(
      `   Can search? ${canSearchViaTable || canSearchViaSuperuser || canSearchViaCreator ? '✅ YES' : '❌ NO'}`
    );
    if (canSearchViaSuperuser) console.log(`      → Via superuser bypass`);
    if (canSearchViaCreator) console.log(`      → Via creator bypass (checkOrgAccess line 76-79)`);
    if (canSearchViaTable && !canSearchViaCreator && !canSearchViaSuperuser)
      console.log(`      → Via organization_members table`);
    console.log();
  });
}

// Check if creator is in the table
const creatorInTable = members.some(m => m.user_id === org.created_by_id);

console.log(`\n=== SUMMARY ===`);
console.log(
  `Creator in organization_members? ${creatorInTable ? '✅ Yes' : '❌ No (RUN MIGRATION!)'}`
);
console.log(`Total members in table: ${members.length}`);

// Check for users who should be able to search but are reported as unable
console.log(`\n=== EXPECTED SEARCH BEHAVIOR ===`);
console.log(
  `All ${members.length} users listed above should be able to search (they're in organization_members).`
);
console.log(
  `If a non-creator, non-superuser CANNOT search despite being in this list, there's a bug in checkOrgAccess().`
);

// Now let's simulate what checkOrgAccess returns for each member
console.log(`\n=== SIMULATING checkOrgAccess() FOR EACH MEMBER ===\n`);

for (const member of members) {
  console.log(`User: ${member.email}`);

  // Simulate checkOrgAccess logic
  let access = { hasAccess: false, role: null, isOwner: false };
  let reason = '';

  // Check 1: Superuser bypass
  if (member.system_role === 'superuser') {
    access = { hasAccess: true, role: 'owner' as any, isOwner: false };
    reason = 'Superuser bypass (line 61-64)';
  }
  // Check 2: Creator bypass
  else if (member.user_id === org.created_by_id) {
    access = { hasAccess: true, role: 'owner' as any, isOwner: true };
    reason = 'Creator bypass (line 76-79)';
  }
  // Check 3: Check organization_members table
  else {
    const memberRecord = db
      .prepare('SELECT role FROM organization_members WHERE organization_id = ? AND user_id = ?')
      .get(orgId, member.user_id) as { role: string } | undefined;

    if (memberRecord) {
      access = { hasAccess: true, role: memberRecord.role as any, isOwner: false };
      reason = `Found in organization_members with role '${memberRecord.role}' (line 82-98)`;
    } else {
      access = { hasAccess: false, role: null, isOwner: false };
      reason = 'NOT found in organization_members (line 91-98)';
    }
  }

  console.log(`   Access: ${access.hasAccess ? '✅ GRANTED' : '❌ DENIED'}`);
  console.log(`   Role: ${access.role || 'none'}`);
  console.log(`   Reason: ${reason}\n`);
}

console.log(`\n=== CONCLUSION ===`);
if (members.length === 0) {
  console.log('❌ PROBLEM: No members in organization_members table.');
  console.log('   SOLUTION: Run /api/migrations/fix-org-owners-simple as superuser.');
} else {
  console.log(
    '✅ All users listed above should be able to search (they pass checkOrgAccess checks).'
  );
  console.log('   If they CANNOT search, check:');
  console.log('   1. Are they actually in organization_members? (verified above)');
  console.log(
    '   2. Is there a different organization ID being checked? (frontend sending wrong orgId?)'
  );
  console.log('   3. Is there a bug in the search route authentication?');
  console.log('\n   Next step: Check the actual 403 error response to see which check is failing.');
}

db.close();
