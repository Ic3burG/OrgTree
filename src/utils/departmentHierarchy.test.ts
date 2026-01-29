import { describe, it, expect } from 'vitest';
import { buildHierarchyChain, getHierarchyPath, buildAncestorMap } from './departmentHierarchy';
import { Department } from '../types';

describe('buildHierarchyChain', () => {
  const depts: Department[] = [
    {
      id: '1',
      name: 'CEO Office',
      parent_id: null,
      organization_id: 'org1',
      sort_order: 0,
      created_at: '',
      updated_at: '',
      description: '',
      deleted_at: null,
    },
    {
      id: '2',
      name: 'Operations',
      parent_id: '1',
      organization_id: 'org1',
      sort_order: 0,
      created_at: '',
      updated_at: '',
      description: '',
      deleted_at: null,
    },
    {
      id: '3',
      name: 'Engineering',
      parent_id: '2',
      organization_id: 'org1',
      sort_order: 0,
      created_at: '',
      updated_at: '',
      description: '',
      deleted_at: null,
    },
    {
      id: '4',
      name: 'Frontend',
      parent_id: '3',
      organization_id: 'org1',
      sort_order: 0,
      created_at: '',
      updated_at: '',
      description: '',
      deleted_at: null,
    },
  ];

  it('should build correct hierarchy chain', () => {
    const chain = buildHierarchyChain('4', depts);
    expect(chain).toHaveLength(4);
    expect(chain[0]?.name).toBe('CEO Office');
    expect(chain[3]?.name).toBe('Frontend');
  });

  it('should handle root department', () => {
    const chain = buildHierarchyChain('1', depts);
    expect(chain).toHaveLength(1);
    expect(chain[0]?.name).toBe('CEO Office');
  });

  it('should handle circular references', () => {
    const circularDepts: Department[] = [
      {
        id: '1',
        name: 'A',
        parent_id: '2',
        organization_id: 'org1',
        sort_order: 0,
        created_at: '',
        updated_at: '',
        description: '',
        deleted_at: null,
      },
      {
        id: '2',
        name: 'B',
        parent_id: '1',
        organization_id: 'org1',
        sort_order: 0,
        created_at: '',
        updated_at: '',
        description: '',
        deleted_at: null,
      },
    ];
    const chain = buildHierarchyChain('1', circularDepts);
    expect(chain.length).toBeLessThanOrEqual(2);
  });

  it('should handle missing department', () => {
    const chain = buildHierarchyChain('999', depts);
    expect(chain).toHaveLength(0);
  });
});

describe('getHierarchyPath', () => {
  const departments = [
    { id: '1', name: 'CEO', parent_id: null } as unknown as Department,
    { id: '2', name: 'Ops', parent_id: '1' } as unknown as Department,
    { id: '3', name: 'Eng', parent_id: '2' } as unknown as Department,
  ];

  it('should format hierarchy path with default separator', () => {
    const path = getHierarchyPath('3', departments);
    expect(path).toBe('CEO → Ops → Eng');
  });

  it('should format hierarchy path with custom separator', () => {
    const path = getHierarchyPath('3', departments, ' / ');
    expect(path).toBe('CEO / Ops / Eng');
  });
});

describe('buildAncestorMap', () => {
  const departments = [
    { id: '1', name: 'Root', parent_id: null } as unknown as Department,
    { id: '2', name: 'Child1', parent_id: '1' } as unknown as Department,
    { id: '3', name: 'Child2', parent_id: '1' } as unknown as Department,
    { id: '4', name: 'Grandchild', parent_id: '2' } as unknown as Department,
  ];

  it('should build map of ancestors for all departments', () => {
    const ancestorMap = buildAncestorMap(departments);

    // Root has no ancestors (except self)
    expect(ancestorMap.get('1')).toEqual(['1']);

    // Child1 has Root as ancestor
    expect(ancestorMap.get('2')).toEqual(['2', '1']);

    // Grandchild has Child1 and Root as ancestors
    expect(ancestorMap.get('4')).toEqual(expect.arrayContaining(['4', '2', '1']));
    expect(ancestorMap.get('4')).toHaveLength(3);
  });

  it('should handle empty departments array', () => {
    const ancestorMap = buildAncestorMap([]);
    expect(ancestorMap.size).toBe(0);
  });
});
