# ADR-011: Rainbow Color Theme
**Status**: Accepted
**Date**: 2026-01-25
**Deciders**: Development Team
**Tags**: ui, theme, visualizationVery Low

## Overview

Add a vibrant rainbow color theme to the Org Map that cycles through rainbow colors (red, orange, yellow, green, blue, indigo, violet) as depth increases. This provides a fun, colorful alternative to the existing professional themes.

## User Story

**As a** user viewing the Org Map  
**I want** a rainbow color theme option  
**So that** I can visualize the hierarchy with vibrant, distinct colors

## Current Behavior

- 6 existing themes: Slate, Blue, Emerald, Violet, Amber, Rose
- Each theme uses 5 shades of a single color
- Darker shades for higher levels, lighter for deeper levels
- Theme picker in toolbar allows switching

## Proposed Behavior

- Add "Rainbow" as 7th theme option
- Cycles through rainbow spectrum by depth:
  - Depth 0: Red
  - Depth 1: Orange
  - Depth 2: Yellow
  - Depth 3: Green
  - Depth 4: Blue
  - Depth 5+: Cycles back through spectrum

## Technical Implementation

### Files to Modify

#### 1. `src/utils/colors.ts`

Add rainbow theme to the `themes` object:

```typescript
const themes: Record<string, Theme> = {
  // ... existing themes
  rainbow: {
    name: 'Rainbow',
    colors: [
      // Depth 0: Red
      { bg: 'bg-red-600', hex: '#dc2626', text: 'text-white', hover: 'hover:bg-red-500' },
      // Depth 1: Orange
      { bg: 'bg-orange-500', hex: '#f97316', text: 'text-white', hover: 'hover:bg-orange-400' },
      // Depth 2: Yellow
      {
        bg: 'bg-yellow-500',
        hex: '#eab308',
        text: 'text-yellow-900',
        hover: 'hover:bg-yellow-400',
      },
      // Depth 3: Green
      { bg: 'bg-green-600', hex: '#16a34a', text: 'text-white', hover: 'hover:bg-green-500' },
      // Depth 4: Blue
      { bg: 'bg-blue-600', hex: '#2563eb', text: 'text-white', hover: 'hover:bg-blue-500' },
      // Depth 5: Indigo
      { bg: 'bg-indigo-600', hex: '#4f46e5', text: 'text-white', hover: 'hover:bg-indigo-500' },
      // Depth 6: Violet
      { bg: 'bg-violet-600', hex: '#7c3aed', text: 'text-white', hover: 'hover:bg-violet-500' },
    ],
    swatch: '#dc2626', // Red swatch for theme picker
  },
};
```

**Alternative Rainbow Palette** (More Vibrant):

```typescript
rainbow: {
  name: 'Rainbow',
  colors: [
    { bg: 'bg-red-500', hex: '#ef4444', text: 'text-white', hover: 'hover:bg-red-400' },
    { bg: 'bg-orange-400', hex: '#fb923c', text: 'text-orange-900', hover: 'hover:bg-orange-300' },
    { bg: 'bg-amber-400', hex: '#fbbf24', text: 'text-amber-900', hover: 'hover:bg-amber-300' },
    { bg: 'bg-lime-500', hex: '#84cc16', text: 'text-white', hover: 'hover:bg-lime-400' },
    { bg: 'bg-cyan-500', hex: '#06b6d4', text: 'text-white', hover: 'hover:bg-cyan-400' },
    { bg: 'bg-blue-500', hex: '#3b82f6', text: 'text-white', hover: 'hover:bg-blue-400' },
    { bg: 'bg-purple-500', hex: '#a855f7', text: 'text-white', hover: 'hover:bg-purple-400' },
  ],
  swatch: '#ef4444',
},
```

#### 2. Update `getDepthColors` Function

The existing function already handles cycling through colors:

```typescript
export function getDepthColors(depth: number, themeName: string = 'slate'): ColorConfig {
  const theme = themes[themeName] || themes['slate'];
  const safeDepth = Math.max(0, depth || 0);
  const index = Math.min(safeDepth, theme.colors.length - 1);
  return theme.colors[index];
}
```

For rainbow theme with cycling:

```typescript
export function getDepthColors(depth: number, themeName: string = 'slate'): ColorConfig {
  const theme = themes[themeName] || themes['slate'];
  const safeDepth = Math.max(0, depth || 0);

  // For rainbow theme, cycle through colors instead of capping
  if (themeName === 'rainbow') {
    const index = safeDepth % theme.colors.length;
    return theme.colors[index];
  }

  // For other themes, cap at last color
  const index = Math.min(safeDepth, theme.colors.length - 1);
  return theme.colors[index];
}
```

### Visual Design

**Rainbow Theme Appearance**:

```text
Level 0 (CEO)           → Red
  ├─ Level 1 (VP)       → Orange
  │   ├─ Level 2 (Dir)  → Yellow
  │   │   └─ Level 3    → Green
  │   └─ Level 2        → Yellow
  └─ Level 1            → Orange
      └─ Level 2        → Yellow
          └─ Level 3    → Green
              └─ Level 4 → Blue
                  └─ Level 5 → Indigo
                      └─ Level 6 → Violet
                          └─ Level 7 → Red (cycles)
```

### Testing Strategy

#### Unit Tests

**File**: `src/utils/colors.test.ts` (existing file)

