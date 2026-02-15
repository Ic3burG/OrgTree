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

import { validatePerson } from './personValidation';
import { describe, it, expect } from 'vitest';

describe('personValidation', () => {
  it('should return empty errors for valid data', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      title: 'Developer',
    };
    const errors = validatePerson(data);
    expect(errors).toEqual({});
  });

  it('should require name', () => {
    const data = {
      name: '',
      email: 'john@example.com',
    };
    const errors = validatePerson(data);
    expect(errors.name).toBe('Name is required');
  });

  it('should validate email format', () => {
    const data = {
      name: 'John Doe',
      email: 'invalid-email',
    };
    const errors = validatePerson(data);
    expect(errors.email).toBe('Invalid email format');
  });

  it('should allow empty optional fields', () => {
    const data = {
      name: 'John Doe',
      email: '',
      phone: '',
    };
    const errors = validatePerson(data);
    expect(errors).toEqual({});
  });
});
