import db from '../db.js';
import { randomUUID } from 'crypto';
import { getUserOrganizations, requireOrgPermission } from './member.service.js';

export async function getOrganizations(userId) {
  return getUserOrganizations(userId);
}

export async function getOrganizationById(id, userId) {
  // Check access (throws if no access) and get user's role
  const access = requireOrgPermission(id, userId, 'viewer');

  const org = db
    .prepare(
      `
    SELECT id, name, created_by_id as createdById, created_at as createdAt, updated_at as updatedAt
    FROM organizations
    WHERE id = ?
  `
    )
    .get(id);

  if (!org) {
    const error = new Error('Organization not found');
    error.status = 404;
    throw error;
  }

  // Get departments for this organization
  const departments = db
    .prepare(
      `
    SELECT
      d.id, d.organization_id as organizationId, d.parent_id as parentId,
      d.name, d.description, d.sort_order as sortOrder,
      d.created_at as createdAt, d.updated_at as updatedAt
    FROM departments d
    WHERE d.organization_id = ?
    ORDER BY d.sort_order ASC
  `
    )
    .all(id);

  // Get people for each department
  const departmentsWithPeople = departments.map(dept => {
    const people = db
      .prepare(
        `
      SELECT
        id, department_id as departmentId, name, title, email, phone,
        sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
      FROM people
      WHERE department_id = ?
      ORDER BY sort_order ASC
    `
      )
      .all(dept.id);

    return { ...dept, people };
  });

  org.departments = departmentsWithPeople;
  org.userRole = access.role; // Include user's role in response
  return org;
}

export async function createOrganization(name, userId) {
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
    SELECT id, name, created_by_id as createdById, created_at as createdAt, updated_at as updatedAt
    FROM organizations WHERE id = ?
  `
    )
    .get(orgId);
}

export async function updateOrganization(id, name, userId) {
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
    SELECT id, name, created_by_id as createdById, created_at as createdAt, updated_at as updatedAt
    FROM organizations WHERE id = ?
  `
    )
    .get(id);
}

export async function deleteOrganization(id, userId) {
  // Only owner can delete
  const access = requireOrgPermission(id, userId, 'owner');

  if (!access.isOwner) {
    const error = new Error('Only the organization owner can delete it');
    error.status = 403;
    throw error;
  }

  // Cascade delete handled by database foreign key constraints
  db.prepare('DELETE FROM organizations WHERE id = ?').run(id);

  return { success: true };
}
