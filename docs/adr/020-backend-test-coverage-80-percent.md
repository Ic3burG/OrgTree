# ADR-020: Backend Test Coverage (80% Achieved)

**Status**: Accepted
**Date**: January 28, 2026
**Deciders**: Development Team
**Tags**: testing, backend, code-quality
**Target**: Maintain >80% backend statement coverage

## Context

As part of the ongoing effort to improve system reliability and maintainability (see [ADR-014: Test Coverage Expansion](014-test-coverage-expansion.md)), the `OrgTree` project identified significant gaps in backend coverage, specifically in security-critical services and administrative functions.

This ADR records the completion of the 80% coverage goal and the specific implementation details that achieved it.

## Decision

We have implemented comprehensive test suites for all core backend services, reaching a total of **80.82%** statement coverage across the `server/` directory.

### Key Implementation Milestones

1. **Security & Integrity**:
   - **Auth Service**: Expanded tests to 87.3% coverage, covering token refresh, session revocation, and edge cases.
   - **Member Service**: Reached 89.7% coverage for administrative operations and bulk permissions.
   - **Ownership Transfer**: Verified complex expiry and security logic.

2. **Bulk Operations**:
   - **Bulk Service**: Improved to 84.6% coverage, handling large payloads and partial failures.

3. **Search & Infrastructure**:
   - **Search Service**: Achieved 95.8% coverage, including FTS maintenance, optional authentication, and error propagation.
   - **Socket.io**: Implemented a mock test harness to verify event emissions.
   - **GEDS Downloader**: Added coverage for external service failure scenarios.

4. **Route Layer**:
   - All core routes (`saved-searches`, `people`, `organizations`) now exceed 80% coverage.

## Consequences

- **Higher Confidence**: Refactoring and feature additions are now guarded by a robust test suite.
- **Improved Bug Detection**: Several edge cases and race conditions were identified and fixed during the test expansion.
- **Maintenance Requirement**: New code must now include tests that maintain or improve these thresholds (see [RFC: Automated Coverage Maintenance & Ratcheting](../rfc/coverage-maintenance-ratcheting.md)).

## Results Summary (Jan 28, 2026)

| Component         | Final Coverage % |
| ----------------- | ---------------- |
| **Total Backend** | **80.82%**       |
| Auth Routes       | 87.3%            |
| Member Routes     | 89.7%            |
| People Routes     | 89.5%            |
| Search Service    | 95.8%            |
| Organizations     | 84.8%            |

## Links

- [ADR-014: Test Coverage Expansion](014-test-coverage-expansion.md)
- [RFC: Automated Coverage Maintenance & Ratcheting](../rfc/coverage-maintenance-ratcheting.md)
- [RFC: Frontend Quality & E2E Testing Strategy](../rfc/frontend-quality-e2e-strategy.md)
