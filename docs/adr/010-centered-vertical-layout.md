# ADR-010: Centered Vertical Layout

**Status**: Accepted
**Date**: 2026-01-25
**Deciders**: Development Team
**Tags**: ui, layout, visualizationLow

## Overview

Modify the vertical (top-to-bottom) layout algorithm to center the root department node horizontally instead of aligning it to the left. This will create a more balanced and visually appealing organization chart that better represents the hierarchical structure.

## User Story

**As a** user viewing the organization map in vertical layout  
**I want** the top of the organization to be centered horizontally  
**So that** the chart looks balanced and the hierarchy is more visually intuitive

## Current Behavior

- Vertical layout (TB - top-to-bottom) uses Dagre graph layout library
- Current alignment setting: `align: 'UL'` (up-left)
- Root department appears on the left side of the canvas
- Child departments branch out to the right
- Creates an unbalanced, left-heavy visual appearance

**Current Layout (Vertical)**:

```text
Root Dept
├── Child 1
│   ├── Grandchild 1
│   └── Grandchild 2
└── Child 2
    └── Grandchild 3
```

## Proposed Behavior

- Change alignment to center the root node horizontally
- Child departments should branch symmetrically when possible
- Maintain proper spacing and hierarchy visualization
- No changes to horizontal layout (LR - left-to-right)

**Proposed Layout (Vertical)**:

```text
        Root Dept
       /         \
   Child 1     Child 2
   /     \         \
Grand 1  Grand 2  Grand 3
```

## Technical Implementation

### Architecture Changes

#### 1. Update `layoutEngine.ts`

The fix is straightforward - change the Dagre alignment setting from `'UL'` to `undefined` or a centered option.

**Current Code** (lines 44-52):

```typescript
g.setGraph({
  rankdir: direction, // 'TB' (vertical) or 'LR' (horizontal)
  nodesep: 80, // horizontal spacing between nodes at same level
  ranksep: 120, // vertical spacing between hierarchy levels
  marginx: 40,
  marginy: 40,
  align: 'UL', // alignment: UL (up-left), UR, DL, DR
  ranker: 'tight-tree', // better for tree-like structures
});
```

**Proposed Change - Option A (Conditional Alignment)**:

```typescript
g.setGraph({
  rankdir: direction,
  nodesep: 80,
  ranksep: 120,
  marginx: 40,
  marginy: 40,
  // Center alignment for vertical layout, left alignment for horizontal
  align: direction === 'TB' ? undefined : 'UL',
  ranker: 'tight-tree',
});
```

**Proposed Change - Option B (Always Centered)**:

```typescript
g.setGraph({
  rankdir: direction,
  nodesep: 80,
  ranksep: 120,
  marginx: 40,
  marginy: 40,
  // Remove align property entirely for default centering
  ranker: 'tight-tree',
});
```

**Recommended**: **Option B** - Remove the `align` property entirely. Dagre's default behavior centers nodes, which works well for both vertical and horizontal layouts.

#### 2. Adjust Spacing (Optional Enhancement)

For better visual balance with centered layout, consider adjusting spacing:

```typescript
g.setGraph({
  rankdir: direction,
  // Increase horizontal spacing for better symmetry in TB layout
  nodesep: direction === 'TB' ? 100 : 80,
  ranksep: 120,
  marginx: 40,
  marginy: 40,
  ranker: 'tight-tree',
});
```

### Visual Comparison

**Before (Left-Aligned)**:

```text
CEO
├── Engineering
│   ├── Frontend
│   └── Backend
└── Sales
    └── Regional
```

**After (Centered)**:

```text
         CEO
    ┌─────┴─────┐
Engineering   Sales
  ┌──┴──┐        │
Front  Back  Regional
```

### Testing Strategy

#### Unit Tests

**File**: `src/utils/layoutEngine.test.ts` (existing file)

Add test cases to verify centered layout:

```typescript
describe('calculateLayout', () => {
  // ... existing tests

  it('should center root node in vertical layout', () => {
    const nodes = [
      { id: '1', data: { name: 'Root' } },
      { id: '2', data: { name: 'Child 1' } },
      { id: '3', data: { name: 'Child 2' } },
    ];
    const edges = [
      { source: '1', target: '2' },
      { source: '1', target: '3' },
    ];

    const layouted = calculateLayout(nodes, edges, 'TB');

    // Root should be centered between its children
    const root = layouted.find(n => n.id === '1');
    const child1 = layouted.find(n => n.id === '2');
    const child2 = layouted.find(n => n.id === '3');

    expect(root).toBeDefined();
    expect(child1).toBeDefined();
    expect(child2).toBeDefined();

    // Root x position should be between child1 and child2
    const rootX = root!.position!.x;
    const child1X = child1!.position!.x;
    const child2X = child2!.position!.x;

    expect(rootX).toBeGreaterThan(Math.min(child1X, child2X));
    expect(rootX).toBeLessThan(Math.max(child1X, child2X));
  });

  it('should maintain left alignment in horizontal layout', () => {
    const nodes = [
      { id: '1', data: { name: 'Root' } },
      { id: '2', data: { name: 'Child 1' } },
      { id: '3', data: { name: 'Child 2' } },
    ];
    const edges = [
      { source: '1', target: '2' },
      { source: '1', target: '3' },
    ];

    const layouted = calculateLayout(nodes, edges, 'LR');

    // In horizontal layout, nodes should still be properly positioned
    const root = layouted.find(n => n.id === '1');
    const child1 = layouted.find(n => n.id === '2');

    expect(root).toBeDefined();
    expect(child1).toBeDefined();

    // Root should be to the left of children in LR layout
    expect(root!.position!.x).toBeLessThan(child1!.position!.x);
  });
});
```

