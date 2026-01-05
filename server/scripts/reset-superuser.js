#!/usr/bin/env node
/**
 * Superuser Password Reset Script
 *
 * Usage: node scripts/reset-superuser.js <email>
 *
 * This script:
 * 1. Finds the user by email
 * 2. Verifies they are a superuser (or promotes them if --promote flag used)
 * 3. Generates a secure temporary password
 * 4. Updates their password hash
 * 5. Sets must_change_password flag
 * 6. Outputs the temporary password
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database path
let dbPath;
if (process.env.DATABASE_URL) {
  dbPath = process.env.DATABASE_URL.replace(/^file:/, '');
} else {
  dbPath = join(__dirname, '..', 'database.db');
}

// Parse arguments
const args = process.argv.slice(2);
const email = args.find(arg => !arg.startsWith('--'));
const shouldPromote = args.includes('--promote');
const shouldList = args.includes('--list');

// Help text
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Superuser Password Reset Script

Usage:
  node scripts/reset-superuser.js <email>           Reset password for superuser
  node scripts/reset-superuser.js <email> --promote Reset password and promote to superuser
  node scripts/reset-superuser.js --list            List all superusers

Options:
  --promote    Promote user to superuser role before resetting password
  --list       List all users with superuser role
  --help, -h   Show this help message

Examples:
  node scripts/reset-superuser.js admin@example.com
  node scripts/reset-superuser.js user@example.com --promote
  node scripts/reset-superuser.js --list
`);
  process.exit(0);
}

// Connect to database
let db;
try {
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  console.log(`\n📁 Database: ${dbPath}\n`);
} catch (err) {
  console.error(`❌ Failed to open database: ${err.message}`);
  console.error(`   Path: ${dbPath}`);
  process.exit(1);
}

// List superusers
if (shouldList) {
  const superusers = db
    .prepare(
      `
    SELECT id, name, email, role, created_at, must_change_password
    FROM users
    WHERE role = 'superuser'
    ORDER BY created_at
  `
    )
    .all();

  if (superusers.length === 0) {
    console.log('⚠️  No superusers found in database!\n');

    // Show all users instead
    const allUsers = db
      .prepare(
        `
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY created_at
    `
      )
      .all();

    if (allUsers.length === 0) {
      console.log('   Database has no users at all.\n');
    } else {
      console.log('   Available users:');
      allUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.role})`);
      });
      console.log('\n   Use --promote flag to promote a user to superuser.\n');
    }
  } else {
    console.log(`👑 Superusers (${superusers.length}):\n`);
    superusers.forEach(u => {
      const needsChange = u.must_change_password ? ' [needs password change]' : '';
      console.log(`   ${u.name}`);
      console.log(`   📧 ${u.email}${needsChange}`);
      console.log(`   📅 Created: ${new Date(u.created_at).toLocaleDateString()}`);
      console.log('');
    });
  }

  db.close();
  process.exit(0);
}

// Validate email argument
if (!email) {
  console.error('❌ Email address required\n');
  console.error('Usage: node scripts/reset-superuser.js <email>');
  console.error('       node scripts/reset-superuser.js --list');
  console.error('       node scripts/reset-superuser.js --help\n');
  db.close();
  process.exit(1);
}

// Find user
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

if (!user) {
  console.error(`❌ User not found: ${email}\n`);

  // Suggest similar emails
  const allUsers = db.prepare('SELECT email FROM users').all();
  if (allUsers.length > 0) {
    console.log('   Available users:');
    allUsers.forEach(u => console.log(`   - ${u.email}`));
  }

  db.close();
  process.exit(1);
}

console.log(`✅ Found user: ${user.name} (${user.email})`);
console.log(`   Current role: ${user.role}`);

// Check/update role
if (user.role !== 'superuser') {
  if (shouldPromote) {
    console.log(`\n🔄 Promoting ${user.email} to superuser...`);
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('superuser', user.id);
    console.log('✅ User promoted to superuser');
  } else {
    console.error(`\n❌ User is not a superuser (current role: ${user.role})`);
    console.error('   Use --promote flag to promote them first:\n');
    console.error(`   node scripts/reset-superuser.js ${email} --promote\n`);
    db.close();
    process.exit(1);
  }
}

// Generate temporary password
const tempPassword = randomBytes(9)
  .toString('base64')
  .replace(/[^a-zA-Z0-9]/g, '')
  .slice(0, 12);

// Hash password
console.log('\n🔐 Generating new password...');
const passwordHash = await bcrypt.hash(tempPassword, 10);

// Update user
const now = new Date().toISOString();
const result = db
  .prepare(
    `
  UPDATE users
  SET password_hash = ?, must_change_password = 1, updated_at = ?
  WHERE id = ?
`
  )
  .run(passwordHash, now, user.id);

if (result.changes === 0) {
  console.error('❌ Failed to update password');
  db.close();
  process.exit(1);
}

console.log('✅ Password reset successfully!\n');
console.log('━'.repeat(50));
console.log('');
console.log('   📧 Email:              ' + user.email);
console.log('   🔑 Temporary Password: ' + tempPassword);
console.log('');
console.log('━'.repeat(50));
console.log('');
console.log('⚠️  User will be required to change password on next login.');
console.log('');

db.close();
