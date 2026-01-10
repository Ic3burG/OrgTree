import db from '../db.js';
import { randomUUID } from 'crypto';
import { getUserOrganizations, requireOrgPermission } from './member.service.js';
import type { AppError } from '../types/index.js';

interface Department {
  id: string;
  organizationId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Person {
  id: string;
  departmentId: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface DepartmentWithPeople extends Department {
  people: Person[];
}

interface OrganizationResult {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  departments?: DepartmentWithPeople[];
  userRole?: 'owner' | 'admin' | 'editor' | 'viewer';
}

export async function getOrganizations(
  userId: string
): Promise<ReturnType<typeof getUserOrganizations>> {
  return getUserOrganizations(userId);
}

export async function getOrganizationById(id: string, userId: string): Promise<OrganizationResult> {
  // Check access (throws if no access) and get user's role
  const access = requireOrgPermission(id, userId, 'viewer');

  const org = db
    .prepare(
      `
    SELECT
      id, name,
      created_by_id as createdById,
      created_at as createdAt,
      updated_at as updatedAt
    FROM organizations
    WHERE id = ?
  `
    )
    .get(id) as OrganizationResult | undefined;

  if (!org) {
    const error = new Error('Organization not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Get departments for this organization
  const departments = db
    .prepare(
      `
    SELECT
      d.id,
      d.organization_id as organizationId,
      d.parent_id as parentId,
      d.name, d.description,
      d.sort_order as sortOrder,
      d.created_at as createdAt,
      d.updated_at as updatedAt
    FROM departments d
    WHERE d.organization_id = ?
    ORDER BY d.sort_order ASC
  `
    )
    .all(id) as Department[];

  // Get people for each department
  const departmentsWithPeople: DepartmentWithPeople[] = departments.map(dept => {
    const people = db
      .prepare(
        `
      SELECT
        id,
        department_id as departmentId,
        name, title, email, phone,
        sort_order as sortOrder,
        created_at as createdAt,
        updated_at as updatedAt
      FROM people
      WHERE department_id = ?
      ORDER BY sort_order ASC
    `
      )
      .all(dept.id) as Person[];

    return { ...dept, people };
  });

  org.departments = departmentsWithPeople;
  org.userRole = access.role ?? undefined; // Include user's role in response
  return org;
}

export async function createOrganization(
  name: string,
  userId: string
): Promise<OrganizationResult> {
  const orgId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO organizations (id, name, created_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(orgId, name, userId, now, now);

  return db
    .prepare(
      `
    SELECT
      id, name,
      created_by_id as createdById,
      created_at as createdAt,
      updated_at as updatedAt
    FROM organizations WHERE id = ?
  `
    )
    .get(orgId) as OrganizationResult;
}

export async function updateOrganization(
  id: string,
  name: string,
  userId: string
): Promise<OrganizationResult> {
  // Require admin permission
  requireOrgPermission(id, userId, 'admin');

  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE organizations
    SET name = ?, updated_at = ?
    WHERE id = ?
  `
  ).run(name, now, id);

  return db
    .prepare(
      `
    SELECT
      id, name,
      created_by_id as createdById,
      created_at as createdAt,
      updated_at as updatedAt
    FROM organizations WHERE id = ?
  `
    )
    .get(id) as OrganizationResult;
}

export async function deleteOrganization(
  id: string,
  userId: string
): Promise<{ success: boolean }> {
  // Only owner can delete
  const access = requireOrgPermission(id, userId, 'owner');

  if (!access.isOwner) {
    const error = new Error('Only the organization owner can delete it') as AppError;
    error.status = 403;
    throw error;
  }

  // Cascade delete handled by database foreign key constraints
  db.prepare('DELETE FROM organizations WHERE id = ?').run(id);

  return { success: true };
}
