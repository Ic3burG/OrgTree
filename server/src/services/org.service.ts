import db from '../db.js';
import { randomUUID } from 'crypto';
import { getUserOrganizations, requireOrgPermission } from './member.service.js';
import type { AppError } from '../types/index.js';

// CRITICAL: These interfaces MUST use snake_case to match database schema and frontend types
// Frontend OrgMap.tsx checks dept.parent_id to create edges - DO NOT change to camelCase
interface Department {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Person {
  id: string;
  department_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface DepartmentWithPeople extends Department {
  people: Person[];
}

// CRITICAL: Use snake_case to match frontend Organization interface
interface OrganizationResult {
  id: string;
  name: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  departments?: DepartmentWithPeople[];
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
}

export async function getOrganizations(
  userId: string
): Promise<ReturnType<typeof getUserOrganizations>> {
  return getUserOrganizations(userId);
}

export async function getOrganizationById(id: string, userId: string): Promise<OrganizationResult> {
  // Check access (throws if no access) and get user's role
  const access = requireOrgPermission(id, userId, 'viewer');

  // CRITICAL: Return snake_case field names to match frontend Organization interface
  const org = db
    .prepare(
      `
    SELECT
      id, name,
      created_by_id,
      created_at,
      updated_at
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

  // Get departments for this organization (exclude soft-deleted)
  // CRITICAL: Return snake_case field names to match frontend Department interface
  // Frontend OrgMap.tsx depends on parent_id for rendering edges between departments
  const departments = db
    .prepare(
      `
    SELECT
      d.id,
      d.organization_id,
      d.parent_id,
      d.name, d.description,
      d.sort_order,
      d.created_at,
      d.updated_at
    FROM departments d
    WHERE d.organization_id = ? AND d.deleted_at IS NULL
    ORDER BY d.sort_order ASC
  `
    )
    .all(id) as Department[];

  // Get all custom field values for this organization
  const customValues = db
    .prepare(
      `
    SELECT cv.entity_id, cd.field_key, cv.value
    FROM custom_field_values cv
    JOIN custom_field_definitions cd ON cv.field_definition_id = cd.id
    WHERE cd.organization_id = ?
  `
    )
    .all(id) as { entity_id: string; field_key: string; value: string }[];

  // Group custom field values by entity_id
  const valuesByEntity: Record<string, Record<string, string>> = {};
  customValues.forEach(v => {
    if (!valuesByEntity[v.entity_id]) {
      valuesByEntity[v.entity_id] = {};
    }
    valuesByEntity[v.entity_id]![v.field_key] = v.value;
  });

  // Get people for each department (exclude soft-deleted)
  // CRITICAL: Return snake_case field names to match frontend Person interface
  const departmentsWithPeople: DepartmentWithPeople[] = departments.map(dept => {
    const people = db
      .prepare(
        `
      SELECT
        id,
        department_id,
        name, title, email, phone,
        sort_order,
        created_at,
        updated_at
      FROM people
      WHERE department_id = ? AND deleted_at IS NULL
      ORDER BY sort_order ASC
    `
      )
      .all(dept.id) as Person[];

    // Add custom_fields to each person
    const peopleWithCustomFields = people.map(person => ({
      ...person,
      custom_fields: valuesByEntity[person.id] || {},
    }));

    return {
      ...dept,
      people: peopleWithCustomFields,
      custom_fields: valuesByEntity[dept.id] || {},
    };
  });

  org.departments = departmentsWithPeople;
  org.role = access.role ?? undefined; // Include user's role in response
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
      created_by_id,
      created_at,
      updated_at
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
      created_by_id,
      created_at,
      updated_at
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
