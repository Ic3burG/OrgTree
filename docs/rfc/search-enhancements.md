# Search Enhancements Implementation Plan

> **Priority**: MEDIUM
> **Status**: 🏁 SUPERSEDED by [ADR-013](../adr/013-search-enhancements.md)
> **Date Created**: January 26, 2026
> **Last Updated**: January 26, 2026

---

## ⚠️ Note: This RFC is superseded by [ADR-013](../adr/013-search-enhancements.md). 
The architectural decisions have been accepted. This document remains as a detailed implementation reference for the defined phases.

---

## Overview

This plan details the implementation of four advanced search enhancements that build upon the recently completed Search System Rebuild (see [search-rebuild.md](search-rebuild.md)). These features will significantly improve search usability, especially for users who make typos, want to save frequent queries, or need help discovering content.

---

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1: Typo Tolerance** | 📋 Not Started | Trigram-based fuzzy matching |
| **Phase 2: Search Analytics** | 📋 Not Started | Track zero-result searches |
| **Phase 3: Saved Searches** | 📋 Not Started | Allow users to save queries |
| **Phase 4: Search Suggestions** | 📋 Not Started | "Did you mean?" suggestions |

---

## Current Architecture Summary

The existing search system provides:

- **FTS5 Full-Text Search**: Three virtual tables (`departments_fts`, `people_fts`, `custom_fields_fts`)
- **Fallback Search**: LIKE query fallback when FTS fails
- **Frontend Caching**: IndexedDB cache with 5-minute TTL
- **Retry Logic**: Exponential backoff (3 attempts)
- **Autocomplete**: Real-time suggestions as users type

### Key Files

| File | Purpose |
|------|---------|
| `server/src/services/search.service.ts` | Main search logic (~1000 lines) |
| `server/src/routes/search.ts` | API endpoints |
| `src/hooks/useSearch.ts` | Frontend search hook |
| `src/components/SearchOverlay.tsx` | Search UI component |
| `src/services/searchCache.ts` | IndexedDB cache management |

---

## Phase 1: Typo Tolerance (Trigram-Based Fuzzy Matching)

### User Story

**As a** user searching for people or departments  
**I want** the search to find results even when I make typos  
**So that** I can still find what I'm looking for without exact spelling

### Technical Approach

SQLite does not have built-in fuzzy matching, but we can implement trigram-based similarity matching:

1. **Trigram Index Table**: Create a new table storing character trigrams for searchable text
2. **Similarity Calculation**: Use Jaccard similarity to compare query trigrams with indexed trigrams
3. **Threshold Matching**: Return results above a configurable similarity threshold (e.g., 0.3)

### Database Schema

```sql
-- Trigram index for fuzzy matching
CREATE TABLE IF NOT EXISTS search_trigrams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('department', 'person')),
  entity_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  trigram TEXT NOT NULL,
  field TEXT NOT NULL, -- 'name', 'title', 'email', etc.
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for efficient trigram lookup
CREATE INDEX IF NOT EXISTS idx_trigrams_lookup 
  ON search_trigrams(org_id, trigram, entity_type);
CREATE INDEX IF NOT EXISTS idx_trigrams_entity 
  ON search_trigrams(entity_type, entity_id);
```

### Implementation Steps

#### 1.1 Create Trigram Utility Functions

**File**: `server/src/utils/trigrams.ts`

```typescript
/**
 * Generate trigrams from a string
 * "hello" → ["hel", "ell", "llo"]
 */
export function generateTrigrams(text: string): string[] {
  const normalized = text.toLowerCase().trim();
  if (normalized.length < 3) return [normalized];
  
  const trigrams: string[] = [];
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.push(normalized.substring(i, i + 3));
  }
  return [...new Set(trigrams)]; // Deduplicate
}

/**
 * Calculate Jaccard similarity between two trigram sets
 */
export function calculateSimilarity(set1: string[], set2: string[]): number {
  const intersection = set1.filter(t => set2.includes(t));
  const union = [...new Set([...set1, ...set2])];
  return union.length > 0 ? intersection.length / union.length : 0;
}
```

#### 1.2 Create Trigram Indexing Service

**File**: `server/src/services/trigram.service.ts`

- `indexEntity(entityType, entityId, orgId, fields)` - Index an entity's searchable fields
- `removeEntity(entityType, entityId)` - Remove trigrams for a deleted entity
- `rebuildIndex(orgId)` - Rebuild all trigrams for an organization
- `fuzzySearch(orgId, query, threshold, limit)` - Search with fuzzy matching

#### 1.3 Add Triggers for Trigram Sync

