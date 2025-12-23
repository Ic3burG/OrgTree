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
    WHERE organization_id = ?
    ORDER BY sort_order ASC
  `).all(orgId);

  // Get people for each department
  const result = departments.map(dept => {
    const people = db.prepare(`
      SELECT
        id, department_id as departmentId, name, title, email, phone,
        sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
      FROM people
      WHERE department_id = ?
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
    WHERE id = ? AND organization_id = ?
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
    WHERE department_id = ?
    ORDER BY sort_order ASC
  `).all(deptId);

  return { ...dept, people };
}

export async function createDepartment(orgId, data, userId) {
  await verifyOrgAccess(orgId, userId, 'editor');

  const { name, description, parentId } = data;

  console.log('=== createDepartment service ===');
  console.log('Creating with parentId:', parentId);

  // Validate parentId if provided
  if (parentId) {
    const parentDept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ?').get(parentId, orgId);
    if (!parentDept) {
      const error = new Error('Parent department not found');
      error.status = 400;
      throw error;
    }
  }

  // Get max sortOrder for positioning
  const maxSortResult = db.prepare(`
    SELECT MAX(sort_order) as maxSort
    FROM departments
    WHERE organization_id = ? AND parent_id ${parentId ? '= ?' : 'IS NULL'}
  `).get(parentId ? [orgId, parentId] : [orgId]);

  const sortOrder = (maxSortResult.maxSort || 0) + 1;
  const deptId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO departments (id, organization_id, parent_id, name, description, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(deptId, orgId, parentId || null, name, description || null, sortOrder, now, now);

  const result = await getDepartmentById(orgId, deptId, userId);
  console.log('Created department with parentId:', result.parentId);
  return result;
}

export async function updateDepartment(orgId, deptId, data, userId) {
  await verifyOrgAccess(orgId, userId, 'editor');

  const dept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ?').get(deptId, orgId);

  if (!dept) {
    const error = new Error('Department not found');
    error.status = 404;
    throw error;
  }

  const { name, description, parentId } = data;

  console.log('=== updateDepartment service ===');
  console.log('Updating department:', deptId);
  console.log('New parentId:', parentId);
  console.log('parentId type:', typeof parentId);

  // Prevent self-reference
  if (parentId === deptId) {
    const error = new Error('Department cannot be its own parent');
    error.status = 400;
    throw error;
  }

  // Validate parentId if provided
  if (parentId) {
    const parentDept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ?').get(parentId, orgId);
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
    console.log('Updating with new parentId:', newParentId);
  } else {
    // parentId not in data, keep existing
    newParentId = dept.parent_id;
    console.log('Keeping existing parentId:', newParentId);
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

  const result = await getDepartmentById(orgId, deptId, userId);
  console.log('Updated department result - parentId:', result.parentId);
  return result;
}

export async function deleteDepartment(orgId, deptId, userId) {
  await verifyOrgAccess(orgId, userId, 'editor');

  const dept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ?').get(deptId, orgId);

  if (!dept) {
    const error = new Error('Department not found');
    error.status = 404;
    throw error;
  }

  // Cascade delete handled by database foreign key constraints
  db.prepare('DELETE FROM departments WHERE id = ?').run(deptId);

  return { success: true };
}
