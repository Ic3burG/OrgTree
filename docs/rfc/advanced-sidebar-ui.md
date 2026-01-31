# Advanced Sidebar UI Enhancements

**Status**: ✅ Implemented (Jan 31, 2026)  
**Created**: January 26, 2026  
**Priority**: Medium  
**Complexity**: High

> **Implementation Note**: The final implementation diverges slightly from this RFC. The **Workspace Presets** selector was moved from the Sidebar header to a dedicated **Settings > Interface** page (`/settings/preferences`) to reduce visual clutter. The sidebar retains collapse, resize, and pin controls.

## Overview

Enhance the admin sidebar with advanced UI features including multi-level collapse states, resizable width, floating action button for quick access when hidden, workspace layout presets, and sidebar pinning. These improvements will significantly enhance workspace customization and user productivity.

## User Story

**As a** power user managing multiple organizations  
**I want** advanced sidebar controls with customizable visibility and persistence  
**So that** I can optimize my workspace for different tasks and screen sizes

---

## Current Behavior

The `AdminLayout.tsx` currently implements a basic two-state sidebar:

- **Expanded** (256px / `w-64`): Full sidebar with labels
- **Collapsed** (80px / `w-20`): Icon-only mode with tooltips

**Current Features**:

- `isCollapsed` state with localStorage persistence (`adminSidebarCollapsed`)
- Toggle button using `PanelLeftClose`/`PanelLeft` icons
- Responsive behavior: hamburger menu on mobile (`lg:hidden`)
- Transition animations (`transition-all duration-300`)

**Current Limitations**:

- Only two states (no fully hidden option)
- Fixed widths (cannot resize)
- No quick access when fully hidden
- No saved layout presets
- Sidebar always reopens on navigation (no pinning)

---

## Proposed Behavior

### Feature 1: Multi-Level Collapse

Three-state sidebar with smooth transitions:

| State         | Width          | Visual               | Description            |
| ------------- | -------------- | -------------------- | ---------------------- |
| **Expanded**  | 256px (`w-64`) | Full labels + icons  | Default expanded state |
| **Minimized** | 64px (`w-16`)  | Icons only, tooltips | Compact icon bar       |
| **Hidden**    | 0px            | Completely hidden    | Full-screen content    |

**Keyboard Shortcuts**:

- `Ctrl+B` (or `Cmd+B` on Mac): Cycle through states
- `Ctrl+Shift+B`: Toggle between expanded and hidden (skip minimized)

**Visual Design**:

```texttext

┌─────────────────────────────────────────────────────────────────┐
│ [Expanded State]                                                │
│ ┌──────────────────┐┌───────────────────────────────────────────│
│ │ ← All Organizations                                          ││
│ │                                                               ││
│ │ 🏠 Dashboard                                                  ││
│ │ 🏢 Departments                                                ││
│ │ 👥 People                                                     ││
│ │ 🗺️ Organization Map                                          ││
│ │                                                               ││
│ │ ─────────────────                                             ││
│ │ 👤 John Doe                                                   ││
│ │ ⚙️ Settings                                                   ││
│ │ 🚪 Logout                                                     ││
│ └──────────────────┘└───────────────────────────────────────────│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Minimized State - Icon Only]                                   │
│ ┌────┐┌─────────────────────────────────────────────────────────│
│ │ ←  ││                                                         │
│ │    ││                                                         │
│ │ 🏠 ││              (Hover shows tooltip)                      │
│ │ 🏢 ││                                                         │
│ │ 👥 ││                                                         │
│ │ 🗺️ ││                                                         │
│ │    ││                                                         │
│ │ ── ││                                                         │
│ │ 👤 ││                                                         │
│ │ ⚙️ ││                                                         │
│ │ 🚪 ││                                                         │
│ └────┘└─────────────────────────────────────────────────────────│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Hidden State]                                                  │
│                                                                 │
│                                                                 │
│        [FAB]                                                    │
│        ☰                          Full content area             │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

```

---

### Feature 2: Resizable Sidebar

Drag handle for custom width adjustment:

