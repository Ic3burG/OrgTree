# Hierarchical Tree Selector Component

**Status**: 📋 Planned
**Created**: January 25, 2026
**Priority**: Medium
**Complexity**: Medium-High

## Overview

Replace native HTML `<select>` elements with an interactive, collapsible tree dropdown component for department selection. This will provide a significantly improved UX with visual hierarchy, search, expand/collapse, keyboard navigation, and breadcrumb paths.

## User Story

**As a** user managing people or departments  
**I want** an interactive tree-based department selector  
**So that** I can easily navigate and select from deeply nested organizational hierarchies without losing context

## Current Behavior

Currently, 5 components use native `<select>` elements with `getHierarchicalDepartments()` and text-based tree notation (e.g., `├── └──`) for displaying department hierarchy:

1. **`PersonForm.tsx`** - When assigning a person to a department
2. **`DepartmentForm.tsx`** - When selecting a parent department
3. **`BulkMoveModal.tsx`** - When bulk-moving people to a department
4. **`BulkEditModal.tsx`** - When bulk-editing department assignments
5. **`PersonManagerHeader.tsx`** - When filtering by department

### Current Limitations

- **Poor Visibility**: Tree notation in dropdown options is not visually intuitive
- **No Collapse/Expand**: Cannot collapse sections of the tree
- **No Search**: No way to quickly find departments in large hierarchies
- **Limited Keyboard Nav**: Standard select keyboard navigation only
- **No Breadcrumbs**: No way to see the full path to a department
- **Mobile UX**: Native selects are hard to navigate on mobile for long lists

## Proposed Behavior

### Interactive Features

1. **Visual Tree Hierarchy**
   - Indentation with visual tree lines (connectors)
   - Expand/collapse chevrons for parent departments
   - Visual depth indicators with subtle color coding

2. **Search Functionality**
   - Type-ahead search with instant filtering
   - Highlights matching text in results
   - Shows matching departments AND their visible ancestors

3. **Keyboard Navigation**
   - Arrow keys to navigate up/down
   - Enter to select, Escape to close
   - Left/Right arrows to collapse/expand
   - Type-to-search (focus moves to matching items)

4. **Breadcrumb Display**
   - Selected department shows full path (e.g., "Root → Division → Department")
   - Clickable breadcrumb segments for quick parent selection

5. **Touch-Friendly**
   - Large touch targets for mobile
   - Swipe gestures for expand/collapse
   - Tap-to-select without accidental gestures

### Visual Design

```
┌─────────────────────────────────────────────────┐
│ 🔍 Search departments...                    ×  │
├─────────────────────────────────────────────────┤
│ ▼ Organization                              ✓  │
│   ├─ ▼ Engineering                             │
│   │   ├─ ▶ Frontend                            │
│   │   ├─ ▶ Backend                             │
│   │   └─ ▶ DevOps                              │
│   ├─ ▼ Product                                 │
│   │   ├─ Design                                │
│   │   └─ Research                              │
│   └─ ▶ Operations                              │
└─────────────────────────────────────────────────┘
```

- **Selected state**: Checkmark icon and highlight
- **Hover state**: Subtle background highlight
- **Expanded**: `▼` chevron, children visible
- **Collapsed**: `▶` chevron, children hidden
- **Search match**: Bold/highlight matching text

---

## User Review Required

> [!IMPORTANT]
> **New Shared Component**: This creates a new reusable UI component (`HierarchicalTreeSelector`) in `src/components/ui/`. This is a significant addition to the component library.

> [!WARNING]
> **Breaking Change to Forms**: All 5 components using department selects will be modified. The API changes from `value`/`onChange` on a `<select>` to a custom component API. Form styling and behavior will change.

---

## Proposed Changes

### New Component

#### [NEW] [HierarchicalTreeSelector.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/ui/HierarchicalTreeSelector.tsx)

New reusable component with the following features:

- Tree rendering with expand/collapse controls
- Search input with filtering
- Keyboard navigation (arrow keys, enter, escape)
- Dark mode support
- Accessibility (ARIA labels, roles, focus management)
- Mobile-friendly touch targets

**Component API:**

```typescript
interface TreeNode {
  id: string;
  name: string;
  parentId: string | null;
  children?: TreeNode[];
  depth?: number;
}

interface HierarchicalTreeSelectorProps {
  // Data
  items: TreeNode[];
  value: string | null;
  onChange: (id: string | null) => void;

  // Configuration
  placeholder?: string; // Default: "Select..."
  searchPlaceholder?: string; // Default: "Search..."
  allowClear?: boolean; // Default: true
  disabled?: boolean; // Default: false
  error?: boolean; // Default: false
  showBreadcrumb?: boolean; // Default: true
  defaultExpandedIds?: string[]; // Default: [] (auto-expand to selection)
  maxHeight?: number; // Default: 300 (px)

  // Filtering
  excludeIds?: string[]; // Departments to exclude (e.g., current + descendants)

  // Styling
  className?: string;
  id?: string;
}
```

