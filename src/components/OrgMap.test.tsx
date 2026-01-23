import { describe, it, expect } from 'vitest';
import { buildAncestorMap } from './OrgMap';
import { Department } from '../types';

describe('buildAncestorMap', () => {
  it('should build correct ancestor chains for a simple hierarchy', () => {
    const departments: Department[] = [
      { id: '1', name: 'Root', parent_id: null, people: [] },
      { id: '2', name: 'Child', parent_id: '1', people: [] },
      { id: '3', name: 'Grandchild', parent_id: '2', people: [] },
    ] as Department[];

    const ancestorMap = buildAncestorMap(departments);

    expect(ancestorMap.get('1')).toEqual(['1']);
    expect(ancestorMap.get('2')).toEqual(['2', '1']);
    expect(ancestorMap.get('3')).toEqual(['3', '2', '1']);
  });

  it('should handle disjoint trees', () => {
    const departments: Department[] = [
      { id: 'A', name: 'Root A', parent_id: null },
      { id: 'B', name: 'Child A', parent_id: 'A' },
      { id: 'X', name: 'Root X', parent_id: null },
      { id: 'Y', name: 'Child X', parent_id: 'X' },
    ] as Department[];

    const ancestorMap = buildAncestorMap(departments);

    expect(ancestorMap.get('B')).toEqual(['B', 'A']);
    expect(ancestorMap.get('Y')).toEqual(['Y', 'X']);
  });

  it('should handle circular references gracefully (break cycle)', () => {
    // Note: getDepth handles cycle detection warning, buildAncestorMap recursively calls getAncestors
    // We explicitly laid out protection in getAncestors with visited Set
    const departments: Department[] = [
      { id: '1', name: 'A', parent_id: '2' },
      { id: '2', name: 'B', parent_id: '1' },
    ] as Department[];

    const ancestorMap = buildAncestorMap(departments);

    // It should just return the path until it hits visited
    // 1 -> 2 -> 1 (stop)
    expect(ancestorMap.get('1')).toEqual(['1', '2']);
    expect(ancestorMap.get('2')).toEqual(['2', '1']);
  });
});