Similar to FTS triggers, add INSERT/UPDATE/DELETE triggers to keep trigrams in sync:

```sql
CREATE TRIGGER trigrams_people_insert AFTER INSERT ON people
WHEN NEW.deleted_at IS NULL
BEGIN
  -- Insert trigrams for name, title, email
END;

CREATE TRIGGER trigrams_people_delete AFTER DELETE ON people
BEGIN
  DELETE FROM search_trigrams 
  WHERE entity_type = 'person' AND entity_id = OLD.id;
END;
```

#### 1.4 Integrate with Search Service

**Modify**: `server/src/services/search.service.ts`

Add fuzzy fallback when FTS returns no results:

```typescript
async search(orgId, userId, options): Promise<SearchResponse> {
  // ... existing FTS search logic ...
  
  // If no results and query is 3+ characters, try fuzzy match
  if (results.length === 0 && query.length >= 3) {
    const fuzzyResults = await fuzzySearch(orgId, query, 0.3, limit);
    if (fuzzyResults.length > 0) {
      return {
        ...response,
        results: fuzzyResults,
        fuzzyMatch: true, // New flag
        suggestions: [`Showing results for similar terms`],
      };
    }
  }
}
```

### Performance Considerations

- Trigram tables can grow large; add periodic cleanup for deleted entities
- Consider caching trigram sets in memory for frequently-searched orgs
- Use SQLite's covering indexes to speed up trigram lookups
- Set reasonable limits on fuzzy search (e.g., max 50 results scanned)

---

## Phase 2: Search Analytics

### User Story

**As an** administrator  
**I want** to see which searches return no results  
**So that** I can identify content gaps and improve data quality

### Technical Approach

