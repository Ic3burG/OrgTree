# Organizational Hierarchy Display for People

> **Status**: Planned  
> **Created**: January 22, 2026  
> **Priority**: High  
> **Complexity**: Medium

## Overview

Enhance person detail views to display the complete upstream organizational hierarchy (reporting chain) from the person's department up to the root. This provides critical context about where someone sits in the organization and their reporting structure. Display this in both the Org Map DetailPanel and the People tab.

## User Story

**As a** user viewing a person's details  
**I want** to see their complete reporting chain and organizational hierarchy  
**So that** I understand where they fit in the organization and who they report up to

## Current Behavior

### DetailPanel (Org Map)

- Shows basic department path as plain text (lines 201-213)
- Path extracted from `person.path` property (e.g., "Division / Department")
- No clickable navigation
- No visual hierarchy representation
- Limited to immediate department only

### PersonManager (People Tab)

- Shows department name in table column
- No hierarchy information visible
- No drill-down capability

## Proposed Behavior

### Visual Hierarchy Component

Create a rich, interactive organizational breadcrumb showing the full reporting chain:

```
CEO Office → Operations → Engineering → Frontend Team
```

**Features**:

- **Clickable Breadcrumbs**: Each level is clickable to navigate
- **Visual Separators**: Arrows (→) or chevrons (›) between levels
- **Hover Effects**: Highlight on hover with tooltips
- **Truncation**: Smart truncation for long names with tooltips
- **Icons**: Department icons at each level
- **Color Coding**: Optional depth-based coloring matching org map theme

### DetailPanel Enhancement

**Before**:

```
Department
🏢 Operations / Engineering
```

**After**:

```
Organizational Hierarchy
🏢 CEO Office → 🏢 Operations → 🏢 Engineering → 🏢 Frontend Team
                                                      ↑ You are here
```

### People Tab Enhancement

Add expandable hierarchy view in person rows or detail modal:

**Option A: Inline Expansion**

```
Name              Department        Hierarchy
John Doe         Frontend Team      [Show Hierarchy ▼]
                                    └─ CEO Office → Operations → Engineering → Frontend Team
```

**Option B: Hover Tooltip**

```
Name              Department
John Doe         Frontend Team 🔗
                 (hover shows full hierarchy)
```

**Option C: Detail Modal**

- Click person name → Opens modal with full details including hierarchy

## Technical Implementation

### Architecture Changes

#### 1. Create Hierarchy Utility: `departmentHierarchy.ts`

```typescript
// src/utils/departmentHierarchy.ts
import type { Department } from '../types/index.js';

export interface HierarchyLevel {
  id: string;
  name: string;
  depth: number;
}

/**
 * Build the full hierarchy chain from a department to root
 * @param departmentId - Starting department ID
 * @param departments - All departments in organization
 * @returns Array of hierarchy levels from root to current department
 */
export function buildHierarchyChain(
  departmentId: string,
  departments: Department[]
): HierarchyLevel[] {
  const deptMap = new Map(departments.map(d => [d.id, d]));
  const chain: HierarchyLevel[] = [];
  const visited = new Set<string>();

  let currentId: string | null = departmentId;
  let depth = 0;

  // Build chain from current to root
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const dept = deptMap.get(currentId);

    if (!dept) break;

    chain.unshift({
      id: dept.id,
      name: dept.name,
      depth,
    });

    currentId = dept.parent_id;
    depth++;
  }

  return chain;
}

/**
 * Get formatted hierarchy path as string
 * @param departmentId - Starting department ID
 * @param departments - All departments
 * @param separator - Separator between levels (default: ' → ')
 * @returns Formatted string like "CEO → Operations → Engineering"
 */
export function getHierarchyPath(
  departmentId: string,
  departments: Department[],
  separator: string = ' → '
): string {
  const chain = buildHierarchyChain(departmentId, departments);
  return chain.map(level => level.name).join(separator);
}
```

#### 2. Create Hierarchy Component: `OrganizationalHierarchy.tsx`

