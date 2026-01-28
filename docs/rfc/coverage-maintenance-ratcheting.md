# RFC: Automated Coverage Maintenance & Ratcheting

> **Status**: Proposed
> **Date**: January 28, 2026
> **Author**: Claude Code

## 1. Problem Description

We have recently invested significant effort to raise our backend test coverage to **80.82%**. Coverage is a trailing indicator of quality, but it is a leading indicator of maintainability.

Without automated enforcement, this coverage metric will naturally degrade over time as new features are added without corresponding tests ("coverage rot"). relying on developer discipline alone is insufficient for long-term project health.

## 2. Goals

1. **Stop the Bleeding**: Prevent any PR or commit from lowering the total coverage percentage.

- **Ratchet Up**: As coverage improves, automatically raise the minimum threshold to the new level.
- **Visibility**: Make coverage metrics visible in PRs and local development.

## 3. Proposed Solution

### 3.1. Strict Global Thresholds

We will configure `vitest.config.ts` to enforce the current baseline as the hard minimum.

```typescript
// vitest.config.ts
test: {
  coverage: {
    thresholds: {
      statements: 80,
      branches: 69,
      functions: 82,
      lines: 81
    }
  }
}
```

### 3.2. Pre-Push Enforcement (Husky)

We will update our Husky `pre-push` hook to run a coverage check. This ensures that no code can be pushed to the remote repository if it drops coverage below the thresholds.

**Current Workflow**:

- `npm run test` (runs tests but doesn't check coverage thresholds strictly)

**Proposed Workflow**:

- `npm run test:coverage` (runs tests AND fails if thresholds are not met)

### 3.3. The "Ratchet" Mechanism

Ratcheting means "you can't do worse than yesterday." If we reach 82% coverage, the required threshold should automatically become 82%.

Since Vitest doesn't support native "ratcheting" (updating configuration automatically), we will implement a lightweight custom script `scripts/update-coverage-thresholds.ts` that:

1. **Runs coverage.**
2. **Reads `coverage-final.json`.**
3. **Updates `vitest.config.ts` if the new coverage is higher than the configured threshold.**
4. **This script can be run periodically (e.g., in CI or manually) to "lock in" gains.**

## 4. Implementation Steps

1. **Baseline Configuration**: Update `vitest.config.ts` with our current 80.82% numbers.
2. **Husky Update**: Modify `.husky/pre-push` to execute `npm run test:coverage`.
3. **CI Failure**: Ensure GitHub Actions fails the build if `npm run test:coverage` fails.
4. **Reporting**: Add a step in CI to upload the HTML coverage report as a build artifact for inspection.

## 5. Alternatives Considered

- **Codecov / Coveralls**: Third-party services are excellent but require token management and external integration. We prefer keeping the tooling self-contained within the repo for now.
- **Jest Ratchet**: There are libraries for Jest, but fewer for Vitest. A custom script is simpler and stricter.

## 6. Metrics for Success

- **Zero Regression**: No commit is accepted that lowers coverage.
- **Steady Growth**: Coverage trend line remains flat or positive over 3 months.
