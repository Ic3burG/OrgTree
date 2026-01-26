# Test Coverage Expansion Plan

**Status**: 🚀 In Progress
**Created**: January 25, 2026
**Priority**: Medium (Roadmap Item)
**Current Count**: ~892 Tests (657 Backend, 235 Frontend)
**Target**: 80%+ Code Coverage across Backend and Frontend

## Overview

While the project has made significant strides in test coverage (increasing from ~210 to ~892 tests), specific areas remain under-tested. This plan outlines a systematic approach to reaching >80% code coverage by targeting critical gaps in backend services, frontend complex logic, and edge cases.

## Current Status Analysis

### Backend (Node.js/Express)
- **Strengths**: 
  - Route handlers (~93% coverage)
  - Core CRUD operations
  - Authentication flows (including 2FA/Passkeys)
  - Search system (FTS5)
  - Authorization middleware
  - Backup & Migration logic (New)
- **Weaknesses/Gaps**: 
  - Service-layer error handling: Many "happy paths" are tested, but specific database error scenarios (constraints, connection timeouts) need consistent coverage.
  - Edge cases in complex logic (e.g., circular hierarchy detection, large bulk operations).

### Frontend (React/Vite)
- **Strengths**: 
  - Utility functions (`xmlImport`, `csvImport`)
  - Basic component rendering
  - Search overlay logic
  - **Auth Context**
  - **Socket Context**
  - **Form Validation**
  - **OrgMap & Toolbar** (New)
  - **Data Import UI** (New)
- **Weaknesses/Gaps**: 
  - **Custom Hooks**: Complex state management hooks (besides RealtimeUpdates).
  - **Integration**: End-to-end flows for complex multi-step processes.

## Execution Phases

### Phase 1: Critical Backend Service Gaps (✅ Completed)

Target the known "zero coverage" or "low coverage" files to ensure safety for infrastructure tasks.

1.  **Backup Service (`server/src/services/backup.service.ts`)** ✅
    -   Test backup creation (file system interaction).
    -   Test backup restoration (database locking/swapping).
    -   Test retention policy (cleanup of old backups).
    -   *Mocking Strategy*: Mock `fs` and `better-sqlite3` backup API.

2.  **Database & Migration Utilities (`server/src/db.ts`)** ✅
    -   Test migration execution logic.
    -   Test schema validation helpers.
    -   *Note*: Refactored into `db-init.ts` for testability.

3.  **Analytics Service (`server/src/services/analytics.service.ts`)**
    -   Ensure data retention policies are tested.
    -   Test aggregation queries for dashboards.

### Phase 2: Frontend Core Logic (Hooks & Contexts) (✅ Completed)

Move beyond simple component rendering tests to testing the "brain" of the frontend.

1.  **Auth Context (`src/contexts/AuthContext.tsx`)** ✅
    -   Test session persistence/hydration.
    -   Test auto-logout on 401.
    -   Test permission helper functions (`canManage`, `isOwner`).

2.  **Socket Integration (`src/contexts/SocketContext.tsx`)** ✅
    -   Test event subscription/unsubscription.
    -   Test state updates on incoming events.
    -   Test connection/disconnection logic.

3.  **Form Logic & Validation** ✅
    -   **Person Form**: Test validation (email, required fields) and custom field integration.
    -   **Department Form**: Test circular reference prevention logic and hierarchy filtering.

### Phase 3: Complex Interactive Components (✅ Completed)

1.  **Organization Map Logic (`src/components/OrgMap.tsx` & helpers)** ✅
    -   Test layout calculation (Dagre integration) in isolation.
    -   Test search result highlighting logic.
    -   Test toolbar actions (Expand/Collapse/Layout).

2.  **Search & Navigation UI** ✅
    -   **Search Overlay**: Test result display and type filtering.
    -   **Hierarchical Selector**: Test keyboard navigation and node expansion.

3.  **Data Import UI (`src/components/admin/ImportModal.tsx`)** ✅
    -   Test file selection and parsing state transitions.
    -   Test error display for malformed files.
    -   Test duplicate warning presentations.

### Phase 4: Integration & Edge Cases

1.  **Cascade Delete Scenarios**
    -   Verify (via integration test) that deleting a department soft-deletes all descendants and unassigns/soft-deletes people.

2.  **Concurrency**
    -   Simulate concurrent edits to the same organization in backend tests to verify optimistic locking or last-write-wins behavior (ensure no crashes).

3.  **Large Dataset Performance**
    -   Add regression tests for performance-critical endpoints (e.g., `GET /org-map`) to ensure response times remain within limits for known dataset sizes.

## Success Metrics

- **Backend Statement Coverage**: > 80%
- **Frontend Statement Coverage**: > 60% (Higher is better, but UI is harder to cover fully without brittle tests)
- **Critical Paths**: 100% coverage on Auth, Permissions, and Data Import/Export logic.
- **CI Execution Time**: Maintain < 5 minutes total (use parallelization if needed).

## Tools & Configuration

- **Backend**: Vitest, Supertest
- **Frontend**: Vitest, React Testing Library, User Event
- **Reporting**: use `npm run coverage` to generate lcov reports.

## Implementation Notes

- **Do not over-mock**: For backend tests, prefer using the in-memory SQLite database over mocking the DB layer to catch SQL errors.
- **Component Tests**: Focus on user interaction (clicks, typing) rather than internal state assertions.
- **Snapshot Testing**: Use sparingly for complex UI structures (like the OrgMap SVG output) to catch regressions in rendering.