Add test cases for rainbow theme:

```typescript
describe('Rainbow Theme', () => {
  it('should return rainbow colors for each depth', () => {
    expect(getDepthColors(0, 'rainbow').hex).toBe('#dc2626'); // Red
    expect(getDepthColors(1, 'rainbow').hex).toBe('#f97316'); // Orange
    expect(getDepthColors(2, 'rainbow').hex).toBe('#eab308'); // Yellow
    expect(getDepthColors(3, 'rainbow').hex).toBe('#16a34a'); // Green
    expect(getDepthColors(4, 'rainbow').hex).toBe('#2563eb'); // Blue
    expect(getDepthColors(5, 'rainbow').hex).toBe('#4f46e5'); // Indigo
    expect(getDepthColors(6, 'rainbow').hex).toBe('#7c3aed'); // Violet
  });

  it('should cycle rainbow colors for deep hierarchies', () => {
    // Depth 7 should cycle back to red (depth 0)
    expect(getDepthColors(7, 'rainbow').hex).toBe('#dc2626');
    expect(getDepthColors(8, 'rainbow').hex).toBe('#f97316');
  });

  it('should include rainbow in theme list', () => {
    const themes = getThemeList();
    const rainbow = themes.find(t => t.id === 'rainbow');
    expect(rainbow).toBeDefined();
    expect(rainbow?.name).toBe('Rainbow');
  });
});
```

**Run Command**:

```bash
cd /Users/ojdavis/Claude\ Code/OrgTree
npm test -- src/utils/colors.test.ts
```

#### Manual Testing

1. **Setup**:

   ```bash
   npm run dev
   # Navigate to org map
   ```

2. **Test Rainbow Theme**:
   - Open theme picker in toolbar
   - ✅ Verify "Rainbow" appears in theme list
   - Select Rainbow theme
   - ✅ Verify departments show rainbow colors by depth
   - ✅ Verify red → orange → yellow → green → blue → indigo → violet progression

3. **Test Deep Hierarchies**:
   - Create org with 8+ levels
   - Apply rainbow theme
   - ✅ Verify colors cycle after violet (back to red)

4. **Test Theme Persistence**:
   - Select rainbow theme
   - Refresh page
   - ✅ Verify rainbow theme persists

5. **Test Dark Mode**:
   - Toggle dark mode
   - ✅ Verify rainbow colors are visible in dark mode
   - ✅ Verify text contrast is readable

6. **Test MiniMap**:
   - Check minimap with rainbow theme
   - ✅ Verify rainbow colors appear in minimap

### Accessibility Considerations

- **Color Contrast**: Ensure text colors (white/dark) have sufficient contrast
- **Colorblind Users**: Rainbow may be difficult for some users; keep other themes available
- **Text Readability**: Yellow departments use dark text for better contrast

### Alternative Color Palettes

**Option 1: Pastel Rainbow** (Softer colors):

```typescript
colors: [
  { bg: 'bg-red-400', hex: '#f87171', text: 'text-red-900', hover: 'hover:bg-red-300' },
  { bg: 'bg-orange-300', hex: '#fdba74', text: 'text-orange-900', hover: 'hover:bg-orange-200' },
  { bg: 'bg-yellow-300', hex: '#fde047', text: 'text-yellow-900', hover: 'hover:bg-yellow-200' },
  { bg: 'bg-green-400', hex: '#4ade80', text: 'text-green-900', hover: 'hover:bg-green-300' },
  { bg: 'bg-blue-400', hex: '#60a5fa', text: 'text-blue-900', hover: 'hover:bg-blue-300' },
  { bg: 'bg-indigo-400', hex: '#818cf8', text: 'text-indigo-900', hover: 'hover:bg-indigo-300' },
  { bg: 'bg-purple-400', hex: '#c084fc', text: 'text-purple-900', hover: 'hover:bg-purple-300' },
],
```

**Option 2: Neon Rainbow** (High saturation):

```typescript
colors: [
  { bg: 'bg-red-600', hex: '#dc2626', text: 'text-white', hover: 'hover:bg-red-500' },
  { bg: 'bg-orange-600', hex: '#ea580c', text: 'text-white', hover: 'hover:bg-orange-500' },
  { bg: 'bg-yellow-400', hex: '#facc15', text: 'text-yellow-900', hover: 'hover:bg-yellow-300' },
  { bg: 'bg-lime-600', hex: '#65a30d', text: 'text-white', hover: 'hover:bg-lime-500' },
  { bg: 'bg-cyan-600', hex: '#0891b2', text: 'text-white', hover: 'hover:bg-cyan-500' },
  { bg: 'bg-indigo-600', hex: '#4f46e5', text: 'text-white', hover: 'hover:bg-indigo-500' },
  { bg: 'bg-fuchsia-600', hex: '#c026d3', text: 'text-white', hover: 'hover:bg-fuchsia-500' },
],
```

## Success Metrics

- Rainbow theme appears in theme picker
- Colors cycle correctly through spectrum
- Text remains readable on all colors
- Theme persists across sessions
- Positive user feedback on visual appeal

## Related Features

- Existing theme system (slate, blue, emerald, violet, amber, rose)
- Theme picker component
- Theme persistence (localStorage)
- MiniMap color rendering

---

**Document Owner**: Development Team  
**Last Updated**: January 22, 2026
