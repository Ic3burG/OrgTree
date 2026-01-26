# ADR-017: Search Enhancements

**Status**: Accepted
**Date**: 2026-01-26
**Deciders**: Development Team
**Tags**: search, performance, ux, analytics

## Context and Problem Statement

Following the completion of the FTS5 Search System Rebuild (ADR-006), users require more sophisticated search capabilities. Specifically, the system needs to handle typos (fuzzy matching), provide search suggestions ("Did you mean?"), allow users to save frequent queries, and provide administrators with insights into search gaps (zero-result searches).

## Decision Drivers

- **User Experience**: Help users find results even with misspellings.
- **Efficiency**: Reduce time spent retyping frequent queries.
- **Insights**: Identify missing data based on what users are failing to find.
- **Maintainability**: Build on existing SQLite infrastructure without adding external search engines (like Elasticsearch).
- **Performance**: Ensure fuzzy matching and analytics don't degrade search latency (<100ms).

## Considered Options

- **Trigram-based Fuzzy Matching**: Store character trigrams in a custom table and use Jaccard similarity.
- **Levenshtein Distance Extension**: Use a SQLite extension for edit distance calculation.
- **Elasticsearch/Algolia**: Migrate to a dedicated search engine.
- **Application-side Filtering**: Fetch all results and filter in JavaScript.

## Decision Outcome

Chosen option: **Trigram-based Fuzzy Matching and Dedicated Analytics/Saved Search tables**, because this approach leverages SQLite's strengths, maintains zero-infrastructure complexity, and provides sufficient typo tolerance for organizational data.

### Implementation Details

1.  **Typo Tolerance**: A `search_trigrams` table will store trigrams for searchable fields. Search will fall back to trigram similarity matching when FTS5 returns zero results.
2.  **Search Analytics**: A `search_analytics` table will track queries, result counts, and performance, with a focus on identifying "Zero Result" trends.
3.  **Saved Searches**: A `saved_searches` table will allow users to persist complex queries with optional organization-wide sharing.
4.  **Suggestions**: A hybrid engine will combine trigram similarity, popular searches, and edit distance to generate "Did you mean?" prompts.

### Positive Consequences

- **Improved Recall**: Users find people/departments even with typos.
- **Data Quality Insights**: Administrators can see exactly what users are looking for and failing to find.
- **Zero Infrastructure overhead**: No new servers or services to manage.
- **Privacy First**: Analytics are self-hosted and PII-aware.

### Negative Consequences

- **Storage Overhead**: Trigram tables can grow large (mitigated by periodic cleanup).
- **Complexity**: Search logic becomes multi-stage (FTS → Trigram Fallback).
- **Performance variance**: Fuzzy matching is computationally heavier than exact FTS matching.

## Pros and Cons of the Options

### Trigram-based Fuzzy Matching (Chosen)

- **Good**, because it works natively in SQLite.
- **Good**, because it scales well for thousands of records.
- **Bad**, because it requires custom indexing triggers and logic.

### Dedicated Search Engine (Elasticsearch)

- **Good**, because it handles all these features out-of-the-box.
- **Bad**, because it adds significant cost and deployment complexity.
- **Bad**, because it is overkill for the current data scale.

## Links

- [ADR-001: SQLite as Primary Database](001-sqlite-as-primary-database.md)
- [ADR-006: SQLite FTS5 Search](006-fts5-full-text-search.md)
- [RFC: Search Rebuild Plan](../rfc/search-rebuild.md)
