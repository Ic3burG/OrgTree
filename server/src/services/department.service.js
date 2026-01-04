import db from '../db.js';
import { randomUUID } from 'crypto';
import { requireOrgPermission } from './member.service.js';

// Helper to verify org access with permission level
async function verifyOrgAccess(orgId, userId, minRole = 'viewer') {
  return requireOrgPermission(orgId, userId, minRole);
}

export async function getDepartments(orgId, userId) {
  await verifyOrgAccess(orgId, userId, 'viewer');

  const departments = db.prepare(`
    SELECT
      id, organization_id as organizationId, parent_id as parentId,
      name, description, sort_order as sortOrder,
      created_at as createdAt, updated_at as updatedAt
    FROM departments
    WHERE organization_id = ? AND deleted_at IS NULL
    ORDER BY sort_order ASC
  `).all(orgId);

  // Get people for each department
  const result = departments.map(dept => {
    const people = db.prepare(`
      SELECT
        id, department_id as departmentId, name, title, email, phone,
        sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
      FROM people
      WHERE department_id = ? AND deleted_at IS NULL
      ORDER BY sort_order ASC
    `).all(dept.id);

    return { ...dept, people };
  });

  return result;
}

export async function getDepartmentById(orgId, deptId, userId) {
  await verifyOrgAccess(orgId, userId, 'viewer');

  const dept = db.prepare(`
    SELECT
      id, organization_id as organizationId, parent_id as parentId,
      name, description, sort_order as sortOrder,
      created_at as createdAt, updated_at as updatedAt
    FROM departments
    WHERE id = ? AND organization_id = ? AND deleted_at IS NULL
  `).get(deptId, orgId);

  if (!dept) {
    const error = new Error('Department not found');
    error.status = 404;
    throw error;
  }

  // Get people
  const people = db.prepare(`
    SELECT
      id, department_id as departmentId, name, title, email, phone,
      sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
    FROM people
    WHERE department_id = ? AND deleted_at IS NULL
    ORDER BY sort_order ASC
  `).all(deptId);

  return { ...dept, people };
}

export async function createDepartment(orgId, data, userId) {
  await verifyOrgAccess(orgId, userId, 'editor');

  const { name, description, parentId } = data;

  // Validate parentId if provided
  if (parentId) {
    const parentDept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL').get(parentId, orgId);
    if (!parentDept) {
      const error = new Error('Parent department not found');
      error.status = 400;
      throw error;
    }
    // Check for circular reference by traversing up from the new parent
    const isCircular = checkIsDescendant(parentId, deptId);
    if (isCircular) {
      const error = new Error('Cannot move a department under one of its own descendants');
      error.status = 400;
      throw error;
    }
  }

  // Get max sortOrder for positioning
  const maxSortResult = db.prepare(`
    SELECT MAX(sort_order) as maxSort
    FROM departments
    WHERE organization_id = ? AND parent_id ${parentId ? '= ?' : 'IS NULL'} AND deleted_at IS NULL
  `).get(parentId ? [orgId, parentId] : [orgId]);

  const sortOrder = (maxSortResult.maxSort || 0) + 1;
  const deptId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO departments (id, organization_id, parent_id, name, description, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(deptId, orgId, parentId || null, name, description || null, sortOrder, now, now);

  return await getDepartmentById(orgId, deptId, userId);
}

export async function updateDepartment(orgId, deptId, data, userId) {
  await verifyOrgAccess(orgId, userId, 'editor');

  const dept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL').get(deptId, orgId);

  if (!dept) {
    const error = new Error('Department not found');
    error.status = 404;
    throw error;
  }

  const { name, description, parentId } = data;

  // Prevent self-reference
  if (parentId === deptId) {
    const error = new Error('Department cannot be its own parent');
    error.status = 400;
    throw error;
  }

  // Validate parentId if provided
  if (parentId) {
    const parentDept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL').get(parentId, orgId);
    if (!parentDept) {
      const error = new Error('Parent department not found');
      error.status = 400;
      throw error;
    }
  }

  // Build update data - EXPLICITLY handle parentId
  const now = new Date().toISOString();

  // CRITICAL: Always update parentId when it's in the request
  // parentId can be a string (valid ID) or null (top level)
  let newParentId;
  if ('parentId' in data) {
    // parentId is in the data object, use it (could be string or null)
    newParentId = parentId === '' ? null : (parentId || null);
  } else {
    // parentId not in data, keep existing
    newParentId = dept.parent_id;
  }

  db.prepare(`
    UPDATE departments
    SET
      name = ?,
      description = ?,
      parent_id = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name : dept.name,
    description !== undefined ? description : dept.description,
    newParentId,
    now,
    deptId
  );

  return await getDepartmentById(orgId, deptId, userId);
}

export async function deleteDepartment(orgId, deptId, userId) {
  await verifyOrgAccess(orgId, userId, 'editor');

  const dept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL').get(deptId, orgId);

  if (!dept) {
    const error = new Error('Department not found');
    error.status = 404;
    throw error;
  }

  // Use a transaction to ensure atomicity
  const transaction = db.transaction(() => {
    const now = new Date().toISOString();

    // Find all child departments recursively
    const allDeptsToDelete = [deptId];
    let currentDeptIds = [deptId];

    while (currentDeptIds.length > 0) {
      const children = db.prepare(`
        SELECT id FROM departments
        WHERE parent_id IN (${currentDeptIds.map(() => '?').join(',')}) AND deleted_at IS NULL
      `).all(currentDeptIds).map(d => d.id);

      if (children.length > 0) {
        allDeptsToDelete.push(...children);
        currentDeptIds = children;
      } else {
        currentDeptIds = [];
      }
    }

    // Soft delete all affected departments
    db.prepare(`
      UPDATE departments
      SET deleted_at = ?, updated_at = ?
      WHERE id IN (${allDeptsToDelete.map(() => '?').join(',')})
    `).run(now, now, ...allDeptsToDelete);

    // Soft delete all people in those departments
    db.prepare(`
      UPDATE people
      SET deleted_at = ?, updated_at = ?
      WHERE department_id IN (${allDeptsToDelete.map(() => '?').join(',')})
    `).run(now, now, ...allDeptsToDelete);
  });

  transaction();

  return { success: true };
}

/**
 * Helper to check if potentialDescendant is an ancestor of deptId (circular reference check)
 */
function checkIsDescendant(potentialParentId, deptId) {
  let currentId = potentialParentId;
  const visited = new Set();

  while (currentId) {
    if (visited.has(currentId)) return true; // Loop detected
    visited.add(currentId);

    if (currentId === deptId) return true; // Found circular reference

    const parent = db.prepare('SELECT parent_id FROM departments WHERE id = ? AND deleted_at IS NULL').get(currentId);
    currentId = parent ? parent.parent_id : null;
  }

  return false;
}