**Internal state management:**

- Expanded node IDs (Set)
- Search query string
- Focused node ID (for keyboard nav)
- Dropdown open state

---

#### [NEW] [HierarchicalTreeSelector.test.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/ui/HierarchicalTreeSelector.test.tsx)

Unit tests for the new component:

- Renders items in tree structure
- Expands/collapses on click and keyboard
- Filters items based on search
- Calls onChange with correct ID
- Keyboard navigation (up/down/left/right/enter/escape)
- Shows breadcrumb for selected item
- Handles empty state
- Respects excludeIds prop
- Dark mode styling
- Accessibility (ARIA attributes)

---

### Utility Enhancements

#### [MODIFY] [departmentUtils.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/src/utils/departmentUtils.ts)

Add new utility function for tree node conversion:

```typescript
/**
 * Convert flat department list to nested tree structure for HierarchicalTreeSelector
 * @param departments - Flat list of departments
 * @returns Nested tree structure with children arrays
 */
export function buildDepartmentTree(departments: Department[]): TreeNode[];

/**
 * Get all descendant IDs for a department (for exclusion logic)
 * @param departmentId - Root department ID
 * @param departments - All departments
 * @returns Array of descendant IDs including the department itself
 */
export function getDescendantIds(departmentId: string, departments: Department[]): string[];
```

---

### Component Updates

#### [MODIFY] [PersonForm.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/admin/PersonForm.tsx)

Replace native `<select>` (lines 281-297) with `HierarchicalTreeSelector`:

```tsx
// Before
<select
  id="departmentId"
  name="departmentId"
  value={formData.departmentId}
  onChange={handleChange}
  ...
>
  {getHierarchicalDepartments(departments).map(dept => ...)}
</select>

// After
<HierarchicalTreeSelector
  id="departmentId"
  items={buildDepartmentTree(departments)}
  value={formData.departmentId}
  onChange={(id) => setFormData(prev => ({ ...prev, departmentId: id || '' }))}
  placeholder="Select a department"
  error={!!errors.departmentId}
  disabled={isSubmitting}
/>
```

---

#### [MODIFY] [DepartmentForm.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/admin/DepartmentForm.tsx)

Replace parent department select (around line 219) with `HierarchicalTreeSelector`.

Add exclusion of current department and its descendants to prevent circular references:

```tsx
<HierarchicalTreeSelector
  id="parentId"
  items={buildDepartmentTree(departments)}
  value={formData.parentId}
  onChange={id => setFormData(prev => ({ ...prev, parentId: id }))}
  placeholder="None (top-level)"
  excludeIds={department ? getDescendantIds(department.id, departments) : []}
  allowClear={true}
  disabled={loading}
/>
```

---

#### [MODIFY] [BulkMoveModal.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/admin/BulkMoveModal.tsx)

Replace select (lines 108-122) with `HierarchicalTreeSelector`:

```tsx
<HierarchicalTreeSelector
  items={buildDepartmentTree(departments)}
  value={selectedDeptId}
  onChange={id => setSelectedDeptId(id || '')}
  placeholder="Select a department..."
  showBreadcrumb={true}
/>
```

---

#### [MODIFY] [BulkEditModal.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/admin/BulkEditModal.tsx)

Two locations to update:

1. Department assignment for people (around line 303)
2. Parent department for bulk department edit (around line 410)

---

#### [MODIFY] [PersonManagerHeader.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/admin/PersonManagerHeader.tsx)

Replace department filter select (around line 117) with `HierarchicalTreeSelector`.

---

## Verification Plan

### Automated Tests

#### 1. Unit Tests (Vitest)

Run all unit tests including the new component tests:

```bash
cd /Users/ojdavis/Claude\ Code/OrgTree && npm run test
```

New tests to add in `HierarchicalTreeSelector.test.tsx`:

- Tree rendering tests
- Search/filter functionality
- Expand/collapse behavior
- Selection and onChange
- Keyboard navigation
- Accessibility attributes
- Edge cases (empty data, single item, deep nesting)

#### 2. Existing Component Tests

Verify existing component tests still pass after modifications:

```bash
cd /Users/ojdavis/Claude\ Code/OrgTree && npm run test -- src/components/admin/DepartmentManager.test.tsx
cd /Users/ojdavis/Claude\ Code/OrgTree && npm run test -- src/components/admin/PersonManager.test.tsx
```