- **Minimum width**: 200px
- **Maximum width**: 400px
- **Default width**: 256px
- **Resize handle**: Vertical bar on right edge of sidebar
- **Cursor**: `col-resize` on hover
- **Visual feedback**: Handle highlights on hover/drag
- **Persistence**: Width saved to localStorage per user

**Implementation Notes**:

- Use `onMouseDown`/`onMouseMove`/`onMouseUp` for drag behavior
- Apply `cursor: col-resize` to body during drag
- Show visual handle (thin line or `GripVertical` icon)
- Disable transitions during resize for smooth feedback

---

### Feature 3: Floating Action Button (FAB)

Quick access to sidebar when fully hidden:

- **Position**: Bottom-left corner (fixed positioning)
- **Offset**: 16px from edges
- **Size**: 48px × 48px circular button
- **Icon**: `Menu` (hamburger) icon
- **Action**: Opens sidebar to expanded state
- **Animation**: Slight entrance animation when sidebar hides
- **Auto-hide**: FAB fades after 3 seconds of inactivity (reappears on mouse move near edge)

**Accessibility**:

- `aria-label="Open sidebar"`
- Keyboard accessible (`Tab` focusable)
- High contrast in both light and dark modes

---

### Feature 4: Workspace Layout Presets

Save and restore complete layout configurations:

**Preset Data Structure**:

```typescript

interface WorkspacePreset {
  id: string;
  name: string;
  createdAt: string;
  config: {
    sidebarState: 'expanded' | 'minimized' | 'hidden';
    sidebarWidth: number; // px (for resizable)
    sidebarPinned: boolean;
    darkMode: boolean;
  };
}

```

**UI Components**:

1. **Save Preset Button**: In sidebar header or footer
2. **Preset Dropdown**: Quick switch between saved presets
3. **Manage Presets Modal**: Rename, delete, reorder presets

**Default Presets** (built-in, non-deletable):

- "Default": Expanded sidebar, 256px width
- "Compact": Minimized sidebar (icon-only)
- "Focus Mode": Hidden sidebar, FAB visible

**Storage**: `localStorage` key: `workspacePresets`

---

### Feature 5: Sidebar Pinning

Control sidebar visibility behavior on navigation:

| Mode                 | Behavior                                                  |
| -------------------- | --------------------------------------------------------- |
| **Pinned** (default) | Sidebar stays open across route changes                   |
| **Unpinned**         | Sidebar auto-collapses to minimized state on route change |

**Visual Indicator**:

- Pin icon (`Pin` / `PinOff`) in sidebar header
- Tooltip showing current state
- Subtle visual difference (e.g., slight border color change when unpinned)

**Interactions**:

- Click pin icon to toggle
- When unpinned, expanding sidebar temporarily shows it until next navigation
- Route change triggers collapse animation
- Exceptions: Always stay expanded when user is actively interacting (hover or focus within sidebar)

---

## User Review Required

> [!IMPORTANT]
> **Significant State Management Changes**: This enhancement introduces a new `useSidebar` hook that will manage multiple sidebar states. This replaces the simple `isCollapsed` boolean with a more complex state machine.
>
> [!WARNING]
> **localStorage Keys**: New keys will be added (`sidebarState`, `sidebarWidth`, `sidebarPinned`, `workspacePresets`). Consider migration from existing `adminSidebarCollapsed` key.
>
> [!CAUTION]
> **Performance Consideration**: Resize operations with continuous event listeners may impact performance on lower-end devices. Debouncing will be implemented.

---

## Proposed Changes

### New Components

#### [NEW] [Sidebar.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/ui/Sidebar.tsx)

Refactored sidebar component extracted from `AdminLayout.tsx`:

```typescript

interface SidebarProps {
  // State
  state: 'expanded' | 'minimized' | 'hidden';
  width: number;
  pinned: boolean;

  // Callbacks
  onStateChange: (state: 'expanded' | 'minimized' | 'hidden') => void;
  onWidthChange: (width: number) => void;
  onPinnedChange: (pinned: boolean) => void;

  // Content
  header?: React.ReactNode;
  navigation: React.ReactNode;
  footer?: React.ReactNode;

  // Config
  minWidth?: number; // Default: 200
  maxWidth?: number; // Default: 400
  defaultWidth?: number; // Default: 256
}

```