**How to Run**:

```bash
cd /Users/ojdavis/Claude\ Code/OrgTree
npm test -- src/utils/layoutEngine.test.ts
```

#### Visual/Manual Testing

**Test Plan**:

1. **Setup**: Navigate to Org Map with test data

   ```bash
   # Start development server
   npm run dev

   # Navigate to: http://localhost:5173/organizations/{orgId}/org-map
   ```

2. **Test Vertical Layout (TB)**:
   - Ensure layout is set to vertical (TB) using the layout toggle button
   - Verify root department is centered horizontally in the viewport
   - Verify child departments branch symmetrically from the root
   - Verify multi-level hierarchies maintain centered alignment
   - Test with various org structures:
     - Single root with 2 children
     - Single root with 5+ children
     - Deep hierarchy (4+ levels)
     - Wide hierarchy (10+ departments at one level)

3. **Test Horizontal Layout (LR)**:
   - Switch to horizontal layout using the layout toggle button
   - Verify layout still works correctly (should be unchanged)
   - Verify no regression in horizontal mode

4. **Test Expand/Collapse**:
   - Expand departments to show people
   - Verify layout recalculates correctly
   - Verify centered alignment is maintained

5. **Test fitView**:
   - Click the "Fit View" button in toolbar
   - Verify the entire chart fits in viewport with proper centering
   - Verify padding is appropriate

6. **Test Different Screen Sizes**:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
   - Verify centering works on all sizes

**Expected Results**:

- Root department appears centered horizontally
- Child departments branch symmetrically
- No visual glitches or overlapping nodes
- Smooth transitions when toggling layout
- fitView properly centers the entire chart

### Edge Cases

1. **Single Department**: Root with no children should be centered
2. **Unbalanced Tree**: Root with 1 child on left, 3 on right should still center root
3. **Very Wide Org**: 20+ departments at same level should handle gracefully
4. **Very Deep Org**: 10+ levels should maintain centering
5. **Mixed Expanded/Collapsed**: Some departments expanded, others collapsed
6. **After Data Refresh**: Layout recalculates correctly after adding/removing departments

### Performance Considerations

- **No Performance Impact**: This is a configuration change only
- Dagre layout algorithm performance remains the same
- No additional calculations required
- Layout recalculation triggers remain unchanged

### Accessibility

- **No Accessibility Impact**: This is purely visual positioning
- Screen readers are unaffected (they read the DOM tree, not visual position)
- Keyboard navigation remains unchanged
- Focus management is unaffected

### Dark Mode Support

- **No Dark Mode Impact**: Positioning is independent of theme
- Works identically in both light and dark modes

## Implementation Steps

1. **Update `layoutEngine.ts`**:
   - Remove `align: 'UL'` property from graph configuration
   - Test with unit tests

2. **Verify Visual Appearance**:
   - Run development server
   - Test with various org structures
   - Verify centering in vertical mode
   - Verify no regression in horizontal mode

3. **Update Tests**:
   - Add unit tests for centered layout
   - Ensure existing tests still pass

4. **Documentation**:
   - Update code comments if needed
   - No user-facing documentation changes required

## Rollback Plan

If centering causes issues:

1. Revert `layoutEngine.ts` to add back `align: 'UL'`
2. Consider alternative Dagre alignment options: `'UR'`, `'DL'`, `'DR'`
3. Investigate custom post-processing to center nodes manually

## Alternative Approaches

### Option 1: Manual Centering (More Complex)

Instead of relying on Dagre's alignment, manually calculate center offset:

```typescript
export function calculateLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: Direction = 'TB'
): FlowNode[] {
  // ... existing Dagre layout code ...

  const layoutedNodes = nodes.map((node: FlowNode) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  // For TB layout, center the entire tree horizontally
  if (direction === 'TB') {
    const minX = Math.min(...layoutedNodes.map(n => n.position!.x));
    const maxX = Math.max(
      ...layoutedNodes.map(n => n.position!.x + (n.data.isExpanded ? 280 : 220))
    );
    const treeWidth = maxX - minX;
    const centerOffset = -treeWidth / 2;

    return layoutedNodes.map(node => ({
      ...node,
      position: {
        x: node.position!.x + centerOffset,
        y: node.position!.y,
      },
    }));
  }

  return layoutedNodes;
}
```

**Not Recommended**: This adds complexity and may conflict with React Flow's fitView.

### Option 2: Different Layout Library

Switch from Dagre to another library like ELK or D3-hierarchy.

**Not Recommended**: Major refactor for minimal benefit.

## Success Metrics

- Visual balance: Root node appears centered in viewport
- User feedback: Positive response to improved layout
- No performance regression
- No layout bugs or overlapping nodes
- All existing tests pass

## Related Features

- Layout toggle (TB/LR) - ensure both modes work correctly
- fitView functionality - should center properly
- Export to PNG/PDF - exported images should show centered layout
- MiniMap - should reflect centered layout

---

**Document Owner**: Development Team  
**Last Updated**: January 22, 2026
