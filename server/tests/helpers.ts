import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Use in-memory database for tests
let testDb: DatabaseType | null = null;

export function getTestDb(): DatabaseType {
  if (!testDb) {
    testDb = new Database(':memory:');
    initializeTestDb(testDb);
  }
  return testDb;
}

export function resetTestDb(): DatabaseType {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
  return getTestDb();
}

function initializeTestDb(db: DatabaseType): void {
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
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

interface UserOverrides {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: 'user' | 'admin' | 'superuser';
  mustChangePassword?: number;
}

interface TestUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin' | 'superuser';
  must_change_password: number;
  password: string;
}

export async function createTestUser(
  db: DatabaseType,
  overrides: UserOverrides = {}
): Promise<TestUser> {
  const id = overrides.id || generateId();
  const passwordHash = await bcrypt.hash(overrides.password || 'testpass123', 10);

  const user = {
    id,
    name: overrides.name || 'Test User',
    email: overrides.email || `test-${id}@example.com`,
    password_hash: passwordHash,
    role: overrides.role || ('user' as const),
    must_change_password: overrides.mustChangePassword || 0,
  };

  db.prepare(
    `
    INSERT INTO users (id, name, email, password_hash, role, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(user.id, user.name, user.email, user.password_hash, user.role, user.must_change_password);

  return { ...user, password: overrides.password || 'testpass123' };
}

interface OrgOverrides {
  id?: string;
  name?: string;
  isPublic?: number;
  shareToken?: string | null;
}

interface TestOrg {
  id: string;
  name: string;
  created_by_id: string;
  is_public: number;
  share_token: string | null;
}

export function createTestOrg(
  db: DatabaseType,
  createdById: string,
  overrides: OrgOverrides = {}
): TestOrg {
  const id = overrides.id || generateId();

  const org = {
    id,
    name: overrides.name || 'Test Organization',
    created_by_id: createdById,
    is_public: overrides.isPublic || 0,
    share_token: overrides.shareToken || null,
  };

  db.prepare(
    `
    INSERT INTO organizations (id, name, created_by_id, is_public, share_token)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(org.id, org.name, org.created_by_id, org.is_public, org.share_token);

  return org;
}

interface DepartmentOverrides {
  id?: string;
  parentId?: string | null;
  name?: string;
  description?: string | null;
  sortOrder?: number;
}

interface TestDepartment {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  sort_order: number;
}

export function createTestDepartment(
  db: DatabaseType,
  orgId: string,
  overrides: DepartmentOverrides = {}
): TestDepartment {
  const id = overrides.id || generateId();

  const dept = {
    id,
    organization_id: orgId,
    parent_id: overrides.parentId || null,
    name: overrides.name || 'Test Department',
    description: overrides.description || null,
    sort_order: overrides.sortOrder || 0,
  };

  db.prepare(
    `
    INSERT INTO departments (id, organization_id, parent_id, name, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(
    dept.id,
    dept.organization_id,
    dept.parent_id,
    dept.name,
    dept.description,
    dept.sort_order
  );

  return dept;
}

interface PersonOverrides {
  id?: string;
  name?: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  sortOrder?: number;
}

interface TestPerson {
  id: string;
  department_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
}

export function createTestPerson(
  db: DatabaseType,
  departmentId: string,
  overrides: PersonOverrides = {}
): TestPerson {
  const id = overrides.id || generateId();

  const person = {
    id,
    department_id: departmentId,
    name: overrides.name || 'Test Person',
    title: overrides.title || null,
    email: overrides.email || null,
    phone: overrides.phone || null,
    sort_order: overrides.sortOrder || 0,
  };

  db.prepare(
    `
    INSERT INTO people (id, department_id, name, title, email, phone, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    person.id,
    person.department_id,
    person.name,
    person.title,
    person.email,
    person.phone,
    person.sort_order
  );

  return person;
}

interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
}

export function addOrgMember(
  db: DatabaseType,
  orgId: string,
  userId: string,
  role: string = 'viewer'
): OrgMember {
  const id = generateId();

  db.prepare(
    `
    INSERT INTO organization_members (id, organization_id, user_id, role)
    VALUES (?, ?, ?, ?)
  `
  ).run(id, orgId, userId, role);

  return { id, organization_id: orgId, user_id: userId, role };
}

interface TokenUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'superuser';
}

export function generateToken(user: TokenUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
}

// Clean specific tables
export function cleanTable(db: DatabaseType, tableName: string): void {
  db.prepare(`DELETE FROM ${tableName}`).run();
}

export function cleanAllTables(db: DatabaseType): void {
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
