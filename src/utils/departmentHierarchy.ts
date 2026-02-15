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

import type { Department } from '../types/index.js';

export interface HierarchyLevel {
  id: string;
  name: string;
  depth: number;
}

/**
 * Build the full hierarchy chain from a department to root
 * @param departmentId - Starting department ID
 * @param departments - All departments in organization
 * @returns Array of hierarchy levels from root to current department
 */
export function buildHierarchyChain(
  departmentId: string,
  departments: Department[]
): HierarchyLevel[] {
  const deptMap = new Map(departments.map(d => [d.id, d]));
  const chain: HierarchyLevel[] = [];
  const visited = new Set<string>();

  let currentId: string | null = departmentId;
  let depth = 0;

  // Build chain from current to root
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const dept = deptMap.get(currentId);

    if (!dept) break;

    chain.unshift({
      id: dept.id,
      name: dept.name,
      depth,
    });

    currentId = dept.parent_id;
    depth++;
  }

  return chain;
}

/**
 * Get formatted hierarchy path as string
 * @param departmentId - Starting department ID
 * @param departments - All departments
 * @param separator - Separator between levels (default: ' → ')
 * @returns Formatted string like "CEO → Operations → Engineering"
 */
export function getHierarchyPath(
  departmentId: string,
  departments: Department[],
  separator: string = ' → '
): string {
  const chain = buildHierarchyChain(departmentId, departments);
  return chain.map(level => level.name).join(separator);
}

/**
 * Build a map of department ID to ancestor IDs (including self)
 * @param departments - List of departments
 * @returns Map where key is department ID and value is array of ancestor IDs
 */
export function buildAncestorMap(departments: Department[]): Map<string, string[]> {
  const deptMap = new Map(departments.map(d => [d.id, d]));
  const ancestorMap = new Map<string, string[]>();

  function getAncestors(deptId: string, visited = new Set<string>()): string[] {
    if (visited.has(deptId)) return [];
    visited.add(deptId);

    const dept = deptMap.get(deptId);
    if (!dept) return [];

    const ancestors = [deptId];
    if (dept.parent_id) {
      ancestors.push(...getAncestors(dept.parent_id, visited));
    } else {
      // Handle public API camelCase which might occur in public views
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parentId = (dept as any).parentId;
      if (parentId) {
        ancestors.push(...getAncestors(parentId, visited));
      }
    }
    return ancestors;
  }

  departments.forEach(dept => {
    ancestorMap.set(dept.id, getAncestors(dept.id));
  });

  return ancestorMap;
}
