import { describe, it, expect } from 'vitest';
import { buildHierarchyChain, getHierarchyPath } from './departmentHierarchy';
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
