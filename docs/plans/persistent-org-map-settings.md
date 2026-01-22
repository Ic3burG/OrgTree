# Persistent Org Map Settings

> **Status**: Planned  
> **Created**: January 22, 2026  
> **Priority**: Medium  
> **Complexity**: Medium

## Overview

Add persistent storage for Org Map user preferences including color theme, zoom level, viewport position, and custom node positions. Users can manually reposition departments, and these positions will be saved. Include a "Reset Layout" button to restore default positions.

## User Story

**As a** user viewing the Org Map  
**I want** my preferences and customizations to persist across sessions  
**So that** I don't have to reconfigure the map every time I visit

## Current Behavior

- **Theme**: Already persists via `localStorage.getItem('orgTreeTheme')` ✅
- **Zoom Level**: Resets to default on page load
- **Viewport Position**: Resets to fitView on page load
- **Node Positions**: Recalculated by Dagre layout algorithm on every load
- **Expanded State**: Lost on page refresh

## Proposed Behavior

### Persistent Settings

Store per-organization settings in localStorage:

```typescript
interface OrgMapSettings {
  theme: string; // Already implemented
  zoom: number; // New
  viewport: { x: number; y: number; zoom: number }; // New
  nodePositions: Record<string, { x: number; y: number }>; // New
  expandedNodes: string[]; // New
  layoutDirection: 'TB' | 'LR'; // New
}
```

**Storage Key**: `orgMap_${orgId}_settings`

### Reset Layout Button

Add button to Toolbar to reset all customizations:

- Restore default Dagre layout positions
- Reset zoom to fitView
- Clear custom node positions
- Optionally reset theme and layout direction

## Technical Implementation

### Architecture Changes

#### 1. Create Settings Hook: `useOrgMapSettings.ts`

```typescript
// src/hooks/useOrgMapSettings.ts
import { useState, useEffect, useCallback } from 'react';
import { Viewport } from 'reactflow';

interface OrgMapSettings {
  theme: string;
  zoom: number;
  viewport: Viewport;
  nodePositions: Record<string, { x: number; y: number }>;
  expandedNodes: string[];
  layoutDirection: 'TB' | 'LR';
}

const DEFAULT_SETTINGS: Partial<OrgMapSettings> = {
  theme: 'slate',
  zoom: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodePositions: {},
  expandedNodes: [],
  layoutDirection: 'TB',
};

export function useOrgMapSettings(orgId: string) {
  const storageKey = `orgMap_${orgId}_settings`;

  const [settings, setSettings] = useState<OrgMapSettings>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS as OrgMapSettings;
      }
    }
    return DEFAULT_SETTINGS as OrgMapSettings;
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, storageKey]);

  const updateSettings = useCallback((updates: Partial<OrgMapSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS as OrgMapSettings);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { settings, updateSettings, resetSettings };
}
```

#### 2. Update `OrgMap.tsx`

**Add Settings Hook**:

```typescript
const { settings, updateSettings, resetSettings } = useOrgMapSettings(orgId);
```

**Save Viewport Changes**:

```typescript
import { onMove } from 'reactflow';

// In component
const handleViewportChange = useCallback((viewport: Viewport) => {
  updateSettings({ viewport, zoom: viewport.zoom });
}, [updateSettings]);

// In ReactFlow component
<ReactFlow
  // ... existing props
  onMoveEnd={handleViewportChange}
  defaultViewport={settings.viewport}
/>
```

**Save Node Position Changes**:

```typescript
const handleNodesChange = useCallback(
  (changes: NodeChange[]) => {
    onNodesChange(changes);

    // Extract position changes
    const positionChanges = changes.filter(
      change => change.type === 'position' && change.dragging === false
    );

    if (positionChanges.length > 0) {
      const newPositions = { ...settings.nodePositions };
      positionChanges.forEach(change => {
        if (change.type === 'position' && change.position) {
          newPositions[change.id] = change.position;
        }
      });
      updateSettings({ nodePositions: newPositions });
    }
  },
  [onNodesChange, settings.nodePositions, updateSettings]
);
```

**Apply Saved Positions**:

```typescript
// After Dagre layout calculation
const nodesWithSavedPositions = layoutedNodes.map(node => {
  const savedPosition = settings.nodePositions[node.id];
  return {
    ...node,
    position: savedPosition || node.position,
  };
});
```

**Save Expanded State**:

```typescript
const handleToggleExpand = useCallback(
  (nodeId: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      const expandedArray = Array.from(newExpanded);
      updateSettings({ expandedNodes: expandedArray });
      return newExpanded;
    });
  },
  [updateSettings]
);

// Initialize expanded state from settings
useEffect(() => {
  setExpandedNodes(new Set(settings.expandedNodes));
}, [settings.expandedNodes]);
```

**Save Layout Direction**:

```typescript
const handleToggleLayout = useCallback(() => {
  const newDirection = layoutDirection === 'TB' ? 'LR' : 'TB';
  setLayoutDirection(newDirection);
  updateSettings({ layoutDirection: newDirection });
}, [layoutDirection, updateSettings]);
```

#### 3. Add Reset Button to Toolbar

**Update `Toolbar.tsx`**:

