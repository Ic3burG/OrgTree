# ADR-024: Automated Coverage Maintenance & Ratcheting

**Status**: Accepted
**Date**: 2026-01-28
**Deciders**: OrgTree Development Team
**Tags**: testing, devops, code-quality

## Context and Problem Statement

We have recently invested significant effort to raise our backend test
coverage to **80.82%**. Coverage is a trailing indicator of quality, but it is
a leading indicator of maintainability. However, without automated enforcement,
this coverage metric will naturally degrade over time as new features are added
without corresponding tests (a phenomenon known as "coverage rot"). How can we
preserve and continuously improve our hard-won code coverage without relying
solely on developer discipline?

## Decision Drivers

- Need to prevent coverage regression over time
- Desire to automate quality enforcement without manual oversight
- Want to encourage a culture of continuous testing improvement
- Must maintain developer velocity while enforcing quality standards
- Prefer self-contained tooling that doesn't require external services

## Considered Options

- **Option 1**: Automated coverage maintenance with ratcheting using Vitest
  thresholds and a custom script
- **Option 2**: Third-party coverage tracking service (Codecov/Coveralls)
- **Option 3**: Jest-based ratcheting libraries
- **Option 4**: Manual periodic reviews of coverage reports

## Decision Outcome

Chosen option: **"Automated coverage maintenance with ratcheting using Vitest
thresholds and a custom script"**, because it provides automated enforcement at
the pre-push stage, enables continuous improvement through the ratcheting
mechanism, and keeps all tooling self-contained within the repository.

### Implementation Details

We implement a strict automated coverage maintenance and "ratcheting" system
consisting of three key components:

#### 1. Strict Global Thresholds

We configure `vitest.config.ts` to enforce the current baseline as the hard
minimum:

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

#### 2. Pre-Push Enforcement (Husky)

We update our Husky `pre-push` hook to run a coverage check
(`npm run test:coverage`). This ensures that no code can be pushed to the
remote repository if it drops coverage below the thresholds.

#### 3. The "Ratchet" Mechanism

Ratcheting means "you can't do worse than yesterday." If we reach a higher
coverage percentage, the required threshold should automatically update to this
new level.

We utilize a custom script `scripts/update-coverage-thresholds.ts` that:

1. Runs coverage
2. Reads `coverage-final.json`
3. Updates `vitest.config.ts` if the new coverage is higher than the
   configured threshold

### Positive Consequences

- **Zero Regression**: No commit is accepted that lowers coverage
- **Steady Growth**: Coverage trend line remains flat or positive over time
- **Visibility**: Coverage metrics are enforced in local development before
  pushing
- **Self-Contained**: No external dependencies or token management required
- **Automated**: No manual intervention needed to maintain or improve coverage

### Negative Consequences

- **Slower Push**: The pre-push hook takes longer to run as it executes the
  full test suite with coverage
- **Rigidity**: Developers must add tests for _every_ new piece of logic,
  which can slow down rapid prototyping (though this is arguably a benefit for
  long-term quality)
- **Build Breaking Potential**: Developers might be blocked from pushing if
  they inadvertently decrease coverage

## Pros and Cons of the Options

### Option 1: Automated coverage maintenance with ratcheting

- **Good**, because it provides immediate feedback during development
- **Good**, because it prevents coverage regression automatically
- **Good**, because it encourages continuous improvement through ratcheting
- **Good**, because it's self-contained with no external dependencies
- **Bad**, because it slows down the push process
- **Bad**, because it requires custom scripting for the ratchet mechanism

### Option 2: Third-party coverage tracking service (Codecov/Coveralls)

- **Good**, because these services provide rich visualizations and reports
- **Good**, because they handle coverage tracking automatically
- **Good**, because they integrate with CI/CD pipelines
- **Bad**, because they require token management and external integration
- **Bad**, because they introduce external dependencies and potential costs
- **Bad**, because they may not support pre-push enforcement as strictly

### Option 3: Jest-based ratcheting libraries

- **Good**, because there are established libraries available for Jest
- **Bad**, because we use Vitest, not Jest
- **Bad**, because migration to Jest would be significant effort
- **Bad**, because fewer ratcheting libraries exist for Vitest

### Option 4: Manual periodic reviews of coverage reports

- **Good**, because it requires no additional tooling
- **Good**, because it doesn't slow down development workflow
- **Bad**, because it relies entirely on human discipline
- **Bad**, because it's easy to miss regressions until they accumulate
- **Bad**, because it doesn't provide immediate feedback

## Links

<!-- markdownlint-disable MD013 -->

- [Related]
  [ADR-020: Backend Test Coverage (80% Achieved)](020-backend-test-coverage-80-percent.md) -
  The initial effort to reach 80% coverage
  <!-- markdownlint-enable MD013 -->
  <!-- markdownlint-disable MD013 -->
- [Related]
[ADR-021: Frontend Quality & E2E Testing Strategy](021-frontend-quality-e2e-strategy.md) -
Complementary testing strategy for frontend
<!-- markdownlint-enable MD013 -->
