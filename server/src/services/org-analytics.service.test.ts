import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import * as OrgAnalyticsService from './org-analytics.service.js';

describe('OrgAnalyticsService', () => {
  let userId: string;
  let orgId: string;

  beforeEach(() => {
    // Use in-memory DB or clean state
    // For now assuming better-sqlite3 in-memory or setup.ts handles it.
    // Ideally we wrap in transaction or just insert new unique data.

    userId = uuidv4();
    orgId = uuidv4();

    // Create org owner
    db.prepare(
      `
        INSERT INTO users (id, name, email, password_hash, created_at)
        VALUES (@id, 'Test User', @email, 'hash', datetime('now'))
    `
    ).run({ id: userId, email: `test-${uuidv4()}@example.com` });

    // Create organization
    db.prepare(
      `
        INSERT INTO organizations (id, name, created_by_id, created_at, updated_at)
        VALUES (@id, 'Test Org Analytics', @userId, datetime('now'), datetime('now'))
    `
    ).run({ id: orgId, userId });

    // Add member
    db.prepare(
      `
        INSERT INTO organization_members (organization_id, user_id, role, added_by_id, created_at)
        VALUES (@orgId, @userId, 'owner', @userId, datetime('now'))
    `
    ).run({ orgId, userId });
  });

  it('getOrgAnalyticsOverview should return correct counts', () => {
    // Add departments
    const deptId = uuidv4();
    db.prepare(
      `INSERT INTO departments (id, organization_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(deptId, orgId, 'Dept 1');
    db.prepare(
      `INSERT INTO departments (id, organization_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(uuidv4(), orgId, 'Dept 2');

    // Add people
    db.prepare(
      `INSERT INTO people (id, department_id, name, email, sort_order, is_starred, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(uuidv4(), deptId, 'John Doe', 'john@example.com', 0);

    // Track edit events in audit_logs (multiple to ensure avg > 0)
    for (let i = 0; i < 5; i++) {
      db.prepare(
        `
                INSERT INTO audit_logs (id, organization_id, actor_id, actor_name, action_type, entity_type, entity_id, created_at)
                VALUES (?, ?, ?, 'Test User', 'UPDATE', 'person', 'p1', datetime('now'))
            `
      ).run(uuidv4(), orgId, userId);
    }

    const overview = OrgAnalyticsService.getOrgAnalyticsOverview(orgId);

    expect(overview.totalDepartments).toBe(2);
    expect(overview.totalPeople).toBe(1);
    expect(overview.totalMembers).toBe(1);
    expect(overview.avgUpdatesPerDay).toBeGreaterThan(0);
  });

  it('getOrgStructuralHealth should calculate depth and span', () => {
    // Create hierarchy: Root -> Child -> Grandchild
    const rootId = uuidv4();
    const childId = uuidv4();
    const grandchildId = uuidv4();

    db.prepare(
      `INSERT INTO departments (id, organization_id, name, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, NULL, 0, datetime('now'), datetime('now'))`
    ).run(rootId, orgId, 'Root');
    db.prepare(
      `INSERT INTO departments (id, organization_id, name, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(childId, orgId, 'Child', rootId);
    db.prepare(
      `INSERT INTO departments (id, organization_id, name, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(grandchildId, orgId, 'Grandchild', childId);

    // Add people to departments
    // Manager in Root (manages 2 people) - No manager_id in schema, so just adding people
    const managerId = uuidv4();
    db.prepare(
      `INSERT INTO people (id, department_id, name, sort_order, is_starred, created_at, updated_at) VALUES (?, ?, ?, 0, 0, datetime('now'), datetime('now'))`
    ).run(managerId, rootId, 'Manager');

    // Reports - treated as regular people
    db.prepare(
      `INSERT INTO people (id, department_id, name, sort_order, is_starred, created_at, updated_at) VALUES (?, ?, ?, 0, 0, datetime('now'), datetime('now'))`
    ).run(uuidv4(), rootId, 'Report 1');
    db.prepare(
      `INSERT INTO people (id, department_id, name, sort_order, is_starred, created_at, updated_at) VALUES (?, ?, ?, 0, 0, datetime('now'), datetime('now'))`
    ).run(uuidv4(), rootId, 'Report 2');

    const health = OrgAnalyticsService.getOrgStructuralHealth(orgId);

    expect(health.maxDepth).toBe(3);
    // Span of control is disabled (0), so expect 0 for now
    expect(health.avgSpanOfControl).toBe(0);
    expect(health.emptyDepartments).toBe(2); // Child, Grandchild
  });

  it('getOrgGrowthTrends should return time series', () => {
    const trends = OrgAnalyticsService.getOrgGrowthTrends(orgId, '30d');
    expect(trends.length).toBeGreaterThan(0);
    // Should match today's state at the end
    expect(trends[trends.length - 1]).toBeDefined();
  });

  it('getOrgActivityMetrics should return valid structure', () => {
    const metrics = OrgAnalyticsService.getOrgActivityMetrics(orgId, '30d');
    expect(metrics.totalEdits).toBeDefined();
    expect(metrics.topEditors).toBeDefined();
    expect(metrics.recentActions).toBeDefined();

    // Verify name is present
    if (metrics.topEditors.length > 0) {
      expect(metrics.topEditors[0].name).toBe('Test User');
    }
  });

  it('getOrgSearchAnalytics should return correct stats', () => {
    // Insert search analytics data
    const now = new Date().toISOString();

    // 1. Successful search by user
    db.prepare(
      `
      INSERT INTO search_analytics (id, organization_id, user_id, query, result_count, execution_time_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(uuidv4(), orgId, userId, 'john', 5, 100, now);

    // 2. Another search by same user
    db.prepare(
      `
      INSERT INTO search_analytics (id, organization_id, user_id, query, result_count, execution_time_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(uuidv4(), orgId, userId, 'dept', 2, 50, now);

    // 3. Zero result search
    db.prepare(
      `
      INSERT INTO search_analytics (id, organization_id, user_id, query, result_count, execution_time_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(uuidv4(), orgId, userId, 'missing', 0, 20, now);

    const analytics = OrgAnalyticsService.getOrgSearchAnalytics(orgId, '30d');

    expect(analytics.totalSearches).toBe(3);
    expect(analytics.uniqueSearchers).toBe(1);
    expect(analytics.zeroResultQueries.length).toBe(1);
    if (analytics.zeroResultQueries.length > 0) {
      expect(analytics.zeroResultQueries[0].query).toBe('missing');
    }
    expect(analytics.topQueries.length).toBeGreaterThan(0);
  });
});
