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
        expect(node.position.x).toBeDefined();
        expect(node.position.y).toBeDefined();
        // Since initial positions were 0,0, they should likely change or at least be numbers
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });

      // Root should be above children in TB layout
      const root = layoutNodes.find(n => n.id === '1');
      const child1 = layoutNodes.find(n => n.id === '2');
      const child2 = layoutNodes.find(n => n.id === '3');

      expect(root?.position.y).toBeLessThan(child1?.position.y!);
      expect(root?.position.y).toBeLessThan(child2?.position.y!);
    });

    it('handles LR direction', () => {
      const layoutNodes = calculateLayout(nodes, edges, 'LR');
      
      const root = layoutNodes.find(n => n.id === '1');
      const child1 = layoutNodes.find(n => n.id === '2');

      // In LR, root x should be less than child x
      expect(root?.position.x).toBeLessThan(child1?.position.x!);
    });

    it('handles isolated nodes', () => {
      const isolatedNodes = [{ id: '1', data: { label: 'Lone' }, position: { x: 0, y: 0 } }];
      const layoutNodes = calculateLayout(isolatedNodes, []);
      
      expect(layoutNodes).toHaveLength(1);
      expect(layoutNodes[0].position.x).toBeDefined();
      expect(layoutNodes[0].position.y).toBeDefined();
    });
  });
});
