# RFC: Achieving 80% Backend Test Coverage

> **Status**: Proposed
> **Date**: January 27, 2026
> **Author**: Claude Code

## 1. Problem Description

As identified in `docs/ROADMAP.md`, the backend test coverage is currently sitting at approximately **73%**. While manageable, this leaves critical areas of the application exposed to regression, particularly in complex logic processing and administrative functions.

A deeper analysis reveals that several high-complexity services have significantly lower coverage than the average, with some key components having little to no coverage at all. To mature the `OrgTree` platform for enterprise scale, we must raise the confidence level in our codebase.

## 2. Goals

1. **Overall Target**: Reach **>80%** statement coverage for the backend (`server/`).
2. **Critical Path Target**: Reach **>90%** coverage for Security/Auth and Data Integrity services.
3. **Zero "Untested" Core Files**: Ensure no core logic file has 0% coverage.

## 3. Coverage Gap Analysis

Our analysis of `coverage-final.json` identified the following high-impact areas where we are missing the most coverage (sorted by number of missing statements):

| File                                         | Current % | Missing Stmts | Criticality                 |
| -------------------------------------------- | --------- | ------------- | --------------------------- |
| `src/services/bulk.service.ts`               | 62.2%     | 96            | **High** (Data Integrity)   |
| `src/services/ownership-transfer.service.ts` | 54.1%     | 95            | **High** (Security)         |
| `src/services/member.service.ts`             | 31.8%     | 73            | **High** (Access Control)   |
| `src/socket.ts`                              | 4.0%      | 72            | Medium (Real-time features) |
| `src/services/search.service.ts`             | 77.4%     | 57            | **High** (Core Feature)     |
| `src/routes/fts-maintenance.ts`              | 0.0%      | 55            | Medium (Maintenance)        |
| `src/services/geds-download.service.ts`      | 34.8%     | 45            | Low (Utility)               |
| `src/services/auth.service.ts`               | 61.7%     | 31            | **Critical** (Security)     |

**Key Findings:**

- **Member Management is risky**: `member.service.ts` and `ownership-transfer.service.ts` handle sensitive permission changes but have poor coverage.
- **Auth Service is under-tested**: At 61.7%, `auth.service.ts` is dangerously low for a primary security barrier.
- **Real-time Logic is blind**: `socket.ts` is essentially untested.

## 4. Implementation Plan

We propose a 4-phase attack plan to reach our goal.

### Phase 1: Security & Integrity (The "Must Haves")

_Focus: Locking down permissions and data mutations._

- [x] **Rewrite `member.service.test.ts`**: Mock database calls to test all edge cases for member role promotion/demotion.
- [x] **Expand `ownership-transfer.service.test.ts`**: specific focus on expiry logic and race conditions.
- [x] **Fortify `auth.service.ts`**: Add tests for token refresh failures, mfa-bypass attempts, and session revocation.

### Phase 2: Administrative Bulk Operations (In Progress)

- [x] `bulk.service.ts` (Achieved 84.6% coverage)
      _Focus: Complex logic with high regression potential._

- [ ] **Deep dive `bulk.service.ts`**: This likely contains complex loops and validation logic. We need unit tests for:
  - Partial failures (some items valid, some invalid).
  - Large payload handling.
  - Transaction rollbacks on critical failure.

### Phase 3: Infrastructure & Maintenance [x]

- **Target**: `routes/fts-maintenance.ts`, `socket.ts`, `geds-download.service.ts`
- **Goal**: Ensure infrastructure components are reliable.
- **Status**: Completed (January 28, 2026)
- [x] **Test `routes/fts-maintenance.ts`**: Ensure maintenance triggers work and handle database locks gracefully.
- [x] **Test `socket.ts`**: Implement a test harness for Socket.IO to verify event emission and room joining logic.
- [x] **Fix `geds-download.service.ts`**: Add mock tests for external URL failures (already started but low coverage).

### Phase 4: Route Layer Coverage [x]

- **Target**: `routes/saved-searches.ts`, `routes/organizations.ts`
- **Goal**: Reach >80% coverage for these routes.
- **Status**: Completed (January 28, 2026)

- [x] **`routes/saved-searches.ts`** (0% -> 88.88%): Implemented full CRUD tests.
- [x] **`routes/organizations.ts`** (-> 84.84%): Expanded tests to cover ownership transfer and sharing endpoints.
- [x] **`routes/member.ts`** (-> 89.74%): Verified administrative operations coverage.
- [x] **`routes/people.ts`** (-> 89.47%): Fixed timeout issues and verified CRUD flows.
- [x] **`routes/search.ts`** (-> 95.83%): Added tests for optional auth and error handling.

## 5. Tooling & Standards

To prevent regression, we will implement:

1. **Husky Pre-push Check**: Fail push if coverage drops (using `jest-coverage-ratchet` or similar logic).
2. **Coverage Reports**: Generate HTML reports in CI for visibility.

## 6. Timeline Estimate

- **Phase 1**: 2 Days
- **Phase 2**: 1 Day
- **Phase 3**: 1 Day
- **Phase 4**: 1 Day
- **Total**: ~1 week active effort to cross the 80% line.
