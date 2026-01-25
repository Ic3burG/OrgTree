/**
 * Fix missing organization owners in organization_members table
 *
 * This script finds all organizations where the creator (created_by_id) is NOT
 * in the organization_members table and adds them with role 'owner'.
 *
 * Run with: npx tsx server/scripts/fix-missing-org-owners.ts
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.db');
const db = new Database(dbPath);

interface OrgResult {
  id: string;
  name: string;
  created_by_id: string;
}

interface UserResult {
  id: string;
  email: string;
  name: string;
}

console.log('\n=== Scanning for Missing Organization Owners ===\n');

// Get all organizations
const orgs = db.prepare('SELECT id, name, created_by_id FROM organizations').all() as OrgResult[];

console.log(`Found ${orgs.length} organization(s)\n`);

const missingOwners: Array<{ org: OrgResult; user: UserResult }> = [];

// Check each organization
for (const org of orgs) {
  // Check if creator is in organization_members
  const membership = db
    .prepare('SELECT * FROM organization_members WHERE organization_id = ? AND user_id = ?')
    .get(org.id, org.created_by_id);

  if (!membership) {
    // Get user details
    const user = db
      .prepare('SELECT id, email, name FROM users WHERE id = ?')
      .get(org.created_by_id) as UserResult | undefined;

    if (user) {
      console.log(`❌ Missing owner for org "${org.name}":`);
      console.log(`   Creator: ${user.email} (${user.name})`);
      console.log(`   Org ID: ${org.id}`);
      console.log(`   User ID: ${user.id}\n`);
      missingOwners.push({ org, user });
    } else {
      console.log(`⚠️  Org "${org.name}" has invalid created_by_id: ${org.created_by_id}\n`);
    }
  } else {
    console.log(`✅ Org "${org.name}" - owner properly registered`);
  }
}

if (missingOwners.length === 0) {
  console.log('\n✅ All organizations have their creators registered as members!');
  db.close();
  process.exit(0);
}

console.log(`\n=== Found ${missingOwners.length} organization(s) with missing owners ===\n`);
console.log('Fixing...\n');

// Fix each missing owner
const insertStmt = db.prepare(`
  INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
  VALUES (?, ?, ?, 'owner', datetime('now'))
`);

for (const { org, user } of missingOwners) {
  const id = randomUUID();
  try {
    insertStmt.run(id, org.id, user.id);
    console.log(`✅ Added ${user.email} as owner of "${org.name}"`);
  } catch (error) {
    console.log(`❌ Failed to add ${user.email} to "${org.name}":`, error);
  }
}

console.log(`\n=== Fix Complete ===`);
console.log(`Added ${missingOwners.length} missing owner(s) to organization_members table\n`);

db.close();
