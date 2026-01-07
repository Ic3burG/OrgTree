import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use in-memory database for tests
let testDb = null;

export function getTestDb() {
  if (!testDb) {
    testDb = new Database(':memory:');
    initializeTestDb(testDb);
  }
  return testDb;
}

export function resetTestDb() {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
  return getTestDb();
}

function initializeTestDb(db) {
  // Create tables matching the production schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      must_change_password INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      share_token TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      email TEXT,
      phone TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      actor_id TEXT,
      actor_name TEXT,
      actor_email TEXT,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      entity_name TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending',
      invited_by_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by_id) REFERENCES users(id)
    );
  `);
}

// Test data generators
export function generateId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export async function createTestUser(db, overrides = {}) {
  const id = overrides.id || generateId();
  const passwordHash = await bcrypt.hash(overrides.password || 'testpass123', 10);

  const user = {
    id,
    name: overrides.name || 'Test User',
    email: overrides.email || `test-${id}@example.com`,
    password_hash: passwordHash,
    role: overrides.role || 'user',
    must_change_password: overrides.mustChangePassword || 0
  };

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, user.name, user.email, user.password_hash, user.role, user.must_change_password);

  return { ...user, password: overrides.password || 'testpass123' };
}

export function createTestOrg(db, createdById, overrides = {}) {
  const id = overrides.id || generateId();

  const org = {
    id,
    name: overrides.name || 'Test Organization',
    created_by_id: createdById,
    is_public: overrides.isPublic || 0,
    share_token: overrides.shareToken || null
  };

  db.prepare(`
    INSERT INTO organizations (id, name, created_by_id, is_public, share_token)
    VALUES (?, ?, ?, ?, ?)
  `).run(org.id, org.name, org.created_by_id, org.is_public, org.share_token);

  return org;
}

export function createTestDepartment(db, orgId, overrides = {}) {
  const id = overrides.id || generateId();

  const dept = {
    id,
    organization_id: orgId,
    parent_id: overrides.parentId || null,
    name: overrides.name || 'Test Department',
    description: overrides.description || null,
    sort_order: overrides.sortOrder || 0
  };

  db.prepare(`
    INSERT INTO departments (id, organization_id, parent_id, name, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(dept.id, dept.organization_id, dept.parent_id, dept.name, dept.description, dept.sort_order);

  return dept;
}

export function createTestPerson(db, departmentId, overrides = {}) {
  const id = overrides.id || generateId();

  const person = {
    id,
    department_id: departmentId,
    name: overrides.name || 'Test Person',
    title: overrides.title || null,
    email: overrides.email || null,
    phone: overrides.phone || null,
    sort_order: overrides.sortOrder || 0
  };

  db.prepare(`
    INSERT INTO people (id, department_id, name, title, email, phone, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(person.id, person.department_id, person.name, person.title, person.email, person.phone, person.sort_order);

  return person;
}

export function addOrgMember(db, orgId, userId, role = 'viewer') {
  const id = generateId();

  db.prepare(`
    INSERT INTO organization_members (id, organization_id, user_id, role)
    VALUES (?, ?, ?, ?)
  `).run(id, orgId, userId, role);

  return { id, organization_id: orgId, user_id: userId, role };
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
}

// Clean specific tables
export function cleanTable(db, tableName) {
  db.prepare(`DELETE FROM ${tableName}`).run();
}

export function cleanAllTables(db) {
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM invitations;
    DELETE FROM people;
    DELETE FROM departments;
    DELETE FROM organization_members;
    DELETE FROM organizations;
    DELETE FROM users;
  `);
}
