import dagre from 'dagre';

/**
 * Calculate hierarchical layout positions for org chart nodes using Dagre
 * @param {Array} nodes - React Flow node objects
 * @param {Array} edges - React Flow edge objects
 * @param {string} direction - 'TB' (top-to-bottom) or 'LR' (left-to-right)
 * @returns {Array} Nodes with calculated positions
 */
export function calculateLayout(nodes, edges, direction = 'TB') {
  const g = new dagre.graphlib.Graph();

  // Configure graph layout
  g.setGraph({
    rankdir: direction, // 'TB' (vertical) or 'LR' (horizontal)
    nodesep: 80, // horizontal spacing between nodes at same level
    ranksep: 120, // vertical spacing between hierarchy levels
    marginx: 40,
    marginy: 40,
    align: 'UL', // alignment: UL (up-left), UR, DL, DR
    ranker: 'tight-tree', // better for tree-like structures
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes with their dimensions
  nodes.forEach(node => {
    // Node width: expanded nodes are wider
    const width = node.data.isExpanded ? 280 : 220;

    // Node height: base height + space for each person when expanded
    // Cap at 384px (max-h-96) to match the scrollable container in DepartmentNode
    const baseHeight = 70;
    const peopleCount = node.data.people?.length || 0;
    const peopleHeight = node.data.isExpanded ? Math.min(peopleCount * 48, 384) : 0;
    const height = baseHeight + peopleHeight;

    g.setNode(node.id, { width, height });
  });

  // Add edges (connections between departments)
  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  // Run Dagre layout algorithm
  dagre.layout(g);

  // Apply calculated positions to nodes
  // Dagre positions are center-based, React Flow uses top-left corner
  return nodes.map(node => {
    const nodeWithPosition = g.node(node.id);

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });
}

/**
 * Get dimensions for a department node
 * Used for consistent sizing across the app
 */
export function getNodeDimensions(isExpanded, peopleCount) {
  const width = isExpanded ? 280 : 220;
  const baseHeight = 70;
  // Cap at 384px (max-h-96) to match the scrollable container
  const peopleHeight = isExpanded ? Math.min(peopleCount * 48, 384) : 0;
  const height = baseHeight + peopleHeight;

  return { width, height };
}
