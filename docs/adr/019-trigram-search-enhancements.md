# ADR-019: Trigram Search Enhancements

**Status**: Accepted
**Date**: 2026-01-27
**Deciders**: Development Team
**Tags**: search, database, performance, ux

## Context and Problem Statement

Following the completion of the FTS5 Search System Rebuild (ADR-017), users require more sophisticated search capabilities. Specifically, the system needs to handle typos (fuzzy matching), provide search suggestions ("Did you mean?"), allow users to save frequent queries, and provide administrators with insights into search gaps (zero-result searches). Standard FTS5 tokenizers (like Porter) handle stemming well but fail on typos (e.g., "sofware" vs "software").

## Decision Drivers

- **User Experience**: Help users find results even with misspellings.
- **Efficiency**: Reduce time spent retyping frequent queries.
- **Insights**: Identify missing data based on what users are failing to find.
- **Maintainability**: Build on existing SQLite infrastructure without adding external search engines (like Elasticsearch).
- **Performance**: Ensure fuzzy matching and analytics don't degrade search latency (<100ms).

## Considered Options

- **Trigram-based Fuzzy Matching**: Store character trigrams in a custom FTS5 table and use OR-based matching for similarity.
- **Levenshtein Distance Extension**: Use a SQLite extension for edit distance calculation.
- **Elasticsearch/Algolia**: Migrate to a dedicated search engine.
- **Application-side Filtering**: Fetch all results and filter in JavaScript.

## Decision Outcome

Chosen option: **Trigram-based Fuzzy Matching and Dedicated Analytics/Saved Search tables**, because this approach leverages SQLite's strengths, maintains zero-infrastructure complexity, and provides sufficient typo tolerance for organizational data.

### Implementation Details

1. **Typo Tolerance**:
    - Two new FTS5 tables: `departments_trigram` and `people_trigram` using the `tokenize='trigram'` option.
    - Search logic generates trigrams from the user input (e.g., "hello" -> "hel", "ell", "llo") and queries these tables when standard FTS returns zero results.
    - Triggers keep these tables in sync with the main data tables.

2. **Search Analytics**:
    - A `search_analytics` table tracks queries, result counts, and performance execution time.
    - Focus on identifying "Zero Result" trends to improve data quality or search synonyms.

3. **Saved Searches**:
    - A `saved_searches` table allows users to persist complex queries.
    - Supports optional organization-wide sharing of searches.

### Positive Consequences

- **Improved Recall**: Users find people/departments even with typos.
- **Data Quality Insights**: Administrators can see exactly what users are looking for and failing to find.
- **Zero Infrastructure overhead**: No new servers or services to manage.
- **Privacy First**: Analytics are self-hosted and PII-aware.

### Negative Consequences

- **Storage Overhead**: Trigram tables grow larger than standard FTS tables (mitigated by periodic cleanup/optimization).
- **Complexity**: Search logic becomes multi-stage (Standard FTS → Trigram Fallback).
- **Performance variance**: Fuzzy matching is computationally heavier than exact FTS matching, but only used as a fallback.

## Pros and Cons of the Options

### Trigram-based Fuzzy Matching (Chosen)

- **Good**, because it works natively in SQLite (via FTS5 trigram tokenizer).
- **Good**, because it scales well for thousands of records.
- **Bad**, because it requires additional storage for trigram indexes.

### Dedicated Search Engine (Elasticsearch)

- **Good**, because it handles all these features out-of-the-box.
- **Bad**, because it adds significant cost and deployment complexity.
- **Bad**, because it is overkill for the current data scale.

## Links

- [ADR-001: SQLite as Primary Database](001-sqlite-as-primary-database.md)
- [ADR-006: SQLite FTS5 Search](006-fts5-full-text-search.md)
- [ADR-017: Search System Rebuild](017-search-system-rebuild.md)
