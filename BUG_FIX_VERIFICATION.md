# Bug Fix Verification - Expand/Collapse Issue

## Root Cause Identified

The original bug was caused by the `useEffect` for auto-expanding search results running on every render due to incorrect dependency management.

### Original Problem
```javascript
useEffect(() => {
  if (autoExpandPaths.length > 0) {
    setExpandedNodes(prev => new Set([...prev, ...autoExpandPaths]));
  }
}, [searchQuery]);
```

**Issue**: The effect used `autoExpandPaths` from closure but only depended on `searchQuery`. While this seems correct, React's render cycle could cause the effect to run at unexpected times, especially when:
- Components re-render due to state changes (like manual toggles)
- The useMemo recalculates autoExpandPaths
- Event bubbling from nested components

### The Fix

1. **Added `e.stopPropagation()`** in DepartmentCard.jsx:
   - Prevents click events from bubbling up to parent department cards
   - Each department click is now isolated

2. **Improved useEffect dependency logic**:
   - Uses `useRef` to track previous search query
   - Only auto-expands when search query actually changes
   - Ignores re-renders from manual toggles
   - Only depends on `[searchQuery]` to avoid reference comparison issues

```javascript
const prevSearchRef = useRef('');

useEffect(() => {
  const prevSearch = prevSearchRef.current;
  const currentSearch = searchQuery.trim();

  // Only auto-expand when entering a NEW search
  if (currentSearch && currentSearch !== prevSearch) {
    if (autoExpandPaths.length > 0) {
      setExpandedNodes(prev => new Set([...prev, ...autoExpandPaths]));
    }
    prevSearchRef.current = currentSearch;
  }
}, [searchQuery]); // Only runs when searchQuery changes
```

## Test Scenarios

### Scenario 1: Expand top-level department (no search)
**Steps:**
1. Load page
2. Click "Finance Department" to expand it

**Expected:**
- Finance Department expands
- Stays expanded

**Why it works:**
- `toggleNode` adds "/Finance" to expandedNodes
- Component re-renders
- `useEffect` sees currentSearch = "" and prevSearch = ""
- Condition fails, useEffect does nothing
- Department stays expanded ✓

### Scenario 2: Expand sub-department (no search)
**Steps:**
1. Expand "Operations"
2. Click "Information Technology" inside Operations to expand it

**Expected:**
- IT department expands
- Stays expanded

**Why it works:**
- `e.stopPropagation()` prevents click from bubbling to parent "Operations" card
- `toggleNode` adds "/Operations/IT" to expandedNodes
- useEffect doesn't interfere (same reason as Scenario 1)
- Department stays expanded ✓

### Scenario 3: Collapse sub-department (no search)
**Steps:**
1. Expand "Operations"
2. Expand "Information Technology"
3. Click "Information Technology" again to collapse it

**Expected:**
- IT department collapses
- Stays collapsed

**Why it works:**
- `toggleNode` removes "/Operations/IT" from expandedNodes
- useEffect doesn't interfere
- Department stays collapsed ✓

### Scenario 4: Collapse top-level (no search)
**Steps:**
1. Expand "Operations"
2. Click "Operations" again to collapse it

**Expected:**
- Operations collapses (including all children)
- Stays collapsed

**Why it works:**
- `toggleNode` removes "/Operations" from expandedNodes
- Child departments disappear from DOM (conditional rendering)
- Department stays collapsed ✓

### Scenario 5: Rapid clicking sub-department
**Steps:**
1. Expand "Operations"
2. Rapidly click "IT" 5 times

**Expected:**
- IT toggles: expand, collapse, expand, collapse, expand
- Final state: expanded
- Each click responds immediately

**Why it works:**
- Each click triggers `toggleNode` which correctly toggles the state
- `e.stopPropagation()` ensures no double-toggles from bubbling
- useEffect doesn't run (no search query changes)
- State updates are immediate and predictable ✓

### Scenario 6: Manual toggle during active search
**Steps:**
1. Search for "John"
2. Results auto-expand (Executive department)
3. Manually click to expand "Operations" department

**Expected:**
- Operations expands
- Stays expanded
- Search results stay highlighted

**Why it works:**
- Search runs: currentSearch = "John", prevSearch = ""
- useEffect runs once, expands "/Executive"
- prevSearchRef.current = "John"
- User manually toggles "/Operations"
- toggleNode updates expandedNodes
- Component re-renders
- useEffect runs with currentSearch = "John", prevSearch = "John"
- Condition fails (they're equal), useEffect does nothing
- Manual toggle persists ✓

## Console Output Expected

With the logging in place, when clicking a sub-department you should see:

```
🟢 DepartmentCard clicked: /Operations/IT depth: 1
🔵 Toggle called for path: /Operations/IT
🔵 Current expandedNodes: ['/Executive', '/Finance', '/Operations']
🔵 Is currently expanded: false
🔵 Added to expandedNodes
🔵 New expandedNodes: ['/Executive', '/Finance', '/Operations', '/Operations/IT']
🟡 useEffect running. Prev search:  Current search:
```

**Key observations:**
- Only ONE toggle call (not multiple)
- useEffect runs but doesn't modify state (search is empty)
- expandedNodes correctly includes the new path

## Files Modified

1. **src/components/Directory.jsx**
   - Added `useRef` import
   - Modified useEffect for auto-expand with ref-based tracking
   - Added comprehensive console logging

2. **src/components/DepartmentCard.jsx**
   - Added `handleClick` function with `e.stopPropagation()`
   - Added console logging

## Verification Checklist

- [x] Build completes without errors
- [ ] Scenario 1: Top-level expand works
- [ ] Scenario 2: Sub-department expand works
- [ ] Scenario 3: Sub-department collapse works
- [ ] Scenario 4: Top-level collapse works
- [ ] Scenario 5: Rapid clicking toggles correctly
- [ ] Scenario 6: Manual toggle during search works

**Status**: Code fix implemented, ready for browser testing.

## Cleanup Required

Once verified working, remove console.log statements from:
- Directory.jsx (lines 93-94, 102-105, 121-127)
- DepartmentCard.jsx (line 32)
