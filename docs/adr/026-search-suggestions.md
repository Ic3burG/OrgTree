# ADR-026: "Did You Mean?" Search Suggestions

**Status**: Accepted
**Date**: 2026-02-03
**Deciders**: OrgTree Development Team
**Tags**: search, ux, trigram

## Context and Problem Statement

Our current search implementation provides robust FTS5-based full-text search
and Trigram-based fuzzy matching. However, when a user makes a significant typo
that yields zero results, we simply show "No results found" or automatically
attempt a fuzzy search (fallback) without explicitly guiding the user. How can
we improve the search experience by proactively helping users recover from
typos and discover the correct terminology?

## Decision Drivers

- Need to improve user experience when search queries contain typos
- Want to help users learn correct organizational terminology
- Desire to leverage existing Trigram infrastructure without adding complexity
- Must maintain performance on the happy path (successful searches)
- Should respect organization isolation and security boundaries

## Considered Options

- **Option 1**: Server-side "Did you mean?" suggestions using existing Trigram indices
- **Option 2**: Client-side Levenshtein distance calculation with local dictionary
- **Option 3**: External search service (Elasticsearch/Algolia) with built-in spellcheck
- **Option 4**: SQLite's Spellfix1 Virtual Table extension

## Decision Outcome

Chosen option: **"Server-side 'Did you mean?' suggestions using existing
Trigram indices"**, because it leverages our existing infrastructure, maintains
security boundaries, provides good performance, and doesn't introduce external
dependencies or complex build requirements.

### Implementation Details

We implement a **"Did you mean?" suggestion system** that leverages our
existing Trigram indices (`departments_trigram`, `people_trigram`) to generate
correction candidates when a search query returns zero or very few results.

#### Architectural Approach

1. **Trigger Condition**: Suggestions will be generated only when:
   - The primary FTS5 search returns 0 results
   - The Trigram fallback search returns 0 results OR results with low
     similarity scores
   - Alternatively, suggestions can be generated alongside results if the
     query term is not found exactly but similar terms exist (e.g., searching
     for "Enginer" finds "Engineer")

2. **Suggestion Logic**:
   - We perform a `trigram` similarity query against the `departments_trigram`
     (name) and `people_trigram` (name, title) tables
   - Instead of returning full records, we select distinct `name` or `title`
     values that closely match the input query
   - We rank suggestions by their similarity score (using the `trigram`
     tokenizer's matching capability or `bm25`)
   - The top 1-3 distinct terms will be returned as `suggestions` in the API
     response

3. **API Schema Update**:
   The `SearchResponse` interface already has a `suggestions?: string[]` field
   (currently unused). We will populate this field.

   ```typescript
   export interface SearchResponse {
     results: SearchResult[];
     total: number;
     // ...
     suggestions?: string[]; // "Did you mean?" candidates
   }
   ```

4. **Frontend UX**:
   - In `SearchOverlay.tsx`, if `suggestions` are present in the response:
   - Display a clickable "Did you mean: **Suggestion**?" banner below the
     search bar or above the empty results state
   - Clicking a suggestion immediately executes a new search with that term

#### Database and Performance

- **Database**: No schema changes required. We reuse `departments_trigram` and
  `people_trigram`
- **Performance**: Suggestion queries are only run on "zero result" paths (or
  low confidence paths), minimizing impact on happy-path performance
- **Security**: Ensure suggestions respect organization isolation (already
  handled by `search.service.ts` logic)

### Positive Consequences

- **Improved UX**: Users recover from typos faster
- **Discoverability**: Helps users learn the correct terminology (e.g.,
  "Engineering" vs "Engineers")
- **Leverages Assets**: Maximizes value of the recently implemented Trigram
  tables
- **No External Dependencies**: Fully self-contained within SQLite
- **Security Maintained**: Organization isolation is preserved

### Negative Consequences

- **Complexity**: Adds another query layer to the search service
- **False Positives**: "Did you mean?" might occasionally suggest irrelevant
  terms if the similarity threshold is too loose (requires tuning)
- **Additional Queries**: Edge cases with zero results will require extra
  database queries

## Pros and Cons of the Options

### Option 1: Server-side suggestions using Trigram indices

- **Good**, because it leverages existing infrastructure (departments_trigram,
  people_trigram)
- **Good**, because it maintains organization isolation and security
- **Good**, because it has minimal performance impact (only on zero-result
  paths)
- **Good**, because it requires no external dependencies
- **Bad**, because it adds complexity to the search service
- **Bad**, because similarity thresholds may need tuning to avoid false
  positives

### Option 2: Client-side Levenshtein distance calculation

- **Good**, because it requires no server-side changes
- **Good**, because it provides instant feedback
- **Bad**, because it doesn't scale for large organizations (requires
  downloading full dictionary)
- **Bad**, because it creates security concerns (potential data leakage)
- **Bad**, because organization isolation is harder to enforce

### Option 3: External search service (Elasticsearch/Algolia)

- **Good**, because these services have built-in spellcheck capabilities
- **Good**, because they provide rich search features out-of-the-box
- **Good**, because they handle scaling automatically
- **Bad**, because it's overkill for our current scale
- **Bad**, because it introduces external dependencies and costs
- **Bad**, because it requires significant integration effort
- **Bad**, because SQLite Trigram is already sufficient

### Option 4: SQLite's Spellfix1 Virtual Table

- **Good**, because it's designed specifically for spell correction
- **Good**, because it's built into SQLite (in theory)
- **Bad**, because it's not standard in all SQLite builds
- **Bad**, because `better-sqlite3` default distribution may not include it
  without custom compilation
- **Bad**, because Trigram is already available and working

## Links

- [Related]
  [ADR-006: SQLite FTS5 for Full-Text Search](006-fts5-full-text-search.md) -
  Initial FTS5 search implementation
- [Related]
  [ADR-019: Trigram Search Enhancements](019-trigram-search-enhancements.md) -
  Trigram infrastructure this feature builds upon
- [Related]
  [ADR-017: Search System Rebuild](017-search-system-rebuild.md) -
  Overall search architecture
