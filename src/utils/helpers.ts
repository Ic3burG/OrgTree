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

/**
 * Helper utility functions
 */

/**
 * Get initials from a person's name
 * @param name - Full name
 * @returns Initials (up to 2 characters)
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';

  const parts = name.trim().split(/[^a-zA-Z]+/);

  if (parts.length === 1) {
    return parts[0]?.substring(0, 2).toUpperCase() || '?';
  }

  const firstInitial = parts[0]?.[0] || '';
  const lastInitial = parts[parts.length - 1]?.[0] || '';
  return (firstInitial + lastInitial).toUpperCase() || '?';
}
