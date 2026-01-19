import type { Department } from '../types/index.js';

export interface HierarchicalDepartment extends Department {
  depth: number;
  isLastChild: boolean;
  ancestorIsLastChild: boolean[]; // Track if each ancestor was a last child (for proper line drawing)
}

/**
 * Transforms a flat list of departments into a hierarchical list ordered by parent-child relationships.
 * Each department is assigned a depth property for indentation and tracking for tree line drawing.
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

  // Sort each group by sort_order, then by name
  deptMap.forEach(group => {
    group.sort((a, b) => {
      const orderDiff = (a.sort_order || 0) - (b.sort_order || 0);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });
  });

  // Recursive function to build the hierarchical list
  const processLevel = (parentId: string | null, depth: number, ancestorIsLastChild: boolean[]) => {
    const children = deptMap.get(parentId);
    if (!children) return;

    children.forEach((child, index) => {
      const isLastChild = index === children.length - 1;
      result.push({
        ...child,
        depth,
        isLastChild,
        ancestorIsLastChild: [...ancestorIsLastChild],
      });
      processLevel(child.id, depth + 1, [...ancestorIsLastChild, isLastChild]);
    });
  };

  // Start with top-level departments (parent_id is null)
  processLevel(null, 0, []);

  return result;
}

/**
 * Generates a tree prefix using Unicode box-drawing characters.
 * Creates visual tree lines like:
 * ├── Child 1
 * │   ├── Grandchild 1
 * │   └── Grandchild 2
 * └── Child 2
 */
export function getTreePrefix(dept: HierarchicalDepartment): string {
  if (dept.depth === 0) {
    return '';
  }

  let prefix = '';

  // Build the prefix for ancestors (vertical lines or spaces)
  for (let i = 0; i < dept.depth - 1; i++) {
    if (dept.ancestorIsLastChild[i]) {
      prefix += '    '; // Ancestor was last child, no line needed
    } else {
      prefix += '│   '; // Ancestor has siblings below, draw vertical line
    }
  }

  // Add the branch character for this node
  if (dept.isLastChild) {
    prefix += '└── ';
  } else {
    prefix += '├── ';
  }

  return prefix;
}

/**
 * Generates an indented name with tree prefix for dropdown display.
 */
export function getIndentedName(
  name: string,
  depth: number,
  dept?: HierarchicalDepartment
): string {
  // If we have the full department info, use tree prefix
  if (dept) {
    return getTreePrefix(dept) + name;
  }

  // Fallback to simple indentation for backward compatibility
  return '\u00A0'.repeat(depth * 3) + name;
}

/**
 * Gets the full path from root to department as a breadcrumb string.
 * Useful for tooltips or alternative display modes.
 */
export function getFullPath(dept: Department, allDepartments: Department[]): string {
  const path: string[] = [dept.name];
  let currentDept = dept;

  while (currentDept.parent_id) {
    const parent = allDepartments.find(d => d.id === currentDept.parent_id);
    if (parent) {
      path.unshift(parent.name);
      currentDept = parent;
    } else {
      break;
    }
  }

  return path.join(' → ');
}
