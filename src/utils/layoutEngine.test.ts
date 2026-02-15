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

import { describe, it, expect } from 'vitest';
import { calculateLayout, getNodeDimensions } from './layoutEngine';

describe('layoutEngine', () => {
  describe('getNodeDimensions', () => {
    it('returns correct dimensions for collapsed node', () => {
      const dims = getNodeDimensions(false, 5);
      expect(dims).toEqual({ width: 220, height: 70 });
    });

    it('returns correct dimensions for expanded node with few people', () => {
      const dims = getNodeDimensions(true, 2);
      expect(dims).toEqual({ width: 280, height: 70 + 2 * 48 });
    });

    it('returns correct dimensions for expanded node with many people (capped height)', () => {
      // 10 people * 48px = 480px, but cap is 384px
      const dims = getNodeDimensions(true, 10);
      expect(dims).toEqual({ width: 280, height: 70 + 384 });
    });

    it('returns correct dimensions for expanded node with 0 people', () => {
      const dims = getNodeDimensions(true, 0);
      expect(dims).toEqual({ width: 280, height: 70 });
    });
  });

  describe('calculateLayout', () => {
    const nodes = [
      { id: '1', data: { label: 'Root' }, position: { x: 0, y: 0 } },
      { id: '2', data: { label: 'Child 1' }, position: { x: 0, y: 0 } },
      { id: '3', data: { label: 'Child 2' }, position: { x: 0, y: 0 } },
    ];

    const edges = [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e1-3', source: '1', target: '3' },
    ];

    it('calculates layout positions', () => {
      const layoutNodes = calculateLayout(nodes, edges);

      expect(layoutNodes).toHaveLength(3);
      layoutNodes.forEach(node => {
        if (!node.position) throw new Error('Node position undefined');
        expect(node.position.x).toBeDefined();
        expect(node.position.y).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });

      // Root should be above children in TB layout
      const root = layoutNodes.find(n => n.id === '1');
      const child1 = layoutNodes.find(n => n.id === '2');
      const child2 = layoutNodes.find(n => n.id === '3');

      expect(root).toBeDefined();
      expect(child1).toBeDefined();
      expect(child2).toBeDefined();
      if (!root?.position || !child1?.position || !child2?.position) return;

      expect(root.position.y).toBeLessThan(child1.position.y);
      expect(root.position.y).toBeLessThan(child2.position.y);
    });

    it('handles LR direction', () => {
      const layoutNodes = calculateLayout(nodes, edges, 'LR');

      const root = layoutNodes.find(n => n.id === '1');
      const child1 = layoutNodes.find(n => n.id === '2');

      // In LR, root x should be less than child x
      expect(root).toBeDefined();
      expect(child1).toBeDefined();
      if (!root?.position || !child1?.position) return;

      // In LR, root x should be less than child x
      expect(root.position.x).toBeLessThan(child1.position.x);
    });

    it('handles isolated nodes', () => {
      const isolatedNodes = [{ id: '1', data: { label: 'Lone' }, position: { x: 0, y: 0 } }];
      const layoutNodes = calculateLayout(isolatedNodes, []);

      expect(layoutNodes).toHaveLength(1);
      if (!layoutNodes[0]) return;
      expect(layoutNodes[0].position).toBeDefined();
      expect(layoutNodes[0].position?.x).toBeDefined();
      expect(layoutNodes[0].position?.y).toBeDefined();
    });

    it('should center root node in vertical layout', () => {
      const nodes = [
        { id: '1', data: { name: 'Root' }, position: { x: 0, y: 0 } },
        { id: '2', data: { name: 'Child 1' }, position: { x: 0, y: 0 } },
        { id: '3', data: { name: 'Child 2' }, position: { x: 0, y: 0 } },
      ];
      const edges = [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e1-3', source: '1', target: '3' },
      ];

      const layouted = calculateLayout(nodes, edges, 'TB');

      // Root should be centered between its children
      const root = layouted.find(n => n.id === '1');
      const child1 = layouted.find(n => n.id === '2');
      const child2 = layouted.find(n => n.id === '3');

      expect(root).toBeDefined();
      expect(child1).toBeDefined();
      expect(child2).toBeDefined();

      if (!root?.position || !child1?.position || !child2?.position) return;

      // Root x position should be between child1 and child2
      const rootX = root.position.x;
      const child1X = child1.position.x;
      const child2X = child2.position.x;

      expect(rootX).toBeGreaterThan(Math.min(child1X, child2X));
      expect(rootX).toBeLessThan(Math.max(child1X, child2X));
    });

    it('should maintain proper alignment in horizontal layout', () => {
      const nodes = [
        { id: '1', data: { name: 'Root' }, position: { x: 0, y: 0 } },
        { id: '2', data: { name: 'Child 1' }, position: { x: 0, y: 0 } },
        { id: '3', data: { name: 'Child 2' }, position: { x: 0, y: 0 } },
      ];
      const edges = [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e1-3', source: '1', target: '3' },
      ];

      const layouted = calculateLayout(nodes, edges, 'LR');

      // In horizontal layout, nodes should still be properly positioned
      const root = layouted.find(n => n.id === '1');
      const child1 = layouted.find(n => n.id === '2');

      expect(root).toBeDefined();
      expect(child1).toBeDefined();

      if (!root?.position || !child1?.position) return;

      // Root should be to the left of children in LR layout
      expect(root.position.x).toBeLessThan(child1.position.x);
    });
  });
});
