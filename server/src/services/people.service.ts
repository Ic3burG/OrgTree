import db from '../db.js';
import { randomUUID } from 'crypto';
import { requireOrgPermission } from './member.service.js';
import type { DatabaseDepartment, DatabasePerson, AppError } from '../types/index.js';

interface DepartmentWithOrg extends DatabaseDepartment {
  organizationId: string;
}

// Helper to verify department access through org permissions
function verifyDeptAccess(
  deptId: string,
  userId: string,
  minRole: 'owner' | 'admin' | 'editor' | 'viewer' = 'viewer'
): DepartmentWithOrg {
  const dept = db
    .prepare(
      `
    SELECT d.*, d.organization_id as organizationId
    FROM departments d
    WHERE d.id = ? AND d.deleted_at IS NULL
  `
    )
    .get(deptId) as DepartmentWithOrg | undefined;

  if (!dept) {
    const error = new Error('Department not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Check org permission
  requireOrgPermission(dept.organizationId, userId, minRole);

  return dept;
}

interface PersonResponse {
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

export function getPeopleByDepartment(deptId: string, userId: string): PersonResponse[] {
  verifyDeptAccess(deptId, userId, 'viewer');

  return db
    .prepare(
      `
    SELECT
      id, department_id as departmentId, name, title, email, phone,
      sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
    FROM people
    WHERE department_id = ? AND deleted_at IS NULL
    ORDER BY sort_order ASC
  `
    )
    .all(deptId) as PersonResponse[];
}

interface PersonWithDepartment extends PersonResponse {
  department: {
    id: string;
    name: string;
    organizationId: string;
    organization: {
      id: string;
      name: string;
      createdById: string;
    };
  };
}

export function getPersonById(personId: string, userId: string): PersonWithDepartment {
  const person = db
    .prepare(
      `
    SELECT
      p.id, p.department_id as departmentId, p.name, p.title, p.email, p.phone,
      p.sort_order as sortOrder, p.created_at as createdAt, p.updated_at as updatedAt,
      d.name as departmentName, d.organization_id as organizationId,
      o.name as organizationName, o.created_by_id as orgCreatedBy
    FROM people p
    JOIN departments d ON p.department_id = d.id
    JOIN organizations o ON d.organization_id = o.id
    WHERE p.id = ? AND p.deleted_at IS NULL
  `
    )
    .get(personId) as
    | (PersonResponse & {
        departmentName: string;
        organizationId: string;
        organizationName: string;
        orgCreatedBy: string;
      })
    | undefined;

  if (!person) {
    const error = new Error('Person not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Check org permission
  requireOrgPermission(person.organizationId, userId, 'viewer');

  // Clean up the response to match expected format
  const { departmentName, organizationId, organizationName, orgCreatedBy, ...personData } = person;
  const result: PersonWithDepartment = {
    ...personData,
    department: {
      id: person.departmentId,
      name: departmentName,
      organizationId,
      organization: {
        id: organizationId,
        name: organizationName,
        createdById: orgCreatedBy,
      },
    },
  };

  return result;
}

export function createPerson(
  deptId: string,
  data: {
    name: string;
    title?: string;
    email?: string;
    phone?: string;
  },
  userId: string
): PersonResponse {
  verifyDeptAccess(deptId, userId, 'editor');

  const { name, title, email, phone } = data;

  // Get max sortOrder
  const maxSortResult = db
    .prepare(
      `
    SELECT MAX(sort_order) as maxSort
    FROM people
    WHERE department_id = ?
  `
    )
    .get(deptId) as { maxSort: number | null } | undefined;

  const sortOrder = (maxSortResult?.maxSort || 0) + 1;
  const personId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO people (id, department_id, name, title, email, phone, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(personId, deptId, name, title || null, email || null, phone || null, sortOrder, now, now);

  return db
    .prepare(
      `
    SELECT
      id, department_id as departmentId, name, title, email, phone,
      sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
    FROM people
    WHERE id = ?
  `
    )
    .get(personId) as PersonResponse;
}

export function updatePerson(
  personId: string,
  data: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    departmentId?: string;
  },
  userId: string
): PersonResponse {
  const person = getPersonById(personId, userId);

  const { name, title, email, phone, departmentId } = data;

  // If moving to new department, verify access to that department
  if (departmentId && departmentId !== person.departmentId) {
    verifyDeptAccess(departmentId, userId, 'editor');
  }

  const now = new Date().toISOString();

  // Get current person data
  const currentPerson = db
    .prepare('SELECT * FROM people WHERE id = ? AND deleted_at IS NULL')
    .get(personId) as DatabasePerson | undefined;
  if (!currentPerson) {
    const error = new Error('Person not found') as AppError;
    error.status = 404;
    throw error;
  }

  db.prepare(
    `
    UPDATE people
    SET
      name = ?,
      title = ?,
      email = ?,
      phone = ?,
      department_id = ?,
      updated_at = ?
    WHERE id = ?
  `
  ).run(
    name !== undefined ? name : currentPerson.name,
    title !== undefined ? title : currentPerson.title,
    email !== undefined ? email : currentPerson.email,
    phone !== undefined ? phone : currentPerson.phone,
    departmentId !== undefined ? departmentId : currentPerson.department_id,
    now,
    personId
  );

  return db
    .prepare(
      `
    SELECT
      id, department_id as departmentId, name, title, email, phone,
      sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
    FROM people
    WHERE id = ?
  `
    )
    .get(personId) as PersonResponse;
}

export function deletePerson(personId: string, userId: string): { success: boolean } {
  getPersonById(personId, userId); // Verifies access and that person exists

  const now = new Date().toISOString();
  db.prepare(
    `
    UPDATE people
    SET deleted_at = ?, updated_at = ?
    WHERE id = ?
  `
  ).run(now, now, personId);

  return { success: true };
}

export function movePerson(personId: string, newDeptId: string, userId: string): PersonResponse {
  return updatePerson(personId, { departmentId: newDeptId }, userId);
}
