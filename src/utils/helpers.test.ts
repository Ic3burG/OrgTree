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

import { describe, it, expect } from 'vitest';
import { getInitials } from './helpers';

describe('getInitials', () => {
  it('should return initials from two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Jane Smith')).toBe('JS');
  });

  it('should return first two letters for single-word name', () => {
    expect(getInitials('Alice')).toBe('AL');
    expect(getInitials('Bob')).toBe('BO');
    expect(getInitials('X')).toBe('X');
  });

  it('should handle multi-word names (first and last initial)', () => {
    expect(getInitials('John Michael Doe')).toBe('JD');
    expect(getInitials('Mary Jane Watson Parker')).toBe('MP');
  });

  it('should handle null, undefined, and empty strings', () => {
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });

  it('should handle names with extra whitespace', () => {
    expect(getInitials('  John   Doe  ')).toBe('JD');
    expect(getInitials('Jane\t\nSmith')).toBe('JS');
  });

  it('should uppercase initials', () => {
    expect(getInitials('john doe')).toBe('JD');
    expect(getInitials('alice')).toBe('AL');
  });

  it('should handle special characters in names', () => {
    expect(getInitials("O'Brien")).toBe('OB');
    expect(getInitials('Mary-Jane')).toBe('MJ');
  });
});
