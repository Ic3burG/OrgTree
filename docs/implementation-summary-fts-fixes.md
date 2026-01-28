# FTS Search Fixes - Implementation Summary

**Date**: January 23, 2026  
**Status**: Phase 1 Complete (Critical Fixes)  
**Branch**: main

## Changes Implemented

### 1. Database Migrations (server/src/db.ts)

**Soft Delete Trigger Fixes**:

- Updated `departments_fts_insert` to only add non-deleted items (`WHEN NEW.deleted_at IS NULL`)
- Updated `departments_fts_update` to remove items when soft-deleted
- Applied same fixes to `people_fts` triggers
- Rebuilds FTS indexes after trigger updates to clean existing data

**Custom Fields FTS Population**:

- Added migration to populate `custom_fields_fts` on startup if empty
- Checks for searchable custom field values and populates FTS table
- Previously, table was created but never populated

### 2. FTS Maintenance Service (server/src/services/fts-maintenance.service.ts)

**New Functions**:

- `checkFtsIntegrity()`: Verifies FTS indexes are in sync with source tables
- `rebuildDepartmentsFts()`: Rebuilds departments FTS from scratch
- `rebuildPeopleFts()`: Rebuilds people FTS from scratch
- `rebuildCustomFieldsFts()`: Rebuilds custom fields FTS from scratch
- `rebuildAllFtsIndexes()`: Rebuilds all FTS indexes and returns health status
- `optimizeFtsIndexes()`: Runs FTS optimize to reclaim space

**Health Check**:
Returns status for all 3 FTS tables:

- Expected count (non-deleted items in source)
- Actual count (items in FTS)
- In-sync status
- List of issues

### 3. API Endpoints (server/src/routes/fts-maintenance.ts)

**Public Endpoint** (authenticated users):

- `GET /api/fts-maintenance/health`: Check FTS integrity

**Superuser Endpoints**:

- `POST /api/fts-maintenance/rebuild/all`: Rebuild all indexes
- `POST /api/fts-maintenance/rebuild/departments`: Rebuild departments
- `POST /api/fts-maintenance/rebuild/people`: Rebuild people
- `POST /api/fts-maintenance/rebuild/custom-fields`: Rebuild custom fields
- `POST /api/fts-maintenance/optimize`: Optimize FTS indexes

### 4. Test Schema Alignment (server/src/services/search.service.test.ts)

**Fixed Mismatches**:

- Added `remove_diacritics 2` to tokenizer (was missing)
- Added `content_rowid='rowid'` to departments_fts and people_fts
- Added `phone` field to people_fts (was missing)
- Added triggers with soft-delete handling (were completely missing)

**Impact**: Tests now run against the same schema as production, preventing "works in test, fails in prod" bugs.

## Problems Solved

### Issue 1: Soft-Deleted Items Remained Searchable ✅

**Before**: When items were soft-deleted (`deleted_at` set), they remained in FTS and appeared in search results.

**After**: UPDATE triggers now remove items from FTS when `deleted_at IS NOT NULL`. Soft-deleted items no longer appear in searches.

### Issue 2: Custom Fields FTS Never Populated ✅

**Before**: `custom_fields_fts` table was created but never populated, so custom field searches didn't work.

**After**: Migration automatically populates the table on startup. New custom field values are synced via existing service methods.

### Issue 3: No Way to Verify FTS Health ✅

**Before**: No visibility into whether FTS indexes were in sync. Issues discovered only when users reported bad search results.

**After**:

- Health check endpoint shows sync status for all tables
- Rebuild utilities fix desync issues
- Can be monitored in production

### Issue 4: Test Schema Didn't Match Production ✅

**Before**: Tests used simplified FTS tables without proper configuration, missing fields, and no triggers.

**After**: Test schema exactly matches production, including tokenizer settings, field lists, and trigger logic.

## Verification

### Manual Testing

1. Start server: `cd server && npm run dev`
2. Check health: `curl http://localhost:3001/api/fts-maintenance/health -H "Authorization: Bearer <token>"`
3. Should show all tables in sync

### Automated Testing

```bash

cd server && npm test -- search.service.test

```

All 30 search tests should pass with the updated schema.

## Migration Safety

**Zero Downtime**: These migrations run automatically on server start and are safe for production:

- Checks if triggers already have soft-delete handling (via SQL inspection)
- Only updates if needed
- Uses transactions for FTS rebuilds
- No data loss risk

**Rollback**: Not needed - migrations are additive and improve data accuracy.

## Next Steps (Phase 2+)

From the original plan (docs/adr/017-search-system-rebuild.md):

**Phase 2**: Error Handling (Week 2)

- Replace silent error catching with explicit error states
- Add FTS query validation
- Implement fallback search when FTS fails

**Phase 3**: Test Infrastructure (Week 2-3)

- Add trigger integration tests
- Add custom fields FTS tests
- Add FTS integrity tests

**Phase 4**: Performance & Monitoring (Week 3-4)

- Add search performance logging
- Implement scheduled FTS maintenance
- Track search metrics

**Phase 5**: Frontend Resilience (Week 4)

- Add retry logic to useSearch hook
- Show degraded mode indicator
- Implement offline search cache

## Files Modified

```texttext

server/src/db.ts                                     (migrations added)
server/src/index.ts                                  (route mounted)
server/src/services/fts-maintenance.service.ts       (new file)
server/src/routes/fts-maintenance.ts                 (new file)
server/src/services/search.service.test.ts           (schema fixed)

```

## Metrics

**Before**:

- Soft-deleted items remained searchable: ∞
- Custom field search working: ❌
- Test schema matches production: ❌
- FTS health visibility: ❌

**After**:

- Soft-deleted items removed from FTS: ✅
- Custom field search working: ✅
- Test schema matches production: ✅
- FTS health visibility: ✅ (via API)
