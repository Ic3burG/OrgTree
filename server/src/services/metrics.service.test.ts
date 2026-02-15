/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import db from '../db.js';
import {
  getOverviewMetrics,
  getUsageMetrics,
  getPerformanceMetrics,
  getAuditMetrics,
  getRealtimeSnapshot,
} from './metrics.service.js';
import { randomUUID } from 'crypto';

describe('Metrics Service', () => {
  beforeAll(async () => {
    // Seed some data for metrics
    const userId = randomUUID();
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      userId,
      `metrics-user-${randomUUID()}@example.com`,
      'hash',
      'Metrics User'
    );

    const orgId = randomUUID();
    db.prepare('INSERT INTO organizations (id, name, created_by_id) VALUES (?, ?, ?)').run(
      orgId,
      'Metrics Org',
      userId
    );

    db.prepare(
      'INSERT INTO audit_logs (id, organization_id, actor_id, actor_name, action_type, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      randomUUID(),
      orgId,
      userId,
      'Metrics User',
      'login',
      'user',
      userId,
      new Date().toISOString()
    );
  });

  it('getOverviewMetrics should return valid data', () => {
    const metrics = getOverviewMetrics();
    expect(metrics).toHaveProperty('totalUsers');
    expect(metrics).toHaveProperty('totalOrganizations');
    expect(metrics.totalUsers).toBeGreaterThan(0);
    expect(metrics.totalOrganizations).toBeGreaterThan(0);
  });

  it('getUsageMetrics should return trend data', () => {
    const metrics = getUsageMetrics();
    expect(Array.isArray(metrics.userGrowth)).toBe(true);
    expect(metrics.contentVolume).toHaveProperty('departments');
    expect(metrics.contentVolume).toHaveProperty('people');
  });

  it('getPerformanceMetrics should return system stats', () => {
    const metrics = getPerformanceMetrics();
    expect(metrics).toHaveProperty('uptime');
    expect(metrics).toHaveProperty('memory');
    expect(metrics.database.status).toBe('connected');
  });

  it('getAuditMetrics should return security stats', () => {
    const metrics = getAuditMetrics();
    expect(Array.isArray(metrics.actionDistribution)).toBe(true);
    expect(metrics.loginStats24h).toHaveProperty('successful');
  });

  it('getRealtimeSnapshot should return current state', () => {
    const snapshot = getRealtimeSnapshot();
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('memory');
    expect(snapshot).toHaveProperty('recentActivityCount');
  });
});