---

#### [NEW] [SidebarResizeHandle.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/ui/SidebarResizeHandle.tsx)

Resize handle component with drag-to-resize functionality:

```typescript

interface ResizeHandleProps {
  onResize: (deltaX: number) => void;
  onResizeEnd: () => void;
}

```

Visual: 4px wide strip with `GripVertical` icon centered, subtle hover effect.

---

#### [NEW] [FloatingActionButton.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/ui/FloatingActionButton.tsx)

FAB for quick sidebar access:

```typescript

interface FABProps {
  visible: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  position?: 'bottom-left' | 'bottom-right';
  autoHide?: boolean; // Fade after inactivity
  autoHideDelay?: number; // ms, default 3000
}

```

---

#### [NEW] [WorkspacePresetSelector.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/ui/WorkspacePresetSelector.tsx)

Dropdown for selecting and managing workspace presets:

- List of saved presets
- Active preset indicator
- "Save Current" option
- "Manage Presets" option (opens modal)

---

#### [NEW] [WorkspacePresetModal.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/ui/WorkspacePresetModal.tsx)

Modal for managing workspace presets:

- List of all presets (built-in + custom)
- Edit preset name
- Delete custom presets (built-in cannot be deleted)
- Reorder presets (drag-and-drop or arrows)

---

### New Hooks

#### [NEW] [useSidebar.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/src/hooks/useSidebar.ts)

Central hook for all sidebar state management:

```typescript

interface UseSidebarReturn {
  // State
  state: 'expanded' | 'minimized' | 'hidden';
  width: number;
  pinned: boolean;

  // Actions
  setState: (state: 'expanded' | 'minimized' | 'hidden') => void;
  setWidth: (width: number) => void;
  setPinned: (pinned: boolean) => void;
  cycleState: () => void; // expanded → minimized → hidden → expanded
  toggleExpanded: () => void; // expanded ↔ hidden (skip minimized)
  reset: () => void; // Reset to defaults

  // Computed
  isExpanded: boolean;
  isMinimized: boolean;
  isHidden: boolean;
  showFAB: boolean;
}

```

Handles:

- State persistence to localStorage
- Keyboard shortcuts registration
- Auto-collapse on route change (when unpinned)

---

#### [NEW] [useWorkspacePresets.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/src/hooks/useWorkspacePresets.ts)

Hook for managing workspace presets:

```typescript

interface UseWorkspacePresetsReturn {
  presets: WorkspacePreset[];
  activePresetId: string | null;

  applyPreset: (id: string) => void;
  savePreset: (name: string) => void;
  updatePreset: (id: string, updates: Partial<WorkspacePreset>) => void;
  deletePreset: (id: string) => void;
  reorderPresets: (fromIndex: number, toIndex: number) => void;
}

```

---

#### [NEW] [useResizable.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/src/hooks/useResizable.ts)

Generic hook for resizable elements:

```typescript

interface UseResizableOptions {
  minWidth: number;
  maxWidth: number;
  initialWidth: number;
  onResize?: (width: number) => void;
  onResizeEnd?: (width: number) => void;
}

interface UseResizableReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: React.MouseEventHandler;
}

```

---

### Component Updates

#### [MODIFY] [AdminLayout.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/admin/AdminLayout.tsx)

Replace inline sidebar implementation with new `Sidebar` component:

- Import new `useSidebar` hook
- Import new `Sidebar` component
- Replace `isCollapsed` state with hook
- Add keyboard shortcut listeners
- Add `FloatingActionButton` for hidden state
- Add `WorkspacePresetSelector` to header

**Migration**: The existing `adminSidebarCollapsed` localStorage key will be read once during migration and converted to new format.

---

#### [MODIFY] [SuperuserLayout.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/superuser/SuperuserLayout.tsx)

Apply same sidebar enhancements for consistency:

- Currently has no collapse functionality
- Add `useSidebar` hook integration
- Add resize handle and FAB

---

### New Tests

