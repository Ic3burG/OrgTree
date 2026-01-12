import { describe, it, expect, beforeAll } from 'vitest';
import { getOrganizationById, createOrganization } from './org.service.js';
import db from '../db.js';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

/**
 * CRITICAL VALIDATION TEST
 *
 * This test prevents field naming regressions that break the OrgMap visualization.
 *
 * CONTEXT:
 * - The OrgMap component (src/components/OrgMap.tsx) checks dept.parent_id to create edges
 * - If the backend returns camelCase (parentId), edges won't render and connections disappear
 * - This bug has occurred multiple times during refactoring (Sessions 25, 37, 46+)
 *
 * REQUIREMENT:
 * - Backend MUST return snake_case field names (parent_id, organization_id, etc.)
 * - Frontend types expect snake_case (src/types/index.ts)
 * - Database columns use snake_case (SQLite schema)
 *
 * DO NOT REMOVE OR MODIFY THIS TEST WITHOUT UNDERSTANDING THE CONSEQUENCES
 */
describe('Backend Field Naming - OrgMap Edge Rendering Validation', () => {
  let testUserId: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Create test user with unique email to avoid conflicts
    testUserId = randomUUID();
    const hashedPassword = await bcrypt.hash('password123', 10);
    const uniqueEmail = `field-validation-${Date.now()}@example.com`;
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`
    ).run(testUserId, 'Field Validation Test User', uniqueEmail, hashedPassword, 'user');

    // Create test organization with departments
    const org = await createOrganization('Test Org', testUserId);
    testOrgId = org.id;

    // Create parent department
    const parentDeptId = randomUUID();
    db.prepare(
      `INSERT INTO departments (id, organization_id, parent_id, name, sort_order)
       VALUES (?, ?, NULL, ?, 1)`
    ).run(parentDeptId, testOrgId, 'Parent Department');

    // Create child department
    const childDeptId = randomUUID();
    db.prepare(
      `INSERT INTO departments (id, organization_id, parent_id, name, sort_order)
       VALUES (?, ?, ?, ?, 2)`
    ).run(childDeptId, testOrgId, parentDeptId, 'Child Department');

    // Create person in child department
    const personId = randomUUID();
    db.prepare(
      `INSERT INTO people (id, department_id, name, title, sort_order)
       VALUES (?, ?, ?, ?, 1)`
    ).run(personId, childDeptId, 'Test Person', 'Test Title');
  });

  it('CRITICAL: must return snake_case parent_id for OrgMap edge rendering', async () => {
    const org = await getOrganizationById(testOrgId, testUserId);

    expect(org.departments).toBeDefined();
    expect(org.departments).toHaveLength(2);

    // Find child department (should have parent_id)
    const childDept = org.departments!.find(d => d.name === 'Child Department');
    expect(childDept).toBeDefined();

    // CRITICAL ASSERTION: Must have parent_id in snake_case
    // OrgMap.tsx line 110 checks: if (dept.parent_id) { ... create edge ... }
    expect(childDept).toHaveProperty('parent_id');
    expect(childDept!.parent_id).toBeTruthy();
    expect(typeof childDept!.parent_id).toBe('string');

    // MUST NOT have camelCase parentId (would break edges)
    expect(childDept).not.toHaveProperty('parentId');
  });

  it('CRITICAL: must return snake_case organization_id for departments', async () => {
    const org = await getOrganizationById(testOrgId, testUserId);

    org.departments!.forEach(dept => {
      // Must have organization_id in snake_case
      expect(dept).toHaveProperty('organization_id');
      expect(dept.organization_id).toBe(testOrgId);

      // MUST NOT have camelCase organizationId
      expect(dept).not.toHaveProperty('organizationId');
    });
  });

  it('CRITICAL: must return snake_case sort_order for departments', async () => {
    const org = await getOrganizationById(testOrgId, testUserId);

    org.departments!.forEach(dept => {
      // Must have sort_order in snake_case
      expect(dept).toHaveProperty('sort_order');
      expect(typeof dept.sort_order).toBe('number');

      // MUST NOT have camelCase sortOrder
      expect(dept).not.toHaveProperty('sortOrder');
    });
  });

  it('CRITICAL: must return snake_case timestamp fields for departments', async () => {
    const org = await getOrganizationById(testOrgId, testUserId);

    org.departments!.forEach(dept => {
      // Must have snake_case timestamp fields
      expect(dept).toHaveProperty('created_at');
      expect(dept).toHaveProperty('updated_at');

      // MUST NOT have camelCase
      expect(dept).not.toHaveProperty('createdAt');
      expect(dept).not.toHaveProperty('updatedAt');
    });
  });

  it('CRITICAL: must return snake_case department_id for people', async () => {
    const org = await getOrganizationById(testOrgId, testUserId);

    const childDept = org.departments!.find(d => d.name === 'Child Department');
    expect(childDept!.people).toBeDefined();
    expect(childDept!.people!.length).toBeGreaterThan(0);

    childDept!.people!.forEach(person => {
      // Must have department_id in snake_case
      expect(person).toHaveProperty('department_id');
      expect(person.department_id).toBe(childDept!.id);

      // MUST NOT have camelCase departmentId
      expect(person).not.toHaveProperty('departmentId');
    });
  });

  it('CRITICAL: must return snake_case sort_order and timestamps for people', async () => {
    const org = await getOrganizationById(testOrgId, testUserId);

    const childDept = org.departments!.find(d => d.name === 'Child Department');

    childDept!.people!.forEach(person => {
      // Must have snake_case fields
      expect(person).toHaveProperty('sort_order');
      expect(person).toHaveProperty('created_at');
      expect(person).toHaveProperty('updated_at');

      // MUST NOT have camelCase
      expect(person).not.toHaveProperty('sortOrder');
      expect(person).not.toHaveProperty('createdAt');
      expect(person).not.toHaveProperty('updatedAt');
    });
  });

  it('CRITICAL: must return snake_case created_by_id for organization', async () => {
    const org = await getOrganizationById(testOrgId, testUserId);

    // Must have created_by_id in snake_case
    expect(org).toHaveProperty('created_by_id');
    expect(org.created_by_id).toBe(testUserId);

    // MUST NOT have camelCase createdById
    expect(org).not.toHaveProperty('createdById');
  });
});
