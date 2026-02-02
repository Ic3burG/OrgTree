# ADR 024: Automated Coverage Maintenance & Ratcheting

> **Status**: Accepted
> **Date**: January 28, 2026
> **Author**: Claude Code

## 1. Context

We have recently invested significant effort to raise our backend test coverage to **80.82%**. Coverage is a trailing indicator of quality, but it is a leading indicator of maintainability.

Without automated enforcement, this coverage metric will naturally degrade over time as new features are added without corresponding tests ("coverage rot"). Relying on developer discipline alone is insufficient for long-term project health.

## 2. Decision

We have decided to implement a strict automated coverage maintenance and "ratcheting" system.

### 2.1. Strict Global Thresholds

We configure `vitest.config.ts` to enforce the current baseline as the hard minimum.

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

### 2.2. Pre-Push Enforcement (Husky)

We update our Husky `pre-push` hook to run a coverage check (`npm run test:coverage`). This ensures that no code can be pushed to the remote repository if it drops coverage below the thresholds.

### 2.3. The "Ratchet" Mechanism

Ratcheting means "you can't do worse than yesterday." If we reach a higher coverage percentage, the required threshold should automatically update to this new level.

We utilize a custom script `scripts/update-coverage-thresholds.ts` that:

1. **Runs coverage.**
2. **Reads `coverage-final.json`.**
3. **Updates `vitest.config.ts` if the new coverage is higher than the configured threshold.**

## 3. Consequences

**Positive:**
- **Zero Regression**: No commit is accepted that lowers coverage.
- **Steady Growth**: Coverage trend line remains flat or positive over time.
- **Visibility**: Coverage metrics are enforced in local development before pushing.

**Negative:**
- **Slower Push**: The pre-push hook takes longer to run as it executes the full test suite with coverage.
- **Rigidity**: Developers must add tests for *every* new piece of logic, which can slow down rapid prototyping (though this is arguably a benefit for long-term quality).

## 4. Alternatives Considered

- **Codecov / Coveralls**: Third-party services are excellent but require token management and external integration. We prefer keeping the tooling self-contained within the repo for now.
- **Jest Ratchet**: There are libraries for Jest, but fewer for Vitest. A custom script is simpler and stricter.
