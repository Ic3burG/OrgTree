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

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCsrfToken,
  signCsrfToken,
  verifyCsrfToken,
  compareCsrfTokens,
  createCsrfTokenPair,
} from './csrf.service.js';

describe('CSRF Service', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('should generate a token', () => {
    const token = generateCsrfToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });

  it('should sign and verify a token', () => {
    const token = generateCsrfToken();
    const signed = signCsrfToken(token);
    expect(signed).toContain(token);
    expect(verifyCsrfToken(signed)).toBe(true);
  });

  it('should reject invalid signatures', () => {
    const token = generateCsrfToken();
    const signed = signCsrfToken(token);
    const tampered = signed.substring(0, signed.length - 5) + 'fake';
    expect(verifyCsrfToken(tampered)).toBe(false);
  });

  it('should reject malformed tokens', () => {
    expect(verifyCsrfToken('no-dot')).toBe(false);
    expect(verifyCsrfToken('')).toBe(false);
    // @ts-expect-error - Testing error handling with invalid input
    expect(verifyCsrfToken(null)).toBe(false);
  });

  it('should compare tokens safely', () => {
    const t1 = 'token123';
    const t2 = 'token123';
    const t3 = 'token456';
    expect(compareCsrfTokens(t1, t2)).toBe(true);
    expect(compareCsrfTokens(t1, t3)).toBe(false);
  });

  it('should create a token pair', () => {
    const pair = createCsrfTokenPair();
    expect(pair).toHaveProperty('token');
    expect(pair).toHaveProperty('signedToken');
    expect(verifyCsrfToken(pair.signedToken)).toBe(true);
  });
});
