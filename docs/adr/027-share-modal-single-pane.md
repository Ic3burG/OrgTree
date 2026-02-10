# ADR-027: Share Modal Single-Pane Layout

**Status**: Accepted
**Date**: 2026-02-10
**Deciders**: OrgTree Development Team
**Tags**: ui, sharing, modal

## Context and Problem Statement

The Share Organization modal used a two-tab layout ("Public Link" and "Team Members") to separate public sharing controls from team member management. The Public Link tab contained minimal content (a toggle, URL field, and info box), making it feel sparse as a standalone tab. Admins who wanted to manage both public access and team members had to click between tabs, adding unnecessary friction.

## Decision Drivers

- The Public Link section is lightweight (~150px of content) and doesn't justify its own tab
- Admins frequently need to configure both public access and team members in one session
- Reducing clicks improves the overall sharing workflow
- Non-admins only see the Public Link section, so the combined layout stays clean for them

## Decision

Combine both tabs into a single scrollable pane with section headers and a divider.

### Layout Structure

- **Public Link** section at the top with an uppercase label and Globe icon
- A `border-t` divider separating the two sections
- **Team Members** section below (conditionally rendered for admin/owner roles only)
- "Add Member" button placed inline with the Team Members header to save vertical space

### Key Changes

1. **Removed** `activeTab` state and the tab navigation bar
2. **Eager-load members** on mount for admins (previously lazy-loaded on tab click)
3. **Simplified member cards** by removing the non-admin code path from the Team Members section, since the entire section is only rendered for admins
4. **Removed** the Public Link info box (redundant with the toggle's subtitle text)
5. **Compacted** the empty members state from a large illustration to a single-line message

## Consequences

### Positive

- One fewer click for admins to access team member management
- ~65 fewer lines of code and one fewer state variable
- Cleaner visual hierarchy with section headers
- Non-admins see only the Public Link section with no empty/hidden tab

### Negative

- Members API call now fires on every modal open for admins (previously only on tab click) — negligible performance impact
- Slightly taller modal when both sections are populated, though the existing `max-h-[85dvh]` with `overflow-y-auto` handles this well

### Neutral

- Existing tests pass without modification (they test toggle behavior, not tab navigation)