#### [NEW] [useSidebar.test.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/src/hooks/useSidebar.test.ts)

Unit tests for sidebar hook:

- State transitions (expanded → minimized → hidden → expanded)
- localStorage persistence
- Reset functionality
- Auto-collapse when unpinned

---

#### [NEW] [Sidebar.test.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/ui/Sidebar.test.tsx)

Component tests:

- Renders in all three states
- Resize handle interactions
- Pin toggle
- Keyboard navigation
- Dark mode styling

---

#### [NEW] [useWorkspacePresets.test.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/src/hooks/useWorkspacePresets.test.ts)

Unit tests for presets hook:

- CRUD operations for presets
- Built-in presets cannot be deleted
- localStorage persistence

---

---

## Verification Plan

### Automated Tests

#### 1. Unit Tests (Vitest)

Run all unit tests including new hook and component tests:

```bash

cd /Users/ojdavis/Claude\ Code/OrgTree && npm run test

```

New tests to verify:

- `useSidebar.test.ts`: State management and persistence
- `useWorkspacePresets.test.ts`: Preset CRUD operations
- `Sidebar.test.tsx`: Component rendering and interactions

#### 2. Existing Tests

Verify existing AdminLayout-related tests still pass:

```bash

cd /Users/ojdavis/Claude\ Code/OrgTree && npm run test -- src/components/admin/

```

#### 3. E2E Tests (Playwright)

Run E2E tests to catch any regressions:

```bash

cd /Users/ojdavis/Claude\ Code/OrgTree && npm run test:e2e

```

#### 4. Lint & Format

Ensure code quality:

```bash

cd /Users/ojdavis/Claude\ Code/OrgTree && npm run lint && npm run format:check

```

---

### Manual Verification
>
> [!NOTE]
> **User should test these scenarios manually after implementation:**

#### Test 1: Multi-Level Collapse

1. Log in and navigate to any organization
2. Click the collapse button in sidebar header
3. **Verify**: Sidebar transitions from expanded (256px) to minimized (64px icon-only)
4. Click collapse button again
5. **Verify**: Sidebar hides completely (0px)
6. Click collapse button (or FAB)
7. **Verify**: Sidebar returns to expanded state
8. Try keyboard shortcut `Cmd+B` (Mac) or `Ctrl+B` (Windows)
9. **Verify**: Cycles through states correctly

#### Test 2: Resizable Sidebar

1. In expanded state, hover over right edge of sidebar
2. **Verify**: Cursor changes to `col-resize`, handle highlights
3. Click and drag right to increase width
4. **Verify**: Sidebar width increases smoothly (up to max 400px)
5. Drag left to decrease width
6. **Verify**: Sidebar width decreases (down to min 200px)
7. Release mouse, refresh page
8. **Verify**: Custom width persists

#### Test 3: Floating Action Button

1. Collapse sidebar to hidden state
2. **Verify**: FAB appears in bottom-left corner with animation
3. Wait 3 seconds without moving mouse
4. **Verify**: FAB fades out
5. Move mouse near left edge
6. **Verify**: FAB reappears
7. Click FAB
8. **Verify**: Sidebar opens to expanded state

#### Test 4: Workspace Presets

1. Customize sidebar (set to minimized, custom width)
2. Click "Save Preset" in sidebar header/footer
3. Enter preset name "My Compact View"
4. **Verify**: Preset saved, appears in dropdown
5. Change sidebar to expanded state
6. Select "My Compact View" from dropdown
7. **Verify**: Sidebar restores to minimized state with saved width
8. Open "Manage Presets" modal
9. **Verify**: Can rename, delete custom presets; cannot delete built-in presets

#### Test 5: Sidebar Pinning

1. Click pin icon to unpin sidebar
2. **Verify**: Visual indicator shows unpinned state
3. Navigate to a different route (e.g., People to Departments)
4. **Verify**: Sidebar auto-collapses to minimized
5. Expand sidebar manually
6. **Verify**: Sidebar stays expanded while interacting
7. Navigate again
8. **Verify**: Auto-collapses again
9. Click pin icon to re-pin
10. Navigate
11. **Verify**: Sidebar stays expanded across navigation

