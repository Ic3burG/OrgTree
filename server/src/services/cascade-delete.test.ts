import { describe, it, expect, beforeAll } from 'vitest';
import db from '../db.js';
import * as departmentService from './department.service.js';
import * as peopleService from './people.service.js';
import { randomUUID } from 'crypto';

describe('Cascade Delete Integration', () => {
  let orgId: string;
  let userId: string;

  beforeAll(async () => {
    // Setup a test organization and user
    orgId = randomUUID();
    userId = randomUUID();

    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      userId,
      `test-${orgId}@example.com`,
      'hash',
      'Test User'
    );

    db.prepare('INSERT INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)').run(
      orgId,
      'Test Org',
      userId
    );

    db.prepare(
      'INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id) VALUES (?, ?, ?, ?, ?)'
    ).run(randomUUID(), orgId, userId, 'owner', userId);
  });

  it('should recursively soft-delete departments and people', async () => {
    // 1. Create a hierarchy: Root -> Child -> Grandchild
    const root = await departmentService.createDepartment(orgId, { name: 'Root' }, userId);
    const child = await departmentService.createDepartment(
      orgId,
      { name: 'Child', parentId: root.id },
      userId
    );
    const grandchild = await departmentService.createDepartment(
      orgId,
      { name: 'Grandchild', parentId: child.id },
      userId
    );

    // 2. Add people to each department
    const p1 = await peopleService.createPerson(root.id, { name: 'Person 1' }, userId);
    const p2 = await peopleService.createPerson(child.id, { name: 'Person 2' }, userId);
    const p3 = await peopleService.createPerson(grandchild.id, { name: 'Person 3' }, userId);

    // 3. Verify they exist and are not deleted
    const checkDept = (id: string) =>
      db.prepare('SELECT deleted_at FROM departments WHERE id = ?').get(id) as {
        deleted_at: string | null;
      };
    const checkPerson = (id: string) =>
      db.prepare('SELECT deleted_at FROM people WHERE id = ?').get(id) as {
        deleted_at: string | null;
      };

    expect(checkDept(root.id).deleted_at).toBeNull();
    expect(checkDept(child.id).deleted_at).toBeNull();
    expect(checkDept(grandchild.id).deleted_at).toBeNull();
    expect(checkPerson(p1.id).deleted_at).toBeNull();
    expect(checkPerson(p2.id).deleted_at).toBeNull();
    expect(checkPerson(p3.id).deleted_at).toBeNull();

    // 4. Delete the Root department
    departmentService.deleteDepartment(orgId, root.id, userId);

    // 5. Verify all are soft-deleted
    expect(checkDept(root.id).deleted_at).not.toBeNull();
    expect(checkDept(child.id).deleted_at).not.toBeNull();
    expect(checkDept(grandchild.id).deleted_at).not.toBeNull();
    expect(checkPerson(p1.id).deleted_at).not.toBeNull();
    expect(checkPerson(p2.id).deleted_at).not.toBeNull();
    expect(checkPerson(p3.id).deleted_at).not.toBeNull();
  });

  it('should only delete the targeted sub-tree', async () => {
    // 1. Create two parallel branches
    const deptA = await departmentService.createDepartment(orgId, { name: 'Branch A' }, userId);
    const deptB = await departmentService.createDepartment(orgId, { name: 'Branch B' }, userId);

    const childA = await departmentService.createDepartment(
      orgId,
      { name: 'Child A', parentId: deptA.id },
      userId
    );
    const childB = await departmentService.createDepartment(
      orgId,
      { name: 'Child B', parentId: deptB.id },
      userId
    );

    const personA = await peopleService.createPerson(childA.id, { name: 'Person A' }, userId);
    const personB = await peopleService.createPerson(childB.id, { name: 'Person B' }, userId);

    // 2. Delete Branch A
    departmentService.deleteDepartment(orgId, deptA.id, userId);

    // 3. Verify Branch A and its children are deleted
    const checkDept = (id: string) =>
      db.prepare('SELECT deleted_at FROM departments WHERE id = ?').get(id) as {
        deleted_at: string | null;
      };
    const checkPerson = (id: string) =>
      db.prepare('SELECT deleted_at FROM people WHERE id = ?').get(id) as {
        deleted_at: string | null;
      };

    expect(checkDept(deptA.id).deleted_at).not.toBeNull();
    expect(checkDept(childA.id).deleted_at).not.toBeNull();
    expect(checkPerson(personA.id).deleted_at).not.toBeNull();

    // 4. Verify Branch B and its children remain intact
    expect(checkDept(deptB.id).deleted_at).toBeNull();
    expect(checkDept(childB.id).deleted_at).toBeNull();
    expect(checkPerson(personB.id).deleted_at).toBeNull();
  });

  it('should prevent circular references when updating a department', async () => {
    // 1. Create a chain: Root -> Child
    const root = await departmentService.createDepartment(orgId, { name: 'Root' }, userId);
    const child = await departmentService.createDepartment(
      orgId,
      { name: 'Child', parentId: root.id },
      userId
    );

    // 2. Attempt to move Root under Child (should fail)
    await expect(
      departmentService.updateDepartment(orgId, root.id, { parentId: child.id }, userId)
    ).rejects.toThrow('Cannot move a department under one of its own descendants');
  });
});
