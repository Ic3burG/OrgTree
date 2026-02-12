# ADR-022: Advanced Sidebar UI Enhancements

**Status**: Accepted
**Date**: 2026-01-31
**Deciders**: Claude Code, ic3burg
**Tags**: frontend, UI, UX, state-management

## Context and Problem Statement

The previous admin sidebar implementation was limited to a simple two-state (expanded/minimized) system. As the application grew, power users managing multiple organizations required a more flexible workspace that could adapt to different screen sizes and tasks. Specifically, users needed the ability to hide the sidebar completely for a "focus mode," customize the sidebar width, and save these configurations for quick reuse.

## Decision Drivers

- **Workspace Flexibility**: Users should be able to optimize their view for data-heavy tasks vs. navigation-heavy tasks.
- **Persistence**: UI preferences (width, state, pin status) should persist across sessions.
- **Clutter Reduction**: Avoid overwhelming the primary navigation with complex layout management controls.
- **UI Consistency**: Ensure a uniform experience across different layouts (`AdminLayout`, `SuperuserLayout`).

## Considered Options

- **Option 1: Enhance existing layout-specific logic**: Keep sidebar logic inside each layout component.
- **Option 2: Standalone modular Sidebar component**: Extract all sidebar logic into a reusable component and hooks.
- **Option 3: Sidebar with integrated Preset Management**: Include preset saving/loading directly in the sidebar header.
- **Option 4: Sidebar with External Preset Management**: Move preset management to a dedicated settings page.

## Decision Outcome

Chosen option: **Option 2 and Option 4**.

We implemented a modular `Sidebar` component and a suite of hooks (`useSidebar`, `useResizable`, `useWorkspacePresets`).

During implementation, it was decided to move the **Workspace Layout Presets** management to a dedicated **Interface** tab in **Account Settings** (`/settings/preferences`) rather than keeping it in the sidebar header (as originally proposed in the RFC). This decision was made to keep the primary navigation clean and avoid accidentally triggering layout changes during routine navigation.

### Positive Consequences

- **Code Reusability**: The same sidebar component and state logic are shared between the Organization Admin and System Admin interfaces.
- **Improved UX**: Users have fine-grained control over their environment without persistent UI clutter.
- **Performance**: State is managed via specialized hooks, isolating re-renders during resize operations.
- **Migration Path**: Existing `adminSidebarCollapsed` localStorage keys were successfully migrated to the new 3-state system.

### Negative Consequences

- **Discoverability**: Workspace presets are now one click further away (in Settings), requiring users to know where to find them.
- **Complexity**: The sidebar state machine is more complex than a boolean, requiring more rigorous testing.

## Pros and Cons of the Options

### Option 2 (Standalone Component)

- **Good**, because it centralizes sidebar logic and ensures consistency.
- **Good**, because it simplifies the Layout components.
- **Bad**, because it introduces a layer of abstraction for props and callbacks.

### Option 4 (External Preset Management)

- **Good**, because it significantly reduces clutter in the sidebar header.
- **Good**, because it provides a dedicated space for future interface preferences (e.g., font size, theme density).
- **Bad**, because it separates the action (applying a layout) from the context (the sidebar).

## Links

- [RFC: Advanced Sidebar UI Enhancements](../rfc/advanced-sidebar-ui.md)
- [Component: src/components/ui/Sidebar.tsx](../../src/components/ui/Sidebar.tsx)
- [Hook: src/hooks/useSidebar.ts](../../src/hooks/useSidebar.ts)
- [Preferences Page: src/components/account/PreferencesPage.tsx](../../src/components/account/PreferencesPage.tsx)
