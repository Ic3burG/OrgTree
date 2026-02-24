# Implementation Plan: API Versioning (v1)

This plan outlines the steps to implement API versioning in the OrgTree backend and migrate the frontend to use the versioned endpoints.

## Phase 1: Backend Refactoring

### 1.1 Create v1 Router ✅

- [x] Create `server/src/routes/v1/index.ts` to aggregate all existing routes.
- [x] Move (or alias) current routes into this v1 router.

### 1.2 Update Main Server Entrypoint ✅

- [x] In `server/src/index.ts`, import the v1 router.
- [x] Mount it at `/api/v1`.
- [x] Keep current `/api` mounts but mark them as "Legacy Aliases" in code comments.

### 1.3 Update OpenAPI Spec ✅

- [x] Update `server/src/openapi.yaml` to include `/v1` in paths or update the server URL.

### 1.4 Add Versioning Headers ✅

- [x] Add a middleware to include `X-API-Version: v1` in all responses.

## Phase 2: Frontend Migration

### 2.1 Update API Client ✅

- [x] Update `src/api/config.ts` (or equivalent) to use `/api/v1` as the base URL.

### 2.2 Verify End-to-End ✅

- [x] Run all frontend tests (`npm test`).
- [x] Run E2E tests (`npm run test:e2e`).
- [x] Manually verify critical flows (Login, Org Creation, Search).

## Phase 3: Documentation & SDK

### 3.1 Update SDK ✅

- [x] Regenerate the API SDK if it depends on the OpenAPI spec.

### 3.2 Update Developer Docs ✅

- [x] Update `DEVELOPMENT.md` and `DOCUMENTATION.md` to reflect the new versioning scheme.

## Phase 4: Deprecation and Cleanup

### 4.1 Log Legacy Usage ✅

- [x] Add a log message when endpoints are accessed via the legacy `/api` path (no `/v1`).

### 4.2 Set Sunset Date ✅

- [x] Define a date for removing the legacy aliases (e.g., 3 months from implementation).

## Verification Plan

### Automated Tests

- [x] `GET /api/v1/health` returns 200.
- [x] `GET /api/health` returns 200 (legacy alias).
- [x] Authentication works via `/api/v1/auth/login`.

### Manual Verification

- [x] Swagger UI at `/api/docs` shows the new versioned paths.
- [x] Frontend works correctly without any code changes other than the base URL.
