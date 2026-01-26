import { describe, it, expect, beforeAll } from 'vitest';
import db from '../db.js';
import * as departmentService from './department.service.js';
import { randomUUID } from 'crypto';

describe('Concurrency Integration', () => {
  let orgId: string;
  let userId: string;

  beforeAll(async () => {
    orgId = randomUUID();
    userId = randomUUID();

    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      userId,
      `test-concurrency-${orgId}@example.com`,
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

  it('should handle rapid sequential updates to the same department', async () => {
    const dept = await departmentService.createDepartment(orgId, { name: 'Initial Name' }, userId);

    const updates = Array.from({ length: 10 }).map((_, i) =>
      departmentService.updateDepartment(orgId, dept.id, { name: `Update ${i}` }, userId)
    );

    // This won't be truly concurrent in JS main thread with better-sqlite3
    // but it tests the async service wrappers and ensures no transaction conflicts
    await Promise.all(updates);

    const finalDept = departmentService.getDepartmentById(orgId, dept.id, userId);
    expect(finalDept.name).toMatch(/Update \d/);
  });

  it('should remain stable during concurrent creation of multiple departments', async () => {
    const counts = Array.from({ length: 20 });

    const creations = counts.map((_, i) =>
      departmentService.createDepartment(orgId, { name: `Dept ${i}` }, userId)
    );

    const results = await Promise.all(creations);
    expect(results).toHaveLength(20);

    const allDepts = departmentService.getDepartments(orgId, userId);
    // Might have more if other tests ran in same org, but we used unique orgId
    expect(allDepts.length).toBeGreaterThanOrEqual(20);
  });
});
