import { describe, it, expect, beforeAll } from 'vitest';
import db from '../db.js';
import * as orgService from './org.service.js';
import * as departmentService from './department.service.js';
import * as peopleService from './people.service.js';
import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';

describe('Large Dataset Performance', () => {
  let orgId: string;
  let userId: string;

  // Constants for test dataset size
  // We want enough data to measure, but not so much it times out CI
  const NUM_DEPTS = 100;
  const PEOPLE_PER_DEPT = 5; // = 500 people total

  beforeAll(async () => {
    // 1. Setup Org & User
    orgId = randomUUID();
    userId = randomUUID();

    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      userId,
      `perf-${orgId}@example.com`,
      'hash',
      'Perf User'
    );

    db.prepare('INSERT INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)').run(
      orgId,
      'Performance Org',
      userId
    );

    db.prepare(
      'INSERT INTO organization_members (id, organization_id, user_id, role, added_by_id) VALUES (?, ?, ?, ?, ?)'
    ).run(randomUUID(), orgId, userId, 'owner', userId);

    // 2. Generate Data
    // Create departments in a flat list first for speed, then link them?
    // Or just create a simple hierarchy: 1 Root -> 10 Children -> 10 Grandchildren each

    const root = await departmentService.createDepartment(orgId, { name: 'Root' }, userId);

    // Use transaction for speed in test setup
    const seedTransaction = db.transaction(() => {
      const deptStmt = db.prepare(
        'INSERT INTO departments (id, organization_id, parent_id, name) VALUES (?, ?, ?, ?)'
      );
      const personStmt = db.prepare(
        'INSERT INTO people (id, department_id, name, title) VALUES (?, ?, ?, ?)'
      );

      // Create 10 branches
      for (let i = 0; i < 10; i++) {
        const branchId = randomUUID();
        deptStmt.run(branchId, orgId, root.id, `Branch ${i}`);

        // Add people to branch
        for (let p = 0; p < PEOPLE_PER_DEPT; p++) {
          personStmt.run(randomUUID(), branchId, `Person B${i}-P${p}`, 'Employee');
        }

        // Create 9 sub-branches for each branch (total ~100 depts)
        for (let j = 0; j < 9; j++) {
          const subId = randomUUID();
          deptStmt.run(subId, orgId, branchId, `Sub ${i}-${j}`);

          // Add people to sub-branch
          for (let p = 0; p < PEOPLE_PER_DEPT; p++) {
            personStmt.run(randomUUID(), subId, `Person S${i}-${j}-P${p}`, 'Employee');
          }
        }
      }
    });

    seedTransaction();
  });

  it('should fetch organization hierarchy within performance limits', async () => {
    const start = performance.now();

    // Retrieve full hierarchy including people count
    // This typically involves recursive CTEs or multiple queries
    const departments = await departmentService.getDepartments(orgId, userId);

    const end = performance.now();
    const duration = end - start;

    // Assert correctness
    // 1 Root + 10 Branches + 90 Sub-branches = 101 Departments
    expect(departments.length).toBeGreaterThanOrEqual(100);

    console.log(
      `[Performance] Fetched ${departments.length} departments in ${duration.toFixed(2)}ms`
    );

    // Performance assertion (Adjust threshold based on CI environment)
    // Local dev: ~10-20ms. CI might be slower. 200ms is a safe upper bound for 100 depts.
    expect(duration).toBeLessThan(200);
  });

  it('should fetch full organization data including people quickly', async () => {
    const start = performance.now();

    // getOrganizationById fetches the org, all departments, and all people
    // This is the heavy query used for the main dashboard/map view
    const org = await orgService.getOrganizationById(orgId, userId);

    const end = performance.now();
    const duration = end - start;

    console.log(`[Performance] Fetched full org data in ${duration.toFixed(2)}ms`);

    // Calculate totals from the result
    const totalDepartments = org.departments?.length || 0;
    const totalPeople =
      org.departments?.reduce((sum, dept) => sum + (dept.people?.length || 0), 0) || 0;

    expect(totalDepartments).toBeGreaterThanOrEqual(100);
    expect(totalPeople).toBeGreaterThanOrEqual(500);

    // Performance assertion (Adjust threshold based on CI environment)
    // Fetching 100 depts + 500 people + custom fields should be fast
    expect(duration).toBeLessThan(300);
  });
});
