# ADR-027: Mobile Experience Overhaul

**Status**: Accepted
**Date**: 2026-02-07
**Deciders**: OJ Davis, Claude (AI)
**Tags**: mobile, UX, CSS, responsive-design

## Context and Problem Statement

OrgTree's mobile experience was broken in multiple areas. The Toolbar rendered 10 buttons in a ~460px vertical column that overflowed most phone screens. The use of `h-screen` (CSS `100vh`) throughout the app caused content to hide behind mobile browser chrome (address bar, navigation gestures). PublicOrgMap had zero mobile UI accommodations. Modals and forms became unusable when the mobile keyboard opened because `max-h-[90vh]` did not account for the reduced visible area.

## Decision Drivers

- The Toolbar was visually broken on any device shorter than ~520px (e.g., iPhone SE at 667px minus browser chrome)
- `100vh` is a well-documented mobile CSS issue — it equals the _largest_ possible viewport, not the _visible_ viewport
- Modal forms were the most complained-about mobile pain point: users could not see submit buttons with the keyboard open
- The codebase already had a consistent `lg:` (1024px) mobile breakpoint, MobileNav, and AdminLayout responsive drawer, so targeted fixes were feasible without a rewrite
- PublicOrgMap is the most shared view (public links) and had no mobile optimizations

## Considered Options

- **Option 1**: Targeted CSS and component fixes using existing Tailwind utilities and modern viewport units (`dvh`)
- **Option 2**: Full responsive redesign with a dedicated mobile component library (e.g., Headless UI mobile patterns)
- **Option 3**: Separate mobile-specific routes/views (e.g., `/m/org/:id`)

## Decision Outcome

Chosen option: "Option 1 — Targeted CSS and component fixes", because it addressed all critical issues with minimal risk, no new dependencies, and built on the existing responsive foundation. The codebase already used Tailwind's `lg:` breakpoint consistently, so extending that pattern kept things maintainable.

### Positive Consequences

- All critical mobile issues resolved in a single commit across 15 files
- No new dependencies added — uses standard CSS (`dvh`, `env()`, `viewport-fit`) and existing Tailwind
- Desktop experience completely unchanged — all changes are gated behind `lg:` breakpoints
- Consistent mobile breakpoint (`lg:` at 1024px) maintained across the entire app
- 300/300 existing tests continue to pass without modification

### Negative Consequences

- `dvh` units have no support in browsers older than Safari 15.4 / Chrome 108 (2022), though this aligns with the project's modern-browser target
- The Toolbar FAB pattern adds a tap to access tools on mobile (one tap to open, one to use) — a tradeoff for screen space
- `interactive-widget=resizes-content` is not supported in all browsers; Firefox desktop ignores it (irrelevant for mobile)

## Pros and Cons of the Options

### Option 1: Targeted CSS and component fixes

- **Good**, because it uses only standard CSS and existing Tailwind utilities — zero new dependencies
- **Good**, because the scope is narrow (15 files) and each change is independently verifiable
- **Good**, because desktop UX is completely unaffected
- **Bad**, because it relies on modern CSS features (`dvh`, `env(safe-area-inset-*)`) that older browsers don't support

### Option 2: Full responsive redesign with mobile component library

- **Good**, because it could provide a more polished, app-like mobile experience
- **Good**, because headless UI components handle accessibility and mobile patterns out of the box
- **Bad**, because it would require significant refactoring of existing components
- **Bad**, because it adds a new dependency and increases bundle size
- **Bad**, because the existing responsive foundation is solid and a rewrite is disproportionate to the issues

### Option 3: Separate mobile routes/views

- **Good**, because mobile and desktop can evolve independently
- **Bad**, because it doubles the maintenance surface area for every feature
- **Bad**, because it fragments the codebase and breaks the DRY principle
- **Bad**, because shared links would need platform detection or redirects

## Implementation Details

### Phase 1: Critical Layout Fixes

| Change | File(s) | Rationale |
|--------|---------|-----------|
| Viewport meta: `viewport-fit=cover`, `interactive-widget=resizes-content` | `index.html` | Enables `env(safe-area-inset-*)` for notched phones; resizes viewport when keyboard opens |
| Safe area utility classes | `src/index.css` | `pb-safe` / `safe-area-inset-bottom` were referenced but never defined |
| Collapsible FAB toolbar | `src/components/Toolbar.tsx` | 10 buttons in 460px column → single FAB expanding to 3x3 grid |
| `h-screen` → `h-full` | `OrgMap.tsx` | Lives inside AdminLayout which already handles height; `h-screen` overflowed by 78px |
| `h-screen` → `h-dvh` | `PublicOrgMap.tsx`, `AdminLayout.tsx` | Standalone containers need dynamic viewport height |
| Hide MiniMap on mobile | `OrgMap.tsx`, `PublicOrgMap.tsx` | Reclaims ~120x80px; pinch-to-zoom is the primary mobile interaction |
| Compact public badge | `PublicOrgMap.tsx` | Hides SVG icon and subtitle on mobile, reduces padding |

### Phase 2: Modal & Form Keyboard Fixes

| Change | File(s) | Rationale |
|--------|---------|-----------|
| `max-h-[90vh]` → `max-h-[85dvh]` | 7 modal components | `dvh` tracks visible viewport; 85% leaves breathing room for backdrop |
| Sticky submit footers | `PersonForm.tsx`, `DepartmentForm.tsx` | Buttons stay visible while scrolling long forms on mobile |
| Toast repositioning | `Toast.tsx` | `bottom-20` on mobile (above MobileNav), full-width on narrow screens |

### Phase 3: Polish

| Change | File(s) | Rationale |
|--------|---------|-----------|
| `pb-safe` on DetailPanel | `DetailPanel.tsx` | Bottom padding for notched phones |

## Links

- Related: [ADR-022: Advanced Sidebar UI](./022-advanced-sidebar-ui.md) — established `lg:` breakpoint convention
- Reference: [webkit.org - viewport-fit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- Reference: [web.dev - interactive-widget](https://developer.chrome.com/blog/viewport-resize-behavior)