#### Test 6: Dark Mode Compatibility

1. Enable dark mode
2. Test all sidebar states (expanded, minimized, hidden)
3. **Verify**: All elements visible with proper contrast
4. Test resize handle visibility
5. Test FAB visibility
6. Test preset dropdown styling

#### Test 7: Mobile Responsiveness

1. Open app on mobile device or resize browser to mobile width
2. **Verify**: Mobile hamburger menu still works
3. **Verify**: Resize handle is NOT shown on mobile
4. **Verify**: FAB is NOT shown on mobile (mobile nav takes precedence)

---

## Implementation Phases

### Phase 1: Core Hook & State Management (2-3 hours)

- Create `useSidebar.ts` hook with three-state management
- Add localStorage persistence with migration from old key
- Implement keyboard shortcuts
- Update `AdminLayout.tsx` to use new hook

### Phase 2: Resizable Sidebar (2-3 hours)

- Create `useResizable.ts` generic hook
- Create `SidebarResizeHandle.tsx` component
- Integrate resize functionality into sidebar
- Add width persistence

### Phase 3: Floating Action Button (1-2 hours)

- Create `FloatingActionButton.tsx` component
- Add auto-hide behavior with mouse proximity detection
- Integrate FAB with hidden sidebar state
- Add entrance/exit animations

### Phase 4: Workspace Presets (3-4 hours)

- Create `useWorkspacePresets.ts` hook
- Create `WorkspacePresetSelector.tsx` dropdown
- Create `WorkspacePresetModal.tsx` for management
- Add built-in presets
- Integrate with sidebar state

### Phase 5: Sidebar Pinning (1-2 hours)

- Add pinned state to `useSidebar.ts`
- Add route change listener for auto-collapse
- Add pin toggle UI to sidebar
- Add visual indicators

### Phase 6: SuperuserLayout Integration (1 hour)

- Apply same sidebar enhancements to `SuperuserLayout.tsx`
- Ensure consistent behavior across layouts

### Phase 7: Testing & Documentation (2-3 hours)

- Write unit tests for new hooks
- Write component tests
- Run E2E tests
- Manual testing across browsers
- Update documentation if needed

### Estimated Total: 12-18 hours

---

## Dependencies

- **No new npm dependencies required**
- Uses existing Tailwind CSS classes
- Uses existing `lucide-react` icons:
  - `GripVertical` (resize handle)
  - `Pin`, `PinOff` (pinning)
  - `Menu` (FAB)
  - `ChevronDown` (preset dropdown)
  - `Settings2` (manage presets)

---

## Edge Cases

1. **Extremely narrow screens**: Enforce minimum content width when sidebar is expanded
2. **Rapid resize dragging**: Throttle resize events for performance
3. **Multiple browser tabs**: Sync sidebar state across tabs (optional, use `storage` event)
4. **Preset name conflicts**: Prevent duplicate names
5. **Migration edge cases**: Handle missing or corrupted localStorage data gracefully
6. **Keyboard shortcut conflicts**: Ensure shortcuts don't conflict with browser or other app shortcuts
7. **Touch devices**: Provide touch-friendly resize interactions or hide resize handle
8. **Reduced motion preference**: Respect `prefers-reduced-motion` for animations

---

## Success Metrics

- All 5 sidebar features implemented and functional
- 0 regressions in existing tests
- New hooks have 80%+ test coverage
- Consistent behavior in both `AdminLayout` and `SuperuserLayout`
- Works correctly in both light and dark modes
- Keyboard shortcuts functional
- Layout presets save and restore correctly

---

## Future Enhancements

1. **Sidebar Sections**: Collapsible sections within sidebar navigation
2. **Quick Actions Panel**: Slide-out panel for common actions
3. **Sidebar Themes**: Color customization for sidebar
4. **Cloud Sync**: Sync workspace presets across devices
5. **Sidebar Search**: Search within sidebar navigation items
6. **Recent Pages**: Show recently visited pages in sidebar

---

**Document Owner**: Development Team  
**Last Updated**: January 26, 2026
