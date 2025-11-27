/**
 * Filter tree based on search query
 * Returns filtered tree with only matching nodes and their ancestors
 * Also returns Set of paths that should be auto-expanded
 */

/**
 * Check if a node matches the search query
 * @param {Object} node - Node to check
 * @param {string} query - Search query (case-insensitive)
 * @returns {boolean} True if node matches
 */
function nodeMatches(node, query) {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();

  // Check name
  if (node.name && node.name.toLowerCase().includes(lowerQuery)) {
    return true;
  }

  // For people, also check title and email
  if (node.type === 'person') {
    if (node.title && node.title.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    if (node.email && node.email.toLowerCase().includes(lowerQuery)) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively filter tree and collect matching paths
 * @param {Array} nodes - Array of nodes to filter
 * @param {string} query - Search query
 * @param {Set} expandedPaths - Set to collect paths that should be expanded
 * @returns {Array} Filtered nodes
 */
export function filterTree(nodes, query) {
  if (!query || query.trim() === '') {
    return { filteredNodes: nodes, expandedPaths: new Set() };
  }

  const expandedPaths = new Set();

  function filterNode(node, ancestorPaths = []) {
    const currentPath = [...ancestorPaths, node.path];
    const directMatch = nodeMatches(node, query);

    // Filter children recursively
    let filteredChildren = [];
    if (node.children && node.children.length > 0) {
      filteredChildren = node.children
        .map(child => filterNode(child, currentPath))
        .filter(Boolean);
    }

    // Include this node if:
    // 1. It directly matches the query, OR
    // 2. Any of its descendants match
    const shouldInclude = directMatch || filteredChildren.length > 0;

    if (shouldInclude) {
      // If this node or its children match, expand all ancestor paths
      ancestorPaths.forEach(path => expandedPaths.add(path));

      // If children match, expand this node too
      if (filteredChildren.length > 0) {
        expandedPaths.add(node.path);
      }

      return {
        ...node,
        children: filteredChildren,
        isMatch: directMatch, // Mark if this node directly matches
      };
    }

    return null;
  }

  const filteredNodes = nodes
    .map(node => filterNode(node))
    .filter(Boolean);

  return { filteredNodes, expandedPaths };
}

/**
 * Highlight matching text in a string
 * @param {string} text - Text to highlight
 * @param {string} query - Query to highlight
 * @returns {string} Text with <mark> tags around matches
 */
export function highlightMatch(text, query) {
  if (!query || !text) return text;

  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
}

/**
 * Escape special regex characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get child count for a department (total people and sub-departments)
 * @param {Object} node - Department node
 * @returns {Object} Counts object
 */
export function getChildCounts(node) {
  let departments = 0;
  let people = 0;

  function count(n) {
    if (n.type === 'department') {
      departments++;
      if (n.children) {
        n.children.forEach(count);
      }
    } else if (n.type === 'person') {
      people++;
    }
  }

  if (node.children) {
    node.children.forEach(count);
  }

  return { departments, people };
}

/**
 * Get initials from a person's name
 * @param {string} name - Full name
 * @returns {string} Initials (up to 2 characters)
 */
export function getInitials(name) {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
