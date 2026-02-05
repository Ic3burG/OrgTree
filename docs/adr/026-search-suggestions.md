# ADR 026: "Did You Mean?" Search Suggestions

## Status
Accepted

## Date
2026-02-03

## Context
Our current search implementation provides robust FTS5-based full-text search and Trigram-based fuzzy matching. However, when a user makes a significant typo that yields zero results, we simply show "No results found" or automatically attempt a fuzzy search (fallback) without explicitly guiding the user.

Users benefit from explicit feedback when their query is corrected or when better alternatives exist. A "Did you mean?" feature (Search Suggestions) improves discoverability and reduces frustration by proactively suggesting valid terms that are similar to the invalid input.

## Decision
We will implement a **"Did you mean?" suggestion system** that leverages our existing Trigram indices (`departments_trigram`, `people_trigram`) to generate correction candidates when a search query returns zero or very few results.

### Architectural Approach

1.  **Trigger Condition**: Suggestions will be generated only when:
    *   The primary FTS5 search returns 0 results.
    *   The Trigram fallback search returns 0 results OR results with low similarity scores.
    *   Alternatively, suggestions can be generated alongside results if the query term is not found exactly but similar terms exist (e.g., searching for "Enginer" finds "Engineer").

2.  **Suggestion Logic**:
    *   We will perform a `trigram` similarity query against the `departments_trigram` (name) and `people_trigram` (name, title) tables.
    *   Instead of returning full records, we will select distinct `name` or `title` values that closely match the input query.
    *   We will rank suggestions by their similarity score (using the `trigram` tokenizer's matching capability or `bm25`).
    *   The top 1-3 distinct terms will be returned as `suggestions` in the API response.

3.  **API Schema Update**:
    The `SearchResponse` interface already has a `suggestions?: string[]` field (currently unused). We will populate this field.

    ```typescript
    export interface SearchResponse {
      results: SearchResult[];
      total: number;
      // ...
      suggestions?: string[]; // "Did you mean?" candidates
    }
    ```

4.  **Frontend UX**:
    *   In `SearchOverlay.tsx`, if `suggestions` are present in the response:
    *   Display a clickable "Did you mean: **Suggestion**?" banner below the search bar or above the empty results state.
    *   Clicking a suggestion immediately executes a new search with that term.

### Implementation Details

*   **Database**: No schema changes required. We reuse `departments_trigram` and `people_trigram`.
*   **Performance**: Suggestion queries are only run on "zero result" paths (or low confidence paths), minimizing impact on happy-path performance.
*   **Security**: Ensure suggestions respect organization isolation (already handled by `search.service.ts` logic).

## Consequences

### Positive
*   **Improved UX**: Users recover from typos faster.
*   **Discoverability**: Helps users learn the correct terminology (e.g., "Engineering" vs "Engineers").
*   **Leverages Assets**: Maximizes value of the recently implemented Trigram tables.

### Negative
*   **Complexity**: Adds another query layer to the search service.
*   **False Positives**: "Did you mean?" might occasionally suggest irrelevant terms if the similarity threshold is too loose. We will need to tune the threshold.

## Alternatives Considered

1.  **Client-side Levenshtein**:
    *   *Idea*: Download a dictionary of all names and calculate distance locally.
    *   *Rejection*: Does not scale for large organizations; strictly worse security (data leakage).

2.  **External Search Service (Elasticsearch/Algolia)**:
    *   *Idea*: Use a dedicated engine with built-in spellcheck.
    *   *Rejection*: Overkill for our current scale; introduces external dependencies and cost. SQLite Trigram is sufficient.

3.  **Spellfix1 Virtual Table**:
    *   *Idea*: Use SQLite's `spellfix1` extension.
    *   *Rejection*: Not standard in all SQLite builds (specifically `better-sqlite3` default distribution may not include it easily without custom compilation). Trigram is already available and working.