#### 3. E2E Tests (Playwright)

Run existing E2E tests to catch regressions:

```bash
cd /Users/ojdavis/Claude\ Code/OrgTree && npm run test:e2e
```

Consider adding new E2E tests for tree selector interactions in forms.

### Manual Verification

> [!NOTE]
> **User should test these scenarios manually after implementation:**

#### Test 1: PersonForm Department Selection

1. Log in and navigate to People tab
2. Click "Add Person" button
3. Click on the department selector field
4. **Verify**: Tree dropdown opens showing hierarchy
5. **Verify**: Can expand/collapse parent departments
6. Type in search box to filter
7. **Verify**: Only matching departments and their ancestors show
8. Select a department
9. **Verify**: Dropdown closes, breadcrumb shows in field
10. Save the person and verify correct department assignment

#### Test 2: DepartmentForm Parent Selection

1. Navigate to Departments tab
2. Click "Add Department" or edit existing
3. Open parent department selector
4. **Verify**: Current department and descendants are NOT shown (prevent circular reference)
5. Try to select a parent at various depths
6. **Verify**: Breadcrumb path is visible

#### Test 3: Bulk Move People

1. In People tab, select multiple people
2. Click "Move" button
3. **Verify**: Tree selector appears in modal
4. Search and select a target department
5. Complete the move
6. **Verify**: People moved to correct department

#### Test 4: Keyboard Navigation

1. Open any tree selector
2. Press Up/Down arrows
3. **Verify**: Focus moves between items
4. Press Left arrow on expanded parent
5. **Verify**: Children collapse
6. Press Right arrow
7. **Verify**: Children expand
8. Press Enter
9. **Verify**: Item is selected
10. Press Escape
11. **Verify**: Dropdown closes without selection change

#### Test 5: Mobile/Touch Testing

1. Open app on mobile device or emulator
2. Tap department selector
3. **Verify**: Touch targets are large enough
4. Expand/collapse by tapping chevrons
5. Scroll through options
6. **Verify**: Selection works cleanly

#### Test 6: Dark Mode

1. Enable dark mode
2. Open tree selector
3. **Verify**: All elements visible with proper contrast
4. **Verify**: Hover states and selection visible

---

## Implementation Phases

### Phase 1: Core Component (2-3 hours)

- Create `HierarchicalTreeSelector.tsx`
- Implement basic tree rendering
- Add expand/collapse functionality
- Basic selection handling
- Basic styling (light mode)

### Phase 2: Search & Navigation (1-2 hours)

- Add search input and filtering
- Implement keyboard navigation
- Add focus management

### Phase 3: Polish & Accessibility (1-2 hours)

- Dark mode support
- ARIA attributes
- Screen reader testing
- Mobile touch optimization

### Phase 4: Integration (2-3 hours)

- Update `PersonForm.tsx`
- Update `DepartmentForm.tsx`
- Update `BulkMoveModal.tsx`
- Update `BulkEditModal.tsx`
- Update `PersonManagerHeader.tsx`
- Add utility functions to `departmentUtils.ts`

### Phase 5: Testing & Documentation (1-2 hours)

- Write unit tests
- Run E2E tests
- Manual testing
- Update any relevant docs

**Estimated Total: 8-12 hours**

---

## Dependencies

- No new npm dependencies required
- Uses existing Tailwind CSS classes
- Uses existing `lucide-react` icons (`ChevronDown`, `ChevronRight`, `Search`, `X`, `Check`)

---

## Edge Cases

1. **Empty department list**: Show "No departments available" message
2. **Single department**: Show without tree structure
3. **Deep nesting (10+ levels)**: Scroll within dropdown, max-height constraint
4. **Long department names**: Truncate with ellipsis, full name in tooltip
5. **Rapid expand/collapse**: Debounce animations
6. **Search with no results**: Show "No matching departments" message
7. **Circular reference prevention**: `excludeIds` prop for DepartmentForm

---

## Success Metrics

- All 5 forms use new component
- 0 regressions in existing tests
- Improved UX feedback from users
- Accessibility audit passing
- Mobile users can easily navigate deep hierarchies

---

## Future Enhancements

1. **Multi-select mode**: For bulk operations
2. **Recent selections**: Show recently used departments first
3. **Favorites**: Star frequently used departments
4. **Custom rendering**: Allow custom node content (icons, badges)
5. **Lazy loading**: Load children on expand for very large orgs
6. **Drag-and-drop**: Reorder tree via D&D

---

**Document Owner**: Development Team  
**Last Updated**: January 25, 2026
