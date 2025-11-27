import Papa from 'papaparse';

/**
 * Parse CSV data into React Flow nodes and edges format
 * @param {string} csvText - Raw CSV text
 * @returns {Object} { nodes: [], edges: [] }
 */
export function parseCSVToFlow(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.error('CSV parsing errors:', result.errors);
  }

  return buildFlowStructure(result.data);
}

/**
 * Build React Flow nodes and edges from flat CSV rows
 * @param {Array} rows - Parsed CSV rows
 * @returns {Object} { nodes: [], edges: [] }
 */
function buildFlowStructure(rows) {
  // Sort by path to ensure parents come before children
  const sortedRows = rows.sort((a, b) => a.Path.localeCompare(b.Path));

  const departmentMap = new Map(); // Map of path -> department data
  const nodes = [];
  const edges = [];

  // First pass: identify all departments and their people
  sortedRows.forEach(row => {
    const path = row.Path.trim();
    const type = row.Type.trim().toLowerCase();
    const segments = path.split('/').filter(Boolean);
    const depth = segments.length - 1;
    const id = segments[segments.length - 1];

    if (type === 'department') {
      // Create department entry
      departmentMap.set(path, {
        id: id,
        path: path,
        name: row.Name.trim(),
        depth: depth,
        people: [],
        parentPath: segments.length > 1 ? '/' + segments.slice(0, -1).join('/') : null
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
          office: row.Office ? row.Office.trim() : '',
          path: path
        });
      } else {
        console.warn(`Parent department not found for person at: ${path}`);
      }
    }
  });

  // Second pass: create nodes and edges
  departmentMap.forEach((dept, path) => {
    // Create node for this department
    nodes.push({
      id: dept.id,
      type: 'department',
      position: { x: 0, y: 0 }, // Placeholder, will be set by layout engine
      data: {
        name: dept.name,
        path: dept.path,
        depth: dept.depth,
        people: dept.people,
        isExpanded: false, // Start collapsed
      }
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
          style: { stroke: '#94a3b8', strokeWidth: 2 }
        });
      }
    }
  });

  return { nodes, edges };
}

/**
 * Find a node by its ID
 * @param {Array} nodes - Array of nodes
 * @param {string} nodeId - Node ID to find
 * @returns {Object|null} Node if found
 */
export function findNodeById(nodes, nodeId) {
  return nodes.find(node => node.id === nodeId) || null;
}

/**
 * Search nodes and people by query
 * @param {Array} nodes - Array of nodes
 * @param {string} query - Search query
 * @returns {Array} Array of matches with type and reference
 */
export function searchNodesAndPeople(nodes, query) {
  if (!query || query.trim() === '') return [];

  const lowerQuery = query.toLowerCase();
  const matches = [];

  nodes.forEach(node => {
    // Check department name
    if (node.data.name.toLowerCase().includes(lowerQuery)) {
      matches.push({
        type: 'department',
        id: node.id,
        name: node.data.name,
        subtitle: `${node.data.people.length} people`,
        node: node
      });
    }

    // Check people in this department
    node.data.people.forEach(person => {
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
          departmentName: node.data.name
        });
      }
    });
  });

  return matches;
}