Track search events in a dedicated analytics table, focusing on:
- Zero-result searches (most important for gap identification)
- Search frequency patterns
- Query response times

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS search_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT NOT NULL,
  user_id TEXT,
  query TEXT NOT NULL,
  query_normalized TEXT NOT NULL, -- Lowercase, trimmed
  search_type TEXT NOT NULL CHECK (search_type IN ('all', 'departments', 'people')),
  result_count INTEGER NOT NULL,
  response_time_ms INTEGER,
  used_fallback INTEGER DEFAULT 0,
  used_fuzzy INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_org_date 
  ON search_analytics(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_zero_results 
  ON search_analytics(org_id, result_count) WHERE result_count = 0;
```

### Implementation Steps

#### 2.1 Create Analytics Service

**File**: `server/src/services/search-analytics.service.ts`

```typescript
interface SearchEvent {
  orgId: string;
  userId?: string;
  query: string;
  searchType: 'all' | 'departments' | 'people';
  resultCount: number;
  responseTimeMs: number;
  usedFallback: boolean;
  usedFuzzy: boolean;
}

export function trackSearchEvent(event: SearchEvent): void;
export function getZeroResultSearches(orgId: string, days: number): ZeroResultSearch[];
export function getSearchFrequency(orgId: string, days: number): FrequencyData[];
export function cleanupOldAnalytics(daysToKeep: number): number; // Returns deleted count
```

#### 2.2 Integrate Analytics Tracking

**Modify**: `server/src/services/search.service.ts`

Add tracking at the end of the `search()` function:

```typescript
// Track search for analytics (async, non-blocking)
trackSearchEvent({
  orgId,
  userId,
  query: options.query,
  searchType: options.type || 'all',
  resultCount: results.length,
  responseTimeMs: queryTimeMs,
  usedFallback,
  usedFuzzy: false,
}).catch(err => console.error('[Search] Analytics tracking failed:', err));
```

#### 2.3 Create Analytics API Endpoints

**File**: `server/src/routes/search-analytics.ts`

```typescript
// GET /api/organizations/:id/search-analytics/zero-results
// Query params: days (default: 30)
// Response: { searches: [{ query, count, lastSeen }], total: number }

// GET /api/organizations/:id/search-analytics/summary
// Query params: days (default: 30)
// Response: { totalSearches, zeroResults, avgResponseTimeMs, topQueries: [] }
```

#### 2.4 Create Admin Dashboard Component

**File**: `src/components/admin/SearchAnalyticsDashboard.tsx`

Display:
- Total searches (last 30 days)
- Zero-result search rate (%)
- Top failed searches (clickable to pre-fill search)
- Average response time
- Search volume trend chart (optional)

### Privacy Considerations

- Store normalized queries (lowercase, trimmed) to reduce PII exposure
- Allow admins to clear analytics data
- Consider GDPR compliance - don't store queries containing emails/phone numbers
- Add option to disable analytics per-organization

---

## Phase 3: Saved Searches

### User Story

**As a** user who frequently searches for the same criteria  
**I want** to save my search queries  
**So that** I can quickly access them later without retyping

### Technical Approach

Store saved searches per-user with optional sharing at the organization level.

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('all', 'departments', 'people')),
  starred_only INTEGER DEFAULT 0,
  is_shared INTEGER DEFAULT 0, -- Visible to all org members
  use_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user 
  ON saved_searches(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_shared 
  ON saved_searches(org_id, is_shared) WHERE is_shared = 1;
```

### Implementation Steps

#### 3.1 Create Saved Search Service

**File**: `server/src/services/saved-search.service.ts`

```typescript
interface SavedSearch {
  id: string;
  name: string;
  query: string;
  searchType: 'all' | 'departments' | 'people';
  starredOnly: boolean;
  isShared: boolean;
  useCount: number;
  createdAt: string;
}

export function createSavedSearch(userId, orgId, data): SavedSearch;
export function getSavedSearches(userId, orgId): SavedSearch[];
export function updateSavedSearch(id, userId, data): SavedSearch;
export function deleteSavedSearch(id, userId): void;
export function incrementUseCount(id): void;
```

#### 3.2 Create API Endpoints

**File**: `server/src/routes/saved-searches.ts`

```typescript
// POST /api/organizations/:id/saved-searches
// Body: { name, query, searchType, starredOnly, isShared }

// GET /api/organizations/:id/saved-searches
// Returns: { savedSearches: SavedSearch[] }

// PUT /api/organizations/:id/saved-searches/:searchId
// Body: { name?, query?, searchType?, starredOnly?, isShared? }

// DELETE /api/organizations/:id/saved-searches/:searchId
```

#### 3.3 Update Search UI

**Modify**: `src/components/SearchOverlay.tsx`

Add:
- "Save this search" button (appears after search results)
- Saved searches dropdown in search input
- Recent/frequently used saved searches section
- Edit/delete saved search functionality

#### 3.4 Update useSearch Hook

**Modify**: `src/hooks/useSearch.ts`

Add:
- `savedSearches: SavedSearch[]` state
- `saveSearch(name: string)` function
- `loadSavedSearch(id: string)` function
- `deleteSavedSearch(id: string)` function

### UI Design

```
┌─────────────────────────────────────────────┐
│ 🔍 Search people and departments...     [≡] │
├─────────────────────────────────────────────┤
│ ★ SAVED SEARCHES                            │
│   📌 All Marketing Managers        [Run] [×]│
│   📌 Engineering Leadership        [Run] [×]│
│ ────────────────────────────────────────── │
│ 🕒 RECENT                                   │
│   "john smith"                              │
│   "finance department"                      │
└─────────────────────────────────────────────┘
```

---

## Phase 4: Search Suggestions ("Did You Mean?")

### User Story

**As a** user who typed a misspelled query  
**I want** to see "Did you mean?" suggestions  
**So that** I can quickly correct my search without rethinking what to type

### Technical Approach

Combine multiple suggestion sources:

1. **Trigram similarity**: Suggest similar terms from Phase 1
2. **Popular searches**: Suggest frequently-searched queries from Phase 2
3. **Edit distance**: Suggest corrections based on Levenshtein distance

### Implementation Steps

#### 4.1 Create Suggestion Engine

**File**: `server/src/services/search-suggestions.service.ts`

```typescript
interface Suggestion {
  text: string;
  confidence: number; // 0.0 - 1.0
  source: 'similar_terms' | 'popular_searches' | 'recorded_entity';
}

/**
 * Generate "Did you mean?" suggestions for a query
 */
export function generateSuggestions(
  orgId: string,
  query: string,
  resultCount: number
): Suggestion[];
```

#### 4.2 Implementation Details

```typescript
function generateSuggestions(orgId, query, resultCount): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Only suggest if low/no results
  if (resultCount > 3) return [];
  
  // 1. Find similar entity names using trigrams
  const similarNames = findSimilarNames(orgId, query, 0.4); // 40% threshold
  suggestions.push(...similarNames.map(name => ({
    text: name,
    confidence: calculateSimilarity(query, name),
    source: 'similar_terms',
  })));
  
  // 2. Find popular searches with similar text
  const popularSearches = findPopularSearches(orgId, query, 30); // Last 30 days
  suggestions.push(...popularSearches.map(s => ({
    text: s.query,
    confidence: 0.5 * (s.resultCount > 0 ? 1 : 0.3),
    source: 'popular_searches',
  })));
  
  // 3. Deduplicate and sort by confidence
  return deduplicateByText(suggestions)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3); // Max 3 suggestions
}
```

#### 4.3 Integrate with Search API

**Modify**: `server/src/services/search.service.ts`

Add suggestions to search response when results are low:

```typescript
// At end of search() function
if (results.length <= 3 && query.length >= 3) {
  const suggestions = generateSuggestions(orgId, query, results.length);
  if (suggestions.length > 0) {
    response.didYouMean = suggestions.map(s => s.text);
  }
}
```

#### 4.4 Update Frontend

**Modify**: `src/components/SearchOverlay.tsx`

Display suggestions when available:

```tsx
{didYouMean && didYouMean.length > 0 && (
  <div className="did-you-mean p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
    <span className="text-sm text-yellow-800 dark:text-yellow-200">
      Did you mean:{' '}
      {didYouMean.map((suggestion, i) => (
        <React.Fragment key={suggestion}>
          <button
            onClick={() => updateQuery(suggestion)}
            className="text-blue-600 hover:underline"
          >
            {suggestion}
          </button>
          {i < didYouMean.length - 1 && ', '}
        </React.Fragment>
      ))}
    </span>
  </div>
)}
```

---

## Dependencies & Prerequisites

### Existing Infrastructure (No Changes Needed)

- SQLite FTS5 (already configured)
- IndexedDB caching (already implemented)
- Search API endpoints (already working)

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| None required | - | Pure TypeScript/SQL implementation |

### Database Migrations

All phases require database migrations. Order of execution:

1. `037_create_search_trigrams_table.sql`
2. `038_create_search_analytics_table.sql`
3. `039_create_saved_searches_table.sql`

---

## Testing Strategy

### Unit Tests

#### Phase 1: Typo Tolerance

**File**: `server/src/utils/trigrams.test.ts`

```typescript
describe('generateTrigrams', () => {
  it('should generate correct trigrams for "hello"', () => {
    expect(generateTrigrams('hello')).toEqual(['hel', 'ell', 'llo']);
  });
  
  it('should handle strings shorter than 3 characters', () => {
    expect(generateTrigrams('hi')).toEqual(['hi']);
  });
});

describe('calculateSimilarity', () => {
  it('should return 1.0 for identical sets', () => {
    expect(calculateSimilarity(['abc'], ['abc'])).toBe(1.0);
  });
  
  it('should return 0 for disjoint sets', () => {
    expect(calculateSimilarity(['abc'], ['xyz'])).toBe(0);
  });
});
```

**File**: `server/src/services/trigram.service.test.ts`

- Test trigram indexing for people and departments
- Test fuzzy search returns results for misspelled queries
- Test threshold filtering

#### Phase 2: Search Analytics

**File**: `server/src/services/search-analytics.service.test.ts`

- Test event tracking
- Test zero-result query aggregation
- Test analytics cleanup

#### Phase 3: Saved Searches

**File**: `server/src/services/saved-search.service.test.ts`

- Test CRUD operations
- Test shared vs. private visibility
- Test use count increment

#### Phase 4: Search Suggestions

**File**: `server/src/services/search-suggestions.service.test.ts`

- Test suggestion generation
- Test confidence scoring
- Test deduplication

### Integration Tests

**File**: `server/src/routes/search.test.ts` (extend existing)

Add tests for:
- Fuzzy match response flag
- Analytics tracking (via mocks)
- Saved search CRUD endpoints
- Did-you-mean suggestions in response

### E2E Tests

**File**: `e2e/search-enhancements.spec.ts` (new)

```typescript
test.describe('Search Enhancements', () => {
  test('should find results with typos', async ({ page }) => {
    await page.goto('/organizations/test-org');
    await page.fill('[data-testid="search-input"]', 'Jhon Smth'); // Typo
    await page.waitForSelector('[data-testid="search-results"]');
    await expect(page.locator('[data-testid="search-result"]')).toHaveCount.atLeast(1);
  });
  
  test('should show did-you-mean suggestions', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'enginering'); // Typo
    await expect(page.locator('.did-you-mean')).toContainText('engineering');
  });
  
  test('should save and load searches', async ({ page }) => {
    // Search for something
    await page.fill('[data-testid="search-input"]', 'Marketing');
    // Save it
    await page.click('[data-testid="save-search-btn"]');
    await page.fill('[data-testid="save-search-name"]', 'My Marketing Search');
    await page.click('[data-testid="confirm-save-search"]');
    // Clear and reload
    await page.fill('[data-testid="search-input"]', '');
    await page.click('[data-testid="saved-searches-dropdown"]');
    await expect(page.locator('text=My Marketing Search')).toBeVisible();
  });
});
```

### Test Commands

```bash
# Run all unit tests
npm run test

# Run only search-related tests
npm run test -- --grep "trigram|search-analytics|saved-search|suggestions"

# Run E2E tests
npm run test:e2e -- e2e/search-enhancements.spec.ts

# Run with coverage
npm run test:coverage
```

---

## Verification Plan

### Automated Tests

| Test Type | Command | Expected Result |
|-----------|---------|-----------------|
| Unit Tests (Backend) | `cd server && npm run test` | All tests pass (currently 373+ tests) |
| Unit Tests (Frontend) | `npm run test` | All tests pass (currently 124+ tests) |
| E2E Tests | `npm run test:e2e` | All tests pass |

### Manual Verification

#### Phase 1: Typo Tolerance

1. Start the app: `npm run dev`
2. Navigate to any organization with people/departments
3. Open the search overlay (Cmd+K or click search icon)
4. Type a misspelled name (e.g., "Jonh Smth" instead of "John Smith")
5. ✅ Verify results appear with fuzzy matches
6. ✅ Verify "Showing similar results" indicator appears

#### Phase 2: Search Analytics

1. Perform several searches (some with results, some without)
2. Navigate to Admin → Search Analytics
3. ✅ Verify zero-result searches are displayed
4. ✅ Verify search count data is accurate

#### Phase 3: Saved Searches

1. Perform a search with results
2. Click "Save this search"
3. Enter a name and save
4. Clear the search input
5. Click the saved searches dropdown
6. ✅ Verify saved search appears
7. Click to load it
8. ✅ Verify search executes and shows results

#### Phase 4: Search Suggestions

1. Search for a misspelled term that has no results
2. ✅ Verify "Did you mean?" suggestions appear
3. Click a suggestion
4. ✅ Verify it updates the search and shows results

---

## Rollout Plan

### Phase-by-Phase Deployment

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1: Typo Tolerance | 1-2 weeks | Fuzzy matching live |
| Phase 2: Search Analytics | 1 week | Analytics dashboard live |
| Phase 3: Saved Searches | 1 week | Saved searches feature live |
| Phase 4: Search Suggestions | 3-5 days | "Did you mean?" live |

**Total Estimated Duration**: 4-5 weeks

### Feature Flags (Optional)

Consider implementing feature flags for gradual rollout:

```typescript
const searchFeatures = {
  fuzzyMatching: process.env.ENABLE_FUZZY_SEARCH === 'true',
  searchAnalytics: process.env.ENABLE_SEARCH_ANALYTICS === 'true',
  savedSearches: process.env.ENABLE_SAVED_SEARCHES === 'true',
  didYouMean: process.env.ENABLE_DID_YOU_MEAN === 'true',
};
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Zero-result search rate | Unknown | < 10% |
| Typo recovery rate | 0% | > 60% |
| Saved search adoption | N/A | > 20% of active users |
| "Did you mean?" click rate | N/A | > 30% |
| Search satisfaction (user feedback) | Unknown | Positive trend |

---

## File Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `server/src/utils/trigrams.ts` | Trigram generation utilities |
| `server/src/services/trigram.service.ts` | Trigram indexing and fuzzy search |
| `server/src/services/search-analytics.service.ts` | Analytics tracking |
| `server/src/services/saved-search.service.ts` | Saved search CRUD |
| `server/src/services/search-suggestions.service.ts` | "Did you mean?" logic |
| `server/src/routes/search-analytics.ts` | Analytics API endpoints |
| `server/src/routes/saved-searches.ts` | Saved searches API |
| `src/components/admin/SearchAnalyticsDashboard.tsx` | Admin analytics UI |
| Test files for all new services | Unit tests |

### Files to Modify

| File | Changes |
|------|---------|
| `server/src/services/search.service.ts` | Integrate fuzzy fallback, analytics, suggestions |
| `server/src/db-init.ts` | Add new table migrations |
| `src/hooks/useSearch.ts` | Add saved searches support |
| `src/components/SearchOverlay.tsx` | Add saved searches UI, "Did you mean?" |
| `server/src/index.ts` | Register new routes |

---

## Related Documents

- [Search System Rebuild Plan](search-rebuild.md) - Foundation work (completed January 24, 2026)
- [ROADMAP.md](../ROADMAP.md) - Overall project roadmap

---

**Document Owner**: Development Team  
**Last Updated**: January 26, 2026
