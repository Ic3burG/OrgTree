import type { Department } from '../types/index.js';

export interface HierarchicalDepartment extends Department {
  depth: number;
}

/**
 * Transforms a flat list of departments into a hierarchical list ordered by parent-child relationships.
 * Each department is assigned a depth property for indentation.
 */
export function getHierarchicalDepartments(departments: Department[]): HierarchicalDepartment[] {
  const result: HierarchicalDepartment[] = [];
  const deptMap = new Map<string | null, Department[]>();

  // Group departments by their parent_id
  departments.forEach(dept => {
    const parentId = dept.parent_id;
    if (!deptMap.has(parentId)) {
      deptMap.set(parentId, []);
    }
    deptMap.get(parentId)!.push(dept);
  });

  // Sort each group by sort_order
  deptMap.forEach(group => {
    group.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  });

  // Recursive function to build the hierarchical list
  const processLevel = (parentId: string | null, depth: number) => {
    const children = deptMap.get(parentId);
    if (!children) return;

    children.forEach(child => {
      result.push({ ...child, depth });
      processLevel(child.id, depth + 1);
    });
  };

  // Start with top-level departments (parent_id is null)
  processLevel(null, 0);

  return result;
}

/**
 * Generates an indented string for a department name based on its depth.
 */
export function getIndentedName(name: string, depth: number): string {
  // Use non-breaking space for HTML select options
  return '\u00A0'.repeat(depth * 3) + name;
}
