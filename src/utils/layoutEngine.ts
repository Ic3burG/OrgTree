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

import dagre from 'dagre';

interface NodeData {
  isExpanded?: boolean;
  people?: unknown[];
  [key: string]: unknown;
}

interface FlowNode {
  id: string;
  data: NodeData;
  position?: { x: number; y: number };
  [key: string]: unknown;
}

interface FlowEdge {
  source: string;
  target: string;
  [key: string]: unknown;
}

type Direction = 'TB' | 'LR';

interface NodeDimensions {
  width: number;
  height: number;
}

/**
 * Calculate hierarchical layout positions for org chart nodes using Dagre
 * @param nodes - React Flow node objects
 * @param edges - React Flow edge objects
 * @param direction - 'TB' (top-to-bottom) or 'LR' (left-to-right)
 * @returns Nodes with calculated positions
 */
export function calculateLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: Direction = 'TB'
): FlowNode[] {
  const g = new dagre.graphlib.Graph();

  // Configure graph layout
  g.setGraph({
    rankdir: direction, // 'TB' (vertical) or 'LR' (horizontal)
    nodesep: 80, // horizontal spacing between nodes at same level
    ranksep: 120, // vertical spacing between hierarchy levels
    marginx: 40,
    marginy: 40,
    // No align property - uses default centering for balanced layout
    ranker: 'tight-tree', // better for tree-like structures
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes with their dimensions
  nodes.forEach((node: FlowNode) => {
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
  edges.forEach((edge: FlowEdge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Run Dagre layout algorithm
  dagre.layout(g);

  // Apply calculated positions to nodes
  // Dagre positions are center-based, React Flow uses top-left corner
  return nodes.map((node: FlowNode) => {
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
export function getNodeDimensions(isExpanded: boolean, peopleCount: number): NodeDimensions {
  const width = isExpanded ? 280 : 220;
  const baseHeight = 70;
  // Cap at 384px (max-h-96) to match the scrollable container
  const peopleHeight = isExpanded ? Math.min(peopleCount * 48, 384) : 0;
  const height = baseHeight + peopleHeight;

  return { width, height };
}
