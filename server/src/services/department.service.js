import db from '../db.js';
import { randomUUID } from 'crypto';

// Helper to verify org ownership
async function verifyOrgAccess(orgId, userId) {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ? AND created_by_id = ?').get(orgId, userId);
  if (!org) {
    const error = new Error('Organization not found');
    error.status = 404;
    throw error;
  }
  return org;
}

export async function getDepartments(orgId, userId) {
  await verifyOrgAccess(orgId, userId);

  const departments = db.prepare(`
    SELECT
      id, organization_id as organizationId, parent_id as parentId,
      name, description, sort_order as sortOrder,
      created_at as createdAt, updated_at as updatedAt
    FROM departments
    WHERE organization_id = ?
    ORDER BY sort_order ASC
  `).all(orgId);

  // Get people and children for each department
  const result = departments.map(dept => {
    const people = db.prepare(`
      SELECT
        id, department_id as departmentId, name, title, email, phone, office,
        sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
      FROM people
      WHERE department_id = ?
      ORDER BY sort_order ASC
    `).all(dept.id);

    const children = db.prepare(`
      SELECT id, name, parent_id as parentId
      FROM departments
      WHERE parent_id = ?
    `).all(dept.id);

    return { ...dept, people, children };
  });

  return result;
}

export async function getDepartmentById(orgId, deptId, userId) {
  await verifyOrgAccess(orgId, userId);

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
      id, department_id as departmentId, name, title, email, phone, office,
      sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
    FROM people
    WHERE department_id = ?
    ORDER BY sort_order ASC
  `).all(deptId);

  // Get children with their people
  const children = db.prepare(`
    SELECT
      id, organization_id as organizationId, parent_id as parentId,
      name, description, sort_order as sortOrder,
      created_at as createdAt, updated_at as updatedAt
    FROM departments
    WHERE parent_id = ?
  `).all(deptId);

  const childrenWithPeople = children.map(child => {
    const childPeople = db.prepare(`
      SELECT
        id, department_id as departmentId, name, title, email, phone, office,
        sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
      FROM people
      WHERE department_id = ?
      ORDER BY sort_order ASC
    `).all(child.id);
    return { ...child, people: childPeople };
  });

  // Get parent if exists
  let parent = null;
  if (dept.parentId) {
    parent = db.prepare(`
      SELECT
        id, organization_id as organizationId, parent_id as parentId,
        name, description, sort_order as sortOrder
      FROM departments
      WHERE id = ?
    `).get(dept.parentId);
  }

  return { ...dept, people, children: childrenWithPeople, parent };
}

export async function createDepartment(orgId, data, userId) {
  console.log('=== createDepartment service ===');
  console.log('Received data:', data);
  await verifyOrgAccess(orgId, userId);

  const { name, description, parentId } = data;
  console.log('Extracted parentId:', parentId);
  console.log('parentId type:', typeof parentId);

  // If parentId provided, verify it exists in same org
  if (parentId) {
    console.log('Verifying parent department exists...');
    const parentDept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ?').get(parentId, orgId);
    if (!parentDept) {
      const error = new Error('Parent department not found');
      error.status = 400;
      throw error;
    }
    console.log('Parent department found:', parentDept.name);
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

  console.log('Inserting into database with parent_id:', parentId || null);
  db.prepare(`
    INSERT INTO departments (id, organization_id, parent_id, name, description, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(deptId, orgId, parentId || null, name, description || null, sortOrder, now, now);

  // Return the created department with relationships
  const result = await getDepartmentById(orgId, deptId, userId);
  console.log('Created department result:', result);
  console.log('Created with parentId:', result.parentId);
  return result;
}

export async function updateDepartment(orgId, deptId, data, userId) {
  console.log('=== updateDepartment service ===');
  console.log('Received data:', data);
  await verifyOrgAccess(orgId, userId);

  const dept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ?').get(deptId, orgId);

  if (!dept) {
    const error = new Error('Department not found');
    error.status = 404;
    throw error;
  }

  const { name, description, parentId } = data;
  console.log('Extracted parentId:', parentId);
  console.log('parentId type:', typeof parentId);

  // Prevent setting parent to self
  if (parentId === deptId) {
    const error = new Error('Department cannot be its own parent');
    error.status = 400;
    throw error;
  }

  // If parentId provided, verify it exists and isn't a child of this dept
  if (parentId !== undefined && parentId !== null) {
    const parentDept = db.prepare('SELECT * FROM departments WHERE id = ? AND organization_id = ?').get(parentId, orgId);
    if (!parentDept) {
      const error = new Error('Parent department not found');
      error.status = 400;
      throw error;
    }

    // Check for circular reference
    if (checkIsDescendant(deptId, parentId)) {
      const error = new Error('Cannot set a child department as parent');
      error.status = 400;
      throw error;
    }
  }

  const now = new Date().toISOString();
  const newParentId = parentId !== undefined ? parentId : dept.parent_id;
  console.log('Updating with parent_id:', newParentId);

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
  console.log('Updated department result:', result);
  console.log('Updated with parentId:', result.parentId);
  return result;
}

// Helper to check if potentialChildId is a descendant of parentId
function checkIsDescendant(parentId, potentialChildId) {
  const children = db.prepare('SELECT id FROM departments WHERE parent_id = ?').all(parentId);

  for (const child of children) {
    if (child.id === potentialChildId) {
      return true;
    }
    if (checkIsDescendant(child.id, potentialChildId)) {
      return true;
    }
  }

  return false;
}

export async function deleteDepartment(orgId, deptId, userId) {
  await verifyOrgAccess(orgId, userId);

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

export async function moveDepartment(orgId, deptId, newParentId, userId) {
  return updateDepartment(orgId, deptId, { parentId: newParentId }, userId);
}