```typescript
// src/components/OrganizationalHierarchy.tsx
import React from 'react';
import { ChevronRight, Building } from 'lucide-react';
import type { HierarchyLevel } from '../utils/departmentHierarchy';

interface OrganizationalHierarchyProps {
  hierarchy: HierarchyLevel[];
  currentDepartmentId: string;
  onNavigate?: (departmentId: string) => void;
  compact?: boolean;
  showIcons?: boolean;
}

export default function OrganizationalHierarchy({
  hierarchy,
  currentDepartmentId,
  onNavigate,
  compact = false,
  showIcons = true,
}: OrganizationalHierarchyProps): React.JSX.Element {
  if (hierarchy.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-sm">No hierarchy available</p>;
  }

  return (
    <div className="flex items-center flex-wrap gap-2">
      {hierarchy.map((level, index) => {
        const isLast = index === hierarchy.length - 1;
        const isCurrent = level.id === currentDepartmentId;

        return (
          <React.Fragment key={level.id}>
            {/* Department Level */}
            <div
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded-md transition-all
                ${isCurrent
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }
                ${onNavigate && !isCurrent
                  ? 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600'
                  : ''
                }
              `}
              onClick={() => onNavigate && !isCurrent && onNavigate(level.id)}
              title={level.name}
            >
              {showIcons && (
                <Building
                  size={14}
                  className={isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}
                />
              )}
              <span className={`text-sm ${compact ? 'max-w-[100px]' : 'max-w-[150px]'} truncate`}>
                {level.name}
              </span>
              {isCurrent && (
                <span className="text-xs opacity-75 ml-1">(current)</span>
              )}
            </div>

            {/* Separator */}
            {!isLast && (
              <ChevronRight
                size={16}
                className="text-slate-400 dark:text-slate-500 flex-shrink-0"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
```

#### 3. Update `DetailPanel.tsx`

Replace the simple department path with rich hierarchy:

```typescript
// Add imports
import OrganizationalHierarchy from './OrganizationalHierarchy';
import { buildHierarchyChain } from '../utils/departmentHierarchy';

// Add props
interface DetailPanelProps {
  person: Person | null;
  onClose: () => void;
  fieldDefinitions?: CustomFieldDefinition[];
  onEdit?: (person: Person) => void;
  departments?: Department[];  // NEW: Pass departments for hierarchy
  onNavigateToDepartment?: (departmentId: string) => void;  // NEW: Navigation callback
}

// In component
const hierarchy = departments
  ? buildHierarchyChain(person.department_id, departments)
  : [];

// Replace lines 201-213 with:
{hierarchy.length > 0 && (
  <div className="space-y-3 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
      <Building size={18} className="text-slate-500 dark:text-slate-400" />
      Organizational Hierarchy
    </h4>
    <OrganizationalHierarchy
      hierarchy={hierarchy}
      currentDepartmentId={person.department_id}
      onNavigate={onNavigateToDepartment}
      showIcons={true}
    />
  </div>
)}
```

#### 4. Update `OrgMap.tsx`

Pass departments and navigation handler to DetailPanel:

```typescript
<DetailPanel
  person={selectedPerson}
  onClose={handleCloseDetail}
  fieldDefinitions={fieldDefinitions}
  onEdit={canEdit ? handleEditPerson : undefined}
  departments={flatDepartments}  // NEW
  onNavigateToDepartment={handleNavigateToDepartment}  // NEW
/>

// Add navigation handler
const handleNavigateToDepartment = useCallback((departmentId: string) => {
  // Close detail panel
  setSelectedPerson(null);

  // Find and zoom to department node
  const node = nodes.find(n => n.id === departmentId);
  if (node && node.position) {
    setCenter(node.position.x + 110, node.position.y + 35, { zoom: 1.5, duration: 800 });
    setHighlightedNodeId(departmentId);
    setTimeout(() => setHighlightedNodeId(null), 3000);
  }
}, [nodes, setCenter]);
```

#### 5. Update `PersonManager.tsx` (People Tab)

**Option A: Add Hierarchy Column**

```typescript
// In PersonList component, add hierarchy column
<th>Hierarchy</th>

// In PersonItem component
<td>
  <button
    onClick={() => setShowHierarchy(!showHierarchy)}
    className="text-blue-600 hover:text-blue-800 text-sm"
  >
    {showHierarchy ? 'Hide' : 'Show'} Hierarchy
  </button>
  {showHierarchy && (
    <div className="mt-2">
      <OrganizationalHierarchy
        hierarchy={buildHierarchyChain(person.department_id, departments)}
        currentDepartmentId={person.department_id}
        compact={true}
      />
    </div>
  )}
</td>
```

**Option B: Enhanced Tooltip**

```typescript
// Add tooltip on department name hover
<Tooltip content={
  <OrganizationalHierarchy
    hierarchy={buildHierarchyChain(person.department_id, departments)}
    currentDepartmentId={person.department_id}
    compact={true}
  />
}>
  <span className="cursor-help">{person.departmentName} 🔗</span>
</Tooltip>
```

### API Changes (Optional Enhancement)

Currently, departments are already loaded. No API changes required unless we want to optimize:

**Optional: Add hierarchy to Person API response**

```typescript
// server/src/routes/people.ts
// Add hierarchy field to person response
interface PersonWithHierarchy extends Person {
  hierarchy?: {
    id: string;
    name: string;
    depth: number;
  }[];
}
```

### Performance Considerations

1. **Memoization**: Memoize hierarchy calculation for each person
2. **Caching**: Cache department map for quick lookups
3. **Lazy Loading**: Only calculate hierarchy when detail panel opens
4. **Batch Processing**: Pre-calculate hierarchies for visible people in list view

### Testing Strategy

#### Unit Tests

**File**: `src/utils/departmentHierarchy.test.ts` (new file)

```typescript
import { buildHierarchyChain, getHierarchyPath } from './departmentHierarchy';

describe('buildHierarchyChain', () => {
  const departments = [
    { id: '1', name: 'CEO Office', parent_id: null },
    { id: '2', name: 'Operations', parent_id: '1' },
    { id: '3', name: 'Engineering', parent_id: '2' },
    { id: '4', name: 'Frontend', parent_id: '3' },
  ];

  it('should build correct hierarchy chain', () => {
    const chain = buildHierarchyChain('4', departments);
    expect(chain).toHaveLength(4);
    expect(chain[0].name).toBe('CEO Office');
    expect(chain[3].name).toBe('Frontend');
  });

  it('should handle root department', () => {
    const chain = buildHierarchyChain('1', departments);
    expect(chain).toHaveLength(1);
    expect(chain[0].name).toBe('CEO Office');
  });

  it('should handle circular references', () => {
    const circular = [
      { id: '1', name: 'A', parent_id: '2' },
      { id: '2', name: 'B', parent_id: '1' },
    ];
    const chain = buildHierarchyChain('1', circular);
    expect(chain.length).toBeLessThanOrEqual(2);
  });

  it('should handle missing department', () => {
    const chain = buildHierarchyChain('999', departments);
    expect(chain).toHaveLength(0);
  });
});

describe('getHierarchyPath', () => {
  const departments = [
    { id: '1', name: 'CEO', parent_id: null },
    { id: '2', name: 'Ops', parent_id: '1' },
    { id: '3', name: 'Eng', parent_id: '2' },
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
```

**File**: `src/components/OrganizationalHierarchy.test.tsx` (new file)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import OrganizationalHierarchy from './OrganizationalHierarchy';

describe('OrganizationalHierarchy', () => {
  const hierarchy = [
    { id: '1', name: 'CEO Office', depth: 0 },
    { id: '2', name: 'Operations', depth: 1 },
    { id: '3', name: 'Engineering', depth: 2 },
  ];

  it('should render all hierarchy levels', () => {
    render(
      <OrganizationalHierarchy
        hierarchy={hierarchy}
        currentDepartmentId="3"
      />
    );

    expect(screen.getByText('CEO Office')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('should highlight current department', () => {
    render(
      <OrganizationalHierarchy
        hierarchy={hierarchy}
        currentDepartmentId="2"
      />
    );

    const current = screen.getByText('Operations').closest('div');
    expect(current).toHaveClass('bg-blue-100');
  });

  it('should call onNavigate when clicking non-current department', () => {
    const onNavigate = vi.fn();
    render(
      <OrganizationalHierarchy
        hierarchy={hierarchy}
        currentDepartmentId="3"
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByText('Operations'));
    expect(onNavigate).toHaveBeenCalledWith('2');
  });

  it('should not call onNavigate for current department', () => {
    const onNavigate = vi.fn();
    render(
      <OrganizationalHierarchy
        hierarchy={hierarchy}
        currentDepartmentId="2"
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByText('Operations'));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
```

#### Manual Testing

1. **Org Map DetailPanel**:
   - Open org map
   - Click on a person in a deep department (3+ levels)
   - ✅ Verify full hierarchy displays
   - ✅ Click on parent department → zooms to that department
   - ✅ Verify current department is highlighted

2. **People Tab**:
   - Navigate to People tab
   - Find person in nested department
   - ✅ Verify hierarchy is visible (depending on chosen option)
   - ✅ Test hover tooltip or expansion

3. **Edge Cases**:
   - Person in root department (no parents)
   - Person in very deep hierarchy (7+ levels)
   - Department with very long names
   - Mobile view (responsive layout)

### Accessibility

- **ARIA Labels**: `aria-label="Organizational hierarchy breadcrumb"`
- **Keyboard Navigation**: Tab through hierarchy levels, Enter to navigate
- **Screen Reader**: Announce full hierarchy path
- **Focus Management**: Visible focus indicators on clickable levels
- **Semantic HTML**: Use `<nav>` for breadcrumb structure

### Mobile Considerations

- **Responsive Layout**: Stack hierarchy vertically on narrow screens
- **Touch Targets**: Minimum 44x44px touch targets
- **Scrollable**: Horizontal scroll for very long hierarchies
- **Truncation**: Shorter max-width for department names on mobile

## Success Metrics

- Users can quickly understand reporting structure
- Reduced time to find organizational context
- Increased navigation efficiency in org map
- Positive user feedback on hierarchy visibility
- No performance degradation with large org structures

## Related Features

- Department hierarchy highlighting (planned) - visual path on org map
- Org map navigation - zoom to departments
- Search functionality - find people by hierarchy
- Export features - include hierarchy in exports

---

**Document Owner**: Development Team  
**Last Updated**: January 22, 2026
