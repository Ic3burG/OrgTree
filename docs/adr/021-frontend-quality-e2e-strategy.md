# ADR 021: Frontend Quality & E2E Testing Strategy

> **Status**: Accepted
> **Date**: January 31, 2026
> **Author**: Claude Code
> **Decision**: Adopted stricter frontend testing standards including comprehensive unit tests, E2E critical user journeys, and visual regression testing.

## 1. Problem Description

While our backend coverage has reached a robust >80%, our frontend quality assurance lags behind significantly.

- **Frontend Unit Coverage**: ~36%
- **E2E Coverage**: Partial (Critical paths only)
- **Visual Regression**: Non-existent

This disparity creates a risk where backend API changes are well-verified, but the UI consuming them may break silently or regress visually.

## 2. Goals

1. **Parity**: Bring frontend unit coverage to >60% within 3 months, eventually matching backend's 80%.
2. **Confidence**: Ensure critical user journeys (Sign up -> Search -> Edit -> Logout) are fully automated.
3. **Visual Stability**: Prevent accidental CSS breakages or layout shifts.

## 3. Proposed Strategy

### 3.1. Testing Pyramids & Scopes

We will adopt a strict separation of concerns for frontend testing:

1. **Unit Tests (Vitest + React Testing Library)**:
   - **Scope**: Hooks, Utility functions, pure UI components (e.g., Button, Card).
   - **Target**: 100% coverage for shared `src/components/*` and `src/utils/*`.

2. **Integration Tests (Vitest + RTL)**:
   - **Scope**: Complex forms, page-level components, Context providers.
   - **Target**: Verify state management and user interaction flows (click, type, submit).

3. **End-to-End Tests (Playwright)**:
   - **Scope**: Full application journeys running against a real backend (or Dockerized environment).
   - **Target**: Smoke tests for every release.

### 3.2. E2E Expansion Plan

Our current Playwright suite covers basic navigation. We need to expand this to "Critical User Journeys" (CUJs):

- **CUJ-1: Organization Management**: Create Org -> Add Member -> Transfer Ownership -> Delete Org.
- **CUJ-2: Search & Discovery**: Search with typos -> FTS fallback -> Click Result -> View Profile.
- **CUJ-3: Admin Workflows**: Bulk import users -> Manage permissions -> Review Audit logs.

### 3.3. Visual Regression Testing (VRT)

We will introduce Playwright's visual comparison capabilities for our core UI library.

```typescript
// Example VRT test
test('org chart rendering', async ({ page }) => {
  await page.goto('/org/1/map');
  await expect(page).toHaveScreenshot('org-map-v1.png');
});
```

This will run in CI to catch unexpected layout shifts, color changes, or broken responsive layouts.

## 4. Implementation Phase

### Phase 1: Foundation (Completed)

- [x] Audit and remove dead frontend code.
- [x] Configure `vitest` for frontend with separate thresholds.
- [x] Setup Visual Regression baseline screenshots.

### Phase 2: Critical Components (Completed)

- [x] Write unit tests for all `src/hooks/*`.
- [x] Write unit tests for atomic components in `src/components/ui/*`.

### Phase 3: E2E Expansion (Completed)

- [x] Implement CUJ-1 and CUJ-2 in Playwright.
- [x] Setup GitHub Actions matrix to run E2E on Chromium, Firefox, and WebKit.

## 5. Metrics for Success

- **Coverage**: Frontend coverage reaches >60%.
- **Zero UI Regressions**: No "broken layout" bugs reported in production.
- **Release Confidence**: Manual QA time reduced by 50% due to trusted E2E suite.
