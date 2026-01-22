# Remove Logout Button from Org Map Toolbar

> **Status**: Planned  
> **Created**: January 22, 2026  
> **Priority**: Low  
> **Complexity**: Very Low

## Overview

Remove the legacy logout button from the Org Map toolbar. This button is a holdover from an early version of the application and is redundant since logout functionality is already available in the AdminLayout sidebar.

## User Story

**As a** user viewing the Org Map  
**I want** a cleaner toolbar without redundant controls  
**So that** the interface is less cluttered and more focused on org map functions

## Current Behavior

- Logout button appears in the Org Map toolbar (top-right on desktop, bottom-right on mobile)
- Located below the theme picker with a divider above it
- Shows logout icon with tooltip displaying user name
- Clicking logs out the user immediately

**Current Toolbar Buttons** (top to bottom):

1. Zoom In
2. Zoom Out
3. Fit View
4. _(divider)_
5. Expand All
6. Collapse All
7. _(divider)_
8. Layout Toggle (TB/LR)
9. _(divider)_
10. Dark Mode Toggle
11. Theme Picker
12. _(divider)_
13. **Logout** ← _to be removed_

## Proposed Behavior

- Remove logout button from Org Map toolbar
- Remove the divider above the logout button
- Logout functionality remains available in:
  - **AdminLayout sidebar** (main navigation)
  - **OrganizationSelector** (organization list page)
  - **SuperuserLayout** (superuser panel)

**Proposed Toolbar Buttons** (top to bottom):

1. Zoom In
2. Zoom Out
3. Fit View
4. _(divider)_
5. Expand All
6. Collapse All
7. _(divider)_
8. Layout Toggle (TB/LR)
9. _(divider)_
10. Dark Mode Toggle
11. Theme Picker

## Technical Implementation

### Files to Modify

#### 1. `src/components/Toolbar.tsx`

**Changes Required**:

1. Remove `LogOut` import from lucide-react (line 10)
2. Remove `logout` from `useAuth()` hook (line 47)
3. Remove logout button and its divider (lines 182-194)

**Before** (lines 10, 47, 182-194):

```typescript
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowRight,
  LogOut,  // ← Remove this
  Palette,
  Moon,
  Sun,
} from 'lucide-react';

// ...

const { user, logout } = useAuth();  // ← Remove 'logout'

// ...

{/* Divider */}
<div className="h-px bg-slate-300 dark:bg-slate-600 my-0.5" />

{/* Logout Button */}
<button
  onClick={logout}
  className={buttonClass}
  aria-label={`Logout (${user?.name})`}
  title={`Logout (${user?.name})`}
>
  <LogOut size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
  <Tooltip>Logout {user?.name && `(${user.name})`}</Tooltip>
</button>
```

**After**:

```typescript
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowRight,
  Palette,
  Moon,
  Sun,
} from 'lucide-react';

// ...

const { user } = useAuth(); // 'user' might still be used elsewhere

// ...

// (logout button and divider removed entirely)
```

**Note**: Check if `user` variable is used elsewhere in the component. If not, it can also be removed from the `useAuth()` destructuring.

### Verification Plan

#### 1. Check for `user` Variable Usage

Before removing `user` from `useAuth()`, verify it's not used elsewhere:

```bash
cd /Users/ojdavis/Claude\ Code/OrgTree
grep -n "user" src/components/Toolbar.tsx
```

Expected: Only appears in the logout button code (lines 47, 189, 190, 193). If found elsewhere, keep `user` in the destructuring.

#### 2. Visual Verification

**Manual Testing Steps**:

1. Start development server:

   ```bash
   cd /Users/ojdavis/Claude\ Code/OrgTree
   npm run dev
   ```

2. Navigate to Org Map:
   - Go to `http://localhost:5173`
   - Login with test credentials
   - Select an organization
   - Click "Org Map" tab

3. Verify toolbar appearance:
   - **Desktop**: Check top-right toolbar
   - **Mobile**: Check bottom-right toolbar (resize browser to mobile width)
   - Confirm logout button is NOT present
   - Confirm theme picker is the last button
   - Confirm no extra divider below theme picker
   - Verify all other buttons still work (zoom, fit view, expand/collapse, layout toggle, dark mode, theme picker)

4. Verify logout still works elsewhere:
   - Navigate to "People" or "Departments" tab
   - Check left sidebar (AdminLayout)
   - Confirm logout button is present at bottom of sidebar
   - Click logout button
   - Confirm successful logout and redirect to login page

5. Test on different screen sizes:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)

**Expected Results**:

- ✅ Logout button removed from Org Map toolbar
- ✅ No visual glitches or spacing issues
- ✅ All other toolbar buttons function correctly
- ✅ Logout still accessible from AdminLayout sidebar
- ✅ No console errors

#### 3. Code Quality Checks

Run linting to ensure no issues:

```bash
cd /Users/ojdavis/Claude\ Code/OrgTree
npm run lint
```

Expected: No new linting errors related to `Toolbar.tsx`.

#### 4. TypeScript Compilation

Verify TypeScript compiles without errors:

```bash
cd /Users/ojdavis/Claude\ Code/OrgTree
npx tsc --noEmit
```

Expected: No compilation errors.

### Edge Cases

1. **User Variable Usage**: If `user` is used elsewhere in Toolbar component, keep it in the `useAuth()` destructuring
2. **Import Cleanup**: Ensure `LogOut` icon is not used elsewhere in the file
3. **Spacing**: Verify no extra spacing or dividers after removal

### Rollback Plan

If removal causes issues:

1. Revert changes to `Toolbar.tsx`
2. Restore logout button and divider
3. Consider hiding instead of removing (add `hidden` class)

## Alternative Approaches

### Option 1: Hide Instead of Remove

Add a conditional render or CSS class to hide the button:

```typescript
{/* Logout Button - Hidden but kept for potential future use */}
<button
  onClick={logout}
  className={`${buttonClass} hidden`}
  // ... rest of props
>
```

**Not Recommended**: Adds unnecessary code complexity.

### Option 2: Make Configurable

Add a prop to control logout button visibility:

```typescript
interface ToolbarProps {
  // ... existing props
  showLogout?: boolean;
}
```

**Not Recommended**: Over-engineering for a simple removal.

## Success Metrics

- Cleaner, more focused toolbar UI
- No loss of logout functionality (still available in sidebar)
- No visual regressions or layout issues
- Positive user feedback on simplified interface

## Related Features

- AdminLayout sidebar - primary logout location
- OrganizationSelector - logout on org list page
- SuperuserLayout - logout in superuser panel
- Toolbar - other map controls remain functional

---

**Document Owner**: Development Team  
**Last Updated**: January 22, 2026
