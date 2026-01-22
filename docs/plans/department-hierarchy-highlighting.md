# Department Hierarchy Highlighting Feature

> **Status**: Planned  
> **Created**: January 22, 2026  
> **Priority**: Medium  
> **Complexity**: Medium

## Overview

Enhance the Org Map to visually highlight the entire hierarchical path from a department up to the root when a user hovers over or clicks on a department node. This will make it easier to understand organizational structure and department relationships at a glance.

## User Story

**As a** user viewing the organization map  
**I want** to see the entire reporting chain highlighted when I interact with a department  
**So that** I can quickly understand where a department fits in the organizational hierarchy

## Current Behavior

- Department nodes can be expanded/collapsed to show people
- Departments are color-coded by depth level
- Individual departments can be highlighted via URL parameters
- No visual indication of parent-child relationships beyond the connecting lines

## Proposed Behavior

### Interaction Modes

1. **Hover (Desktop)**
   - When hovering over a department node header, all ancestor departments (parent, grandparent, etc.) should have their connecting edges highlighted in bold
   - The hovered department and all ancestors should have a subtle visual emphasis (e.g., increased opacity, glow effect)
   - Hover should have a small delay (~200ms) to prevent flickering during mouse movement

2. **Click (All Devices)**
   - When clicking on a department node header (not the expand/collapse action), toggle a "selected" state
   - Selected department and all ancestors should have persistent highlighting
   - Clicking another department should transfer the selection
   - Clicking the same department again should deselect it
   - This provides a touch-friendly alternative for mobile devices

### Visual Design

**Highlighted Edges:**

