import db from '../db.js';
import { randomUUID } from 'crypto';
import { requireOrgPermission } from './member.service.js';
import type { DatabaseDepartment, AppError } from '../types/index.js';

// Helper to verify org access with permission level
function verifyOrgAccess(
  orgId: string,
  userId: string,
  minRole: 'owner' | 'admin' | 'editor' | 'viewer' = 'viewer'
): void {
  requireOrgPermission(orgId, userId, minRole);
}

interface DepartmentWithPeople {
  id: string;
  organizationId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  people: Array<{
    id: string;
    departmentId: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export function getDepartments(orgId: string, userId: string): DepartmentWithPeople[] {
  verifyOrgAccess(orgId, userId, 'viewer');

  const departments = db
    .prepare(
      `
    SELECT
      id, organization_id as organizationId, parent_id as parentId,
      name, description, sort_order as sortOrder,
      created_at as createdAt, updated_at as updatedAt
    FROM departments
    WHERE organization_id = ? AND deleted_at IS NULL
    ORDER BY sort_order ASC
  `
    )
    .all(orgId) as Array<{
    id: string;
    organizationId: string;
    parentId: string | null;
    name: string;
    description: string | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;

  // Get people for each department
  const result = departments.map(dept => {
    const people = db
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
      .all(dept.id) as Array<{
      id: string;
      departmentId: string;
      name: string;
      title: string | null;
      email: string | null;
      phone: string | null;
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
    }>;

    return { ...dept, people };
  });

  return result;
}

export function getDepartmentById(
  orgId: string,
  deptId: string,
  userId: string
): DepartmentWithPeople {
  verifyOrgAccess(orgId, userId, 'viewer');

  const dept = db
    .prepare(
      `
    SELECT
      id, organization_id as organizationId, parent_id as parentId,
      name, description, sort_order as sortOrder,
      created_at as createdAt, updated_at as updatedAt
    FROM departments
    WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
  `
    )
    .get(deptId, orgId) as
    | {
        id: string;
        organizationId: string;
        parentId: string | null;
        name: string;
        description: string | null;
        sortOrder: number;
        createdAt: string;
        updatedAt: string;
      }
    | undefined;

  if (!dept) {
    const error = new Error('Department not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Get people
  const people = db
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
    .all(deptId) as Array<{
    id: string;
    departmentId: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;

  return { ...dept, people };
}

export function createDepartment(
  orgId: string,
  data: {
    name: string;
    description?: string;
    parentId?: string | null;
  },
  userId: string
): DepartmentWithPeople {
  verifyOrgAccess(orgId, userId, 'editor');

  const { name, description, parentId } = data;

  // Generate ID first for circular reference check
  const deptId = randomUUID();

  // Validate parentId if provided
  if (parentId) {
    const parentDept = db
      .prepare(
        'SELECT * FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL'
      )
      .get(parentId, orgId) as DatabaseDepartment | undefined;
    if (!parentDept) {
      const error = new Error('Parent department not found') as AppError;
      error.status = 400;
      throw error;
    }
    // Check for circular reference by traversing up from the new parent
    const isCircular = checkIsDescendant(parentId, deptId);
    if (isCircular) {
      const error = new Error('Cannot move a department under one of its own descendants') as AppError;
      error.status = 400;
      throw error;
    }
  }

  // Get max sortOrder for positioning
  const maxSortResult = db
    .prepare(
      `
    SELECT MAX(sort_order) as maxSort
    FROM departments
    WHERE organization_id = ? AND parent_id ${parentId ? '= ?' : 'IS NULL'} AND deleted_at IS NULL
  `
    )
    .get(parentId ? [orgId, parentId] : [orgId]) as { maxSort: number | null } | undefined;

  const sortOrder = (maxSortResult?.maxSort || 0) + 1;
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO departments (id, organization_id, parent_id, name, description, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(deptId, orgId, parentId || null, name, description || null, sortOrder, now, now);

  return getDepartmentById(orgId, deptId, userId);
}

export function updateDepartment(
  orgId: string,
  deptId: string,
  data: {
    name?: string;
    description?: string;
    parentId?: string | null;
  },
  userId: string
): DepartmentWithPeople {
  verifyOrgAccess(orgId, userId, 'editor');

  const dept = db
    .prepare(
      'SELECT * FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL'
    )
    .get(deptId, orgId) as DatabaseDepartment | undefined;

  if (!dept) {
    const error = new Error('Department not found') as AppError;
    error.status = 404;
    throw error;
  }

  const { name, description, parentId } = data;

  // Prevent self-reference
  if (parentId === deptId) {
    const error = new Error('Department cannot be its own parent') as AppError;
    error.status = 400;
    throw error;
  }

  // Validate parentId if provided
  if (parentId) {
    const parentDept = db
      .prepare(
        'SELECT * FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL'
      )
      .get(parentId, orgId) as DatabaseDepartment | undefined;
    if (!parentDept) {
      const error = new Error('Parent department not found') as AppError;
      error.status = 400;
      throw error;
    }
  }

  // Build update data - EXPLICITLY handle parentId
  const now = new Date().toISOString();

  // CRITICAL: Always update parentId when it's in the request
  // parentId can be a string (valid ID) or null (top level)
  let newParentId: string | null;
  if ('parentId' in data) {
    // parentId is in the data object, use it (could be string or null)
    newParentId = parentId === '' ? null : parentId || null;
  } else {
    // parentId not in data, keep existing
    newParentId = dept.parent_id;
  }

  db.prepare(
    `
    UPDATE departments
    SET
      name = ?,
      description = ?,
      parent_id = ?,
      updated_at = ?
    WHERE id = ?
  `
  ).run(
    name !== undefined ? name : dept.name,
    description !== undefined ? description : dept.description,
    newParentId,
    now,
    deptId
  );

  return getDepartmentById(orgId, deptId, userId);
}

export function deleteDepartment(
  orgId: string,
  deptId: string,
  userId: string
): { success: boolean } {
  verifyOrgAccess(orgId, userId, 'editor');

  const dept = db
    .prepare(
      'SELECT * FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL'
    )
    .get(deptId, orgId) as DatabaseDepartment | undefined;

  if (!dept) {
    const error = new Error('Department not found') as AppError;
    error.status = 404;
    throw error;
  }

  // Use a transaction to ensure atomicity
  const transaction = db.transaction(() => {
    const now = new Date().toISOString();

    // Find all child departments recursively
    const allDeptsToDelete: string[] = [deptId];
    let currentDeptIds: string[] = [deptId];

    while (currentDeptIds.length > 0) {
      const children = db
        .prepare(
          `
        SELECT id FROM departments
        WHERE parent_id IN (${currentDeptIds.map(() => '?').join(',')}) AND deleted_at IS NULL
      `
        )
        .all(currentDeptIds) as Array<{ id: string }>;

      const childIds = children.map(d => d.id);

      if (childIds.length > 0) {
        allDeptsToDelete.push(...childIds);
        currentDeptIds = childIds;
      } else {
        currentDeptIds = [];
      }
    }

    // Soft delete all affected departments
    db.prepare(
      `
      UPDATE departments
      SET deleted_at = ?, updated_at = ?
      WHERE id IN (${allDeptsToDelete.map(() => '?').join(',')})
    `
    ).run(now, now, ...allDeptsToDelete);

    // Soft delete all people in those departments
    db.prepare(
      `
      UPDATE people
      SET deleted_at = ?, updated_at = ?
      WHERE department_id IN (${allDeptsToDelete.map(() => '?').join(',')})
    `
    ).run(now, now, ...allDeptsToDelete);
  });

  transaction();

  return { success: true };
}

/**
 * Helper to check if potentialDescendant is an ancestor of deptId (circular reference check)
 */
function checkIsDescendant(potentialParentId: string, deptId: string): boolean {
  let currentId: string | null = potentialParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) return true; // Loop detected
    visited.add(currentId);

    if (currentId === deptId) return true; // Found circular reference

    const parent = db
      .prepare('SELECT parent_id FROM departments WHERE id = ? AND deleted_at IS NULL')
      .get(currentId) as { parent_id: string | null } | undefined;
    currentId = parent ? parent.parent_id : null;
  }

  return false;
}
