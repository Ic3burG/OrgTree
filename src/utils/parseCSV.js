import Papa from 'papaparse';

/**
 * Parse CSV data into a nested tree structure
 * @param {string} csvText - Raw CSV text
 * @returns {Array} Array of root-level department nodes
 */
export function parseCSV(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.error('CSV parsing errors:', result.errors);
  }

  return buildTree(result.data);
}

/**
 * Build nested tree from flat CSV rows
 * @param {Array} rows - Parsed CSV rows
 * @returns {Array} Array of root-level nodes
 */
function buildTree(rows) {
  // Sort by path to ensure parents come before children
  const sortedRows = rows.sort((a, b) => a.Path.localeCompare(b.Path));

  const root = [];
  const nodeMap = new Map();

  sortedRows.forEach(row => {
    const path = row.Path.trim();
    const segments = path.split('/').filter(Boolean);
    const depth = segments.length - 1;

    // Create the node
    const node = {
      id: segments[segments.length - 1],
      path: path,
      type: row.Type.trim().toLowerCase(),
      name: row.Name.trim(),
      depth: depth,
      children: [],
    };

    // Add person-specific fields
    if (node.type === 'person') {
      node.title = row.Title ? row.Title.trim() : '';
      node.email = row.Email ? row.Email.trim() : '';
      node.phone = row.Phone ? row.Phone.trim() : '';
      node.office = row.Office ? row.Office.trim() : '';
    }

    // Store in map for quick lookup
    nodeMap.set(path, node);

    // Attach to parent or root
    if (segments.length === 1) {
      // Top-level node
      root.push(node);
    } else {
      // Find parent
      const parentPath = '/' + segments.slice(0, -1).join('/');
      const parent = nodeMap.get(parentPath);

      if (parent) {
        parent.children.push(node);
      } else {
        console.warn(`Parent not found for path: ${path}`);
        root.push(node); // Fallback to root
      }
    }
  });

  return root;
}

/**
 * Calculate total count of departments and people in a tree
 * @param {Array} nodes - Array of nodes
 * @returns {Object} Counts object with departments and people
 */
export function getTreeCounts(nodes) {
  let departments = 0;
  let people = 0;

  function countNode(node) {
    if (node.type === 'department') {
      departments++;
      node.children.forEach(countNode);
    } else if (node.type === 'person') {
      people++;
    }
  }

  nodes.forEach(countNode);

  return { departments, people };
}

/**
 * Get all node paths in a tree (for expand all functionality)
 * @param {Array} nodes - Array of nodes
 * @param {string} type - Optional type filter ('department' or 'person')
 * @returns {Array} Array of paths
 */
export function getAllPaths(nodes, type = null) {
  const paths = [];

  function collectPaths(node) {
    if (!type || node.type === type) {
      paths.push(node.path);
    }
    if (node.children) {
      node.children.forEach(collectPaths);
    }
  }

  nodes.forEach(collectPaths);
  return paths;
}

/**
 * Find a node by path in the tree
 * @param {Array} nodes - Array of nodes to search
 * @param {string} path - Path to find
 * @returns {Object|null} The node if found, null otherwise
 */
export function findNodeByPath(nodes, path) {
  for (const node of nodes) {
    if (node.path === path) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}
