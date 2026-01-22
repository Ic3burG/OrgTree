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