- Stroke width: 4px (increased from default 2px)
- Color: Blue (#3b82f6) or theme-appropriate accent color
- Animation: Smooth transition (200ms ease-in-out)
- Z-index: Ensure highlighted edges render above non-highlighted edges

**Highlighted Nodes:**

- Border: 2px solid blue ring (using existing `ring-2 ring-blue-500` pattern)
- Background: Slightly increased opacity or subtle glow effect
- Maintain existing color scheme but with enhanced visibility

**Hierarchy Path Indicator:**

- Optional: Add a subtle breadcrumb or path indicator showing the full hierarchy
- Example: "Root → Division → Department → Sub-Department"

## Technical Implementation

### Architecture Changes

#### 1. State Management (`OrgMap.tsx`)

Add new state variables:

```typescript
const [hoveredDepartmentId, setHoveredDepartmentId] = useState<string | null>(null);
const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
```

#### 2. Hierarchy Tracking

Create a utility function to build ancestor chains:

```typescript
/**
 * Build a map of department ID to array of ancestor IDs
 * @param departments - All departments
 * @returns Map of department ID to ancestor IDs (including self)
 */
function buildAncestorMap(departments: Department[]): Map<string, string[]> {
  const deptMap = new Map(departments.map(d => [d.id, d]));
  const ancestorMap = new Map<string, string[]>();

  function getAncestors(deptId: string, visited = new Set<string>()): string[] {
    if (visited.has(deptId)) return []; // Prevent infinite loops
    visited.add(deptId);

    const dept = deptMap.get(deptId);
    if (!dept) return [];

    const ancestors = [deptId];
    if (dept.parent_id) {
      ancestors.push(...getAncestors(dept.parent_id, visited));
    }
    return ancestors;
  }

  departments.forEach(dept => {
    ancestorMap.set(dept.id, getAncestors(dept.id));
  });

  return ancestorMap;
}
```

#### 3. Edge Highlighting Logic

Modify edge creation in `transformToFlowData`:

```typescript
// In transformToFlowData function
const ancestorMap = buildAncestorMap(departments);

// When creating edges
const isHighlighted =
  (hoveredDepartmentId && ancestorMap.get(hoveredDepartmentId)?.includes(dept.id)) ||
  (selectedDepartmentId && ancestorMap.get(selectedDepartmentId)?.includes(dept.id));

edges.push({
  id: `${dept.parent_id}-${dept.id}`,
  source: dept.parent_id,
  target: dept.id,
  type: 'smoothstep',
  animated: false,
  style: {
    stroke: isHighlighted ? '#3b82f6' : '#94a3b8',
    strokeWidth: isHighlighted ? 4 : 2,
    transition: 'all 200ms ease-in-out',
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: isHighlighted ? '#3b82f6' : '#94a3b8',
    width: 20,
    height: 20,
  },
  zIndex: isHighlighted ? 1000 : 1,
});
```

#### 4. Node Highlighting

Update node data to include highlighting state:

```typescript
// In transformToFlowData
const isInHierarchy =
  (hoveredDepartmentId && ancestorMap.get(hoveredDepartmentId)?.includes(dept.id)) ||
  (selectedDepartmentId && ancestorMap.get(selectedDepartmentId)?.includes(dept.id));

nodes.push({
  id: dept.id,
  type: 'department',
  position: { x: 0, y: 0 }, // Will be set by layout
  data: {
    id: dept.id,
    name: dept.name,
    depth,
    people: dept.people || [],
    description: dept.description,
    isExpanded: expandedNodes.has(dept.id),
    isHighlighted: isInHierarchy,
    onToggleExpand: () => handleToggleExpand(dept.id),
    onSelectPerson,
    onHover: (isHovering: boolean) => {
      setHoveredDepartmentId(isHovering ? dept.id : null);
    },
    onSelect: () => {
      setSelectedDepartmentId(prev => (prev === dept.id ? null : dept.id));
    },
  },
});
```

#### 5. DepartmentNode Component Updates (`DepartmentNode.tsx`)

Add hover and click handlers:

```typescript
interface DepartmentNodeData {
  // ... existing fields
  onHover?: (isHovering: boolean) => void;
  onSelect?: () => void;
}

function DepartmentNode({ data, selected }: NodeProps<DepartmentNodeData>) {
  const { onHover, onSelect, isHighlighted } = data;

  const handleMouseEnter = () => {
    if (onHover && !isTouchDevice) {
      onHover(true);
    }
  };

  const handleMouseLeave = () => {
    if (onHover && !isTouchDevice) {
      onHover(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
    }
  };

  return (
    <div
      className={`
        rounded-lg shadow-lg transition-all duration-200
        ${isHighlighted ? 'ring-2 ring-blue-500 shadow-blue-500/50' : ''}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* ... rest of component */}
    </div>
  );
}
```

### Performance Considerations

1. **Memoization**: Use `useMemo` for ancestor map calculation
2. **Debouncing**: Add small delay to hover events to prevent excessive re-renders
3. **Edge Updates**: React Flow efficiently handles edge style updates
4. **Large Hierarchies**: Test with 100+ departments to ensure smooth performance

### Accessibility

- Add ARIA labels to indicate hierarchy relationships
- Ensure keyboard navigation can trigger the same highlighting
- Provide screen reader announcements for hierarchy changes
- Maintain sufficient color contrast for highlighted elements

### Dark Mode Support

- Use theme-aware colors for highlighting (blue-400 in dark mode, blue-600 in light mode)
- Ensure glow effects work well in both themes
- Test edge visibility against both light and dark backgrounds

## Testing Strategy

### Unit Tests

**File**: `src/components/OrgMap.test.tsx`

1. Test `buildAncestorMap` function:

   ```typescript
   describe('buildAncestorMap', () => {
     it('should build correct ancestor chains', () => {
       const departments = [
         { id: '1', name: 'Root', parent_id: null },
         { id: '2', name: 'Child', parent_id: '1' },
         { id: '3', name: 'Grandchild', parent_id: '2' },
       ];
       const ancestorMap = buildAncestorMap(departments);
       expect(ancestorMap.get('3')).toEqual(['3', '2', '1']);
     });

     it('should handle circular references', () => {
       // Test with circular parent_id relationships
     });
   });
   ```

2. Test hover state management
3. Test click selection toggling

**File**: `src/components/DepartmentNode.test.tsx`

1. Test hover callbacks are triggered
2. Test click callbacks are triggered
3. Test highlighting styles are applied
4. Test touch device behavior (no hover)

### Integration Tests

**File**: `e2e/org-map-hierarchy.spec.ts` (Playwright)

```typescript
test.describe('Department Hierarchy Highlighting', () => {
  test('should highlight ancestors on hover', async ({ page }) => {
    await page.goto('/org-map');

    // Hover over a department
    const department = page.locator('[data-testid="department-node-3"]');
    await department.hover();

    // Check that ancestors are highlighted
    const parentEdge = page.locator('[data-edge-id="2-3"]');
    await expect(parentEdge).toHaveCSS('stroke-width', '4px');
    await expect(parentEdge).toHaveCSS('stroke', 'rgb(59, 130, 246)');
  });

  test('should toggle selection on click', async ({ page }) => {
    await page.goto('/org-map');

    const department = page.locator('[data-testid="department-node-3"]');

    // First click - select
    await department.click();
    await expect(department).toHaveClass(/ring-2/);

    // Second click - deselect
    await department.click();
    await expect(department).not.toHaveClass(/ring-2/);
  });

  test('should work on mobile devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');
    await page.goto('/org-map');

    // Tap should select, not hover
    const department = page.locator('[data-testid="department-node-3"]');
    await department.tap();
    await expect(department).toHaveClass(/ring-2/);
  });
});
```

### Manual Testing Checklist

- [ ] Hover over various departments and verify ancestor highlighting
- [ ] Click departments to verify persistent selection
- [ ] Test on mobile/tablet devices (touch interaction)
- [ ] Verify performance with large org charts (100+ departments)
- [ ] Test in both light and dark modes
- [ ] Verify accessibility with keyboard navigation
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Check that expand/collapse still works correctly
- [ ] Verify highlighting doesn't interfere with existing features (search, URL highlighting)

## Edge Cases

1. **Circular References**: Departments with circular parent_id relationships (should be prevented by validation, but handle gracefully)
2. **Orphaned Departments**: Departments without valid parent_id
3. **Multiple Root Departments**: Organizations with multiple top-level departments
4. **Rapid Hover**: Quick mouse movements across multiple departments
5. **Concurrent Hover and Selection**: Both hover and click highlighting active simultaneously
6. **Deep Hierarchies**: Very deep nesting (10+ levels)

## Future Enhancements

1. **Breadcrumb Display**: Show full hierarchy path in a tooltip or header
2. **Highlight Descendants**: Option to highlight children instead of ancestors
3. **Highlight Siblings**: Show departments at the same level
4. **Configurable Highlighting**: User preference for hover vs. click behavior
5. **Animation Effects**: Animated "pulse" along the hierarchy path
6. **Export Highlighted Path**: Copy hierarchy path to clipboard

## Dependencies

- No new dependencies required
- Uses existing React Flow capabilities
- Leverages existing theme system

## Rollout Plan

1. **Phase 1**: Implement core hover highlighting (desktop only)
2. **Phase 2**: Add click selection for mobile support
3. **Phase 3**: Add visual polish (animations, glow effects)
4. **Phase 4**: Accessibility improvements
5. **Phase 5**: Optional breadcrumb/path display

## Success Metrics

- User feedback on improved navigation
- Reduced time to understand org structure
- Increased engagement with org map feature
- No performance degradation with large datasets

## Related Issues

- Existing department highlighting via URL parameters (should work together)
- Department search and filtering (should not conflict)
- Org map performance optimization (ensure no regression)

---

**Document Owner**: Development Team  
**Last Updated**: January 22, 2026