```typescript
import { RotateCcw } from 'lucide-react';

interface ToolbarProps {
  // ... existing props
  onResetLayout: () => void;
}

// In component
<button
  onClick={onResetLayout}
  className={buttonClass}
  aria-label="Reset layout to default"
>
  <RotateCcw size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
  <Tooltip>Reset Layout</Tooltip>
</button>
```

**In `OrgMap.tsx`**:

```typescript
const handleResetLayout = useCallback(() => {
  // Confirm with user
  if (confirm('Reset layout to default? This will clear all custom positions.')) {
    resetSettings();
    // Trigger re-layout
    loadData(false);
  }
}, [resetSettings, loadData]);

// Pass to Toolbar
<Toolbar
  // ... existing props
  onResetLayout={handleResetLayout}
/>
```

### Performance Considerations

1. **Debounce Viewport Saves**: Only save viewport after user stops moving (use `onMoveEnd` not `onMove`)
2. **Throttle Position Updates**: Debounce node position saves during drag
3. **Selective Storage**: Only store positions for nodes that have been manually moved
4. **Storage Size**: Monitor localStorage size, clear old org settings if needed

### Testing Strategy

#### Unit Tests

**File**: `src/hooks/useOrgMapSettings.test.ts` (new file)

```typescript
import { renderHook, act } from '@testing-library/react';
import { useOrgMapSettings } from './useOrgMapSettings';

describe('useOrgMapSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should load default settings', () => {
    const { result } = renderHook(() => useOrgMapSettings('org-1'));
    expect(result.current.settings.theme).toBe('slate');
    expect(result.current.settings.layoutDirection).toBe('TB');
  });

  it('should persist settings to localStorage', () => {
    const { result } = renderHook(() => useOrgMapSettings('org-1'));

    act(() => {
      result.current.updateSettings({ theme: 'blue' });
    });

    const saved = JSON.parse(localStorage.getItem('orgMap_org-1_settings')!);
    expect(saved.theme).toBe('blue');
  });

  it('should load saved settings', () => {
    localStorage.setItem(
      'orgMap_org-1_settings',
      JSON.stringify({
        theme: 'emerald',
        zoom: 1.5,
      })
    );

    const { result } = renderHook(() => useOrgMapSettings('org-1'));
    expect(result.current.settings.theme).toBe('emerald');
    expect(result.current.settings.zoom).toBe(1.5);
  });

  it('should reset settings', () => {
    const { result } = renderHook(() => useOrgMapSettings('org-1'));

    act(() => {
      result.current.updateSettings({ theme: 'violet', zoom: 2 });
    });

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.theme).toBe('slate');
    expect(result.current.settings.zoom).toBe(1);
    expect(localStorage.getItem('orgMap_org-1_settings')).toBeNull();
  });
});
```

**Run Command**:

```bash
cd /Users/ojdavis/Claude\ Code/OrgTree
npm test -- src/hooks/useOrgMapSettings.test.ts
```

#### Manual Testing

1. **Setup**:

   ```bash
   npm run dev
   # Navigate to org map
   ```

2. **Test Viewport Persistence**:
   - Zoom in/out using toolbar or mouse wheel
   - Pan around the map
   - Refresh page
   - ✅ Verify zoom and position are restored

3. **Test Node Position Persistence**:
   - Drag a department node to a new position
   - Refresh page
   - ✅ Verify node is in custom position

4. **Test Expanded State Persistence**:
   - Expand several departments
   - Refresh page
   - ✅ Verify departments remain expanded

5. **Test Layout Direction Persistence**:
   - Toggle to horizontal layout
   - Refresh page
   - ✅ Verify horizontal layout is maintained

6. **Test Reset Button**:
   - Make several customizations (zoom, positions, expanded)
   - Click "Reset Layout" button
   - Confirm dialog
   - ✅ Verify all settings reset to default

7. **Test Per-Organization Settings**:
   - Customize Org Map for Organization A
   - Switch to Organization B
   - ✅ Verify Organization B has default settings
   - Switch back to Organization A
   - ✅ Verify Organization A settings are restored

### Edge Cases

1. **Deleted Departments**: Handle saved positions for departments that no longer exist
2. **Large Organizations**: Monitor localStorage size with many node positions
3. **Corrupted Data**: Handle invalid JSON in localStorage gracefully
4. **Browser Limits**: localStorage has ~5-10MB limit per domain
5. **Multiple Tabs**: Changes in one tab should not conflict with another

### Migration Strategy

**Existing Theme Storage**:

- Current: `localStorage.getItem('orgTreeTheme')` (global)
- New: Part of per-org settings
- Migration: On first load, copy global theme to org-specific settings

```typescript
// Migration code in useOrgMapSettings
const migrateOldTheme = () => {
  const oldTheme = localStorage.getItem('orgTreeTheme');
  if (oldTheme && !localStorage.getItem(storageKey)) {
    updateSettings({ theme: oldTheme });
  }
};
```

## Success Metrics

- Settings persist across page refreshes
- Custom node positions are maintained
- Reset button successfully restores defaults
- No performance degradation with saved settings
- Positive user feedback on persistence

## Related Features

- Theme picker (already has persistence)
- Layout toggle (will gain persistence)
- Expand/collapse (will gain persistence)
- Node dragging (will enable custom positions)

---

**Document Owner**: Development Team  
**Last Updated**: January 22, 2026
