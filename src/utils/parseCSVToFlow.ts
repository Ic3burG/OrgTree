import Papa from 'papaparse';

interface CSVRow {
  Path: string;
  Type: string;
  Name: string;
  Title?: string;
  Email?: string;
  Phone?: string;
  Description?: string;
}

interface Person {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  path: string;
}

interface DepartmentData {
  id: string;
  path: string;
  name: string;
  description: string;
  depth: number;
  people: Person[];
  parentPath: string | null;
}

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    name: string;
    path: string;
    depth: number;
    description: string;
    people: Person[];
    isExpanded: boolean;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated: boolean;
  style: { stroke: string; strokeWidth: number };
}

interface FlowStructure {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/**
 * Parse CSV data into React Flow nodes and edges format
 * @param csvText - Raw CSV text
 * @returns Object with nodes and edges arrays
 */
export function parseCSVToFlow(csvText: string): FlowStructure {
  const result = Papa.parse<CSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string): string => header.trim(),
  });

  if (result.errors.length > 0) {
    console.error('CSV parsing errors:', result.errors);
  }

  return buildFlowStructure(result.data);
}

/**
 * Build React Flow nodes and edges from flat CSV rows
 * @param rows - Parsed CSV rows
 * @returns Object with nodes and edges arrays
 */
function buildFlowStructure(rows: CSVRow[]): FlowStructure {
  // Sort by path to ensure parents come before children
  const sortedRows = rows.sort((a, b) => a.Path.localeCompare(b.Path));

  const departmentMap = new Map<string, DepartmentData>(); // Map of path -> department data
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // First pass: identify all departments and their people
  sortedRows.forEach((row: CSVRow) => {
    const path = row.Path.trim();
    const type = row.Type.trim().toLowerCase();
    const segments = path.split('/').filter(Boolean);
    const depth = segments.length - 1;
    const id = segments[segments.length - 1] as string;

    if (type === 'department') {
      // Create department entry
      departmentMap.set(path, {
        id: id,
        path: path,
        name: row.Name.trim(),
        description: row.Description ? row.Description.trim() : '',
        depth: depth,
        people: [],
        parentPath: segments.length > 1 ? '/' + segments.slice(0, -1).join('/') : null,
      });
    } else if (type === 'person') {
      // Find parent department and add person to it
      const departmentPath = '/' + segments.slice(0, -1).join('/');
      const department = departmentMap.get(departmentPath);

      if (department) {
        department.people.push({
          id: id,
          name: row.Name.trim(),
          title: row.Title ? row.Title.trim() : '',
          email: row.Email ? row.Email.trim() : '',
          phone: row.Phone ? row.Phone.trim() : '',
          path: path,
        });
      } else {
        console.warn(`Parent department not found for person at: ${path}`);
      }
    }
  });

  // Second pass: create nodes and edges
  departmentMap.forEach((dept: DepartmentData) => {
    // Create node for this department
    nodes.push({
      id: dept.id,
      type: 'department',
      position: { x: 0, y: 0 }, // Placeholder, will be set by layout engine
      data: {
        name: dept.name,
        path: dept.path,
        depth: dept.depth,
        description: dept.description, // Department responsibilities for tooltip
        people: dept.people,
        isExpanded: false, // Start collapsed
      },
    });

    // Create edge from parent to this department
    if (dept.parentPath) {
      const parent = departmentMap.get(dept.parentPath);
      if (parent) {
        edges.push({
          id: `e-${parent.id}-${dept.id}`,
          source: parent.id,
          target: dept.id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        });
      }
    }
  });

  return { nodes, edges };
}

/**
 * Find a node by its ID
 * @param nodes - Array of nodes
 * @param nodeId - Node ID to find
 * @returns Node if found, null otherwise
 */
export function findNodeById(nodes: FlowNode[], nodeId: string): FlowNode | null {
  return nodes.find(node => node.id === nodeId) || null;
}

interface SearchMatch {
  type: 'department' | 'person';
  id: string;
  name: string;
  subtitle: string;
  node?: FlowNode;
  person?: Person;
  departmentId?: string;
  departmentName?: string;
}

/**
 * Search nodes and people by query
 * @param nodes - Array of nodes
 * @param query - Search query
 * @returns Array of matches with type and reference
 */
export function searchNodesAndPeople(nodes: FlowNode[], query: string): SearchMatch[] {
  if (!query || query.trim() === '') return [];

  const lowerQuery = query.toLowerCase();
  const matches: SearchMatch[] = [];

  nodes.forEach((node: FlowNode) => {
    // Check department name
    if (node.data.name.toLowerCase().includes(lowerQuery)) {
      matches.push({
        type: 'department',
        id: node.id,
        name: node.data.name,
        subtitle: `${node.data.people.length} people`,
        node: node,
      });
    }

    // Check people in this department
    node.data.people.forEach((person: Person) => {
      const nameMatch = person.name.toLowerCase().includes(lowerQuery);
      const titleMatch = person.title && person.title.toLowerCase().includes(lowerQuery);
      const emailMatch = person.email && person.email.toLowerCase().includes(lowerQuery);

      if (nameMatch || titleMatch || emailMatch) {
        matches.push({
          type: 'person',
          id: person.id,
          name: person.name,
          subtitle: person.title,
          person: person,
          departmentId: node.id,
          departmentName: node.data.name,
        });
      }
    });
  });

  return matches;
}
