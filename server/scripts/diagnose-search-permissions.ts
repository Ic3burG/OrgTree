/**
 * Diagnostic script to test search permissions for a specific org and user
 * Usage: npx tsx server/scripts/diagnose-search-permissions.ts <orgId> <userId>
 */

import db from '../src/db.js';

const orgId = process.argv[2];
const userId = process.argv[3];

if (!orgId || !userId) {
  console.error('Usage: npx tsx server/scripts/diagnose-search-permissions.ts <orgId> <userId>');
  process.exit(1);
}

console.log('🔍 Diagnosing search permissions...\n');
console.log(`Organization ID: ${orgId}`);
console.log(`User ID: ${userId}\n`);

// Check organization
const org = db
  .prepare('SELECT id, name, is_public, created_by_id FROM organizations WHERE id = ?')
  .get(orgId) as
  | { id: string; name: string; is_public: number; created_by_id: string }
  | undefined;

if (!org) {
  console.error('❌ Organization not found');
  process.exit(1);
}

console.log('📋 Organization:');
console.log(`  Name: ${org.name}`);
console.log(`  Public: ${org.is_public === 1 ? 'Yes' : 'No'}`);
console.log(`  Owner ID: ${org.created_by_id}\n`);

// Check user
const user = db
  .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
  .get(userId) as { id: string; name: string; email: string; role: string } | undefined;

if (!user) {
  console.error('❌ User not found');
  process.exit(1);
}

console.log('👤 User:');
console.log(`  Name: ${user.name}`);
console.log(`  Email: ${user.email}`);
console.log(`  System Role: ${user.role}`);
console.log(`  Is Owner: ${org.created_by_id === userId ? 'Yes' : 'No'}\n`);

// Check membership
const member = db
  .prepare(
    'SELECT role FROM organization_members WHERE organization_id = ? AND user_id = ?'
  )
  .get(orgId, userId) as { role: string } | undefined;

console.log('🔐 Membership:');
if (member) {
  console.log(`  Org Role: ${member.role}`);
} else if (org.created_by_id === userId) {
  console.log(`  Org Role: owner (implicit)`);
} else {
  console.log(`  ❌ Not a member`);
}
console.log();

// Check recent permission denied logs
const recentDenials = db
  .prepare(
    `
    SELECT
      datetime(created_at) as time,
      action_type,
      entity_type,
      entity_data
    FROM audit_logs
    WHERE organization_id = ?
      AND user_id = ?
      AND action_type = 'permission_denied'
    ORDER BY created_at DESC
    LIMIT 5
  `
  )
  .all(orgId, userId) as Array<{
  time: string;
  action_type: string;
  entity_type: string;
  entity_data: string;
}>;

console.log('📊 Recent Permission Denied Logs:');
if (recentDenials.length === 0) {
  console.log('  None found');
} else {
  recentDenials.forEach(log => {
    const data = JSON.parse(log.entity_data);
    console.log(`  ${log.time}:`);
    console.log(`    Required: ${data.requiredRole || data.requiredRoles?.join(' or ')}`);
    console.log(`    User Role: ${data.userRole || data.globalRole}`);
    console.log(`    Path: ${data.path || 'N/A'}`);
    console.log();
  });
}

// Determine expected behavior
console.log('✅ Expected Behavior:');
if (org.is_public === 1) {
  if (userId) {
    console.log('  ✓ Public org + authenticated user = Search should work (no membership check)');
  } else {
    console.log('  ✓ Public org + guest user = Search should work');
  }
} else {
  if (!member && org.created_by_id !== userId && user.role !== 'superuser') {
    console.log('  ❌ Private org + non-member = Search should FAIL');
  } else {
    console.log('  ✓ Private org + member/owner/superuser = Search should work');
  }
}
