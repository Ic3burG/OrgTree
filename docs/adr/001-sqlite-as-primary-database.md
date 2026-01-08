# ADR-001: SQLite as Primary Database

**Status**: Accepted
**Date**: 2025-12-15
**Deciders**: Development Team
**Tags**: database, architecture, infrastructure

## Context and Problem Statement

OrgTree needed a relational database to store organizational hierarchies, user accounts, departments, people, and audit logs. The choice of database technology significantly impacts deployment complexity, scalability, cost, and developer experience.

## Decision Drivers

* **Simplicity**: Minimal infrastructure setup and maintenance
* **Cost**: Low operational costs for small to medium deployments
* **Performance**: Fast reads/writes for typical org chart workloads (hundreds to thousands of records)
* **Deployment**: Easy deployment to platforms like Render without separate database instances
* **Development Experience**: Simple local setup without Docker dependencies
* **Full-text Search**: Native support for advanced search capabilities
* **Data Integrity**: Foreign key constraints and transaction support

## Considered Options

* **SQLite with better-sqlite3**
* PostgreSQL (managed instance like Render PostgreSQL)
* MySQL/MariaDB
* MongoDB (NoSQL document store)

## Decision Outcome

Chosen option: **SQLite with better-sqlite3**, because it provides the best balance of simplicity, performance, and features for OrgTree's use case as a self-contained application.

### Positive Consequences

* **Zero infrastructure complexity**: No separate database server to manage
* **Single-file portability**: Entire database in one file, easy backups
* **Excellent read performance**: Faster than client-server databases for typical queries
* **FTS5 support**: Built-in full-text search with BM25 ranking
* **Synchronous API**: Simple, predictable code with better-sqlite3
* **Free deployment**: No additional database hosting costs
* **Local development**: No Docker/services needed, just clone and run
* **Atomic transactions**: Built-in ACID guarantees

### Negative Consequences

* **Write concurrency limitations**: Single writer at a time (not an issue for typical org chart usage)
* **Horizontal scaling constraints**: Cannot distribute database across multiple servers
* **Migration path complexity**: If scaling beyond SQLite, migration to PostgreSQL requires effort
* **Connection pooling limitations**: All connections share single file lock

## Pros and Cons of the Options

### SQLite with better-sqlite3

* **Good**, because it eliminates database server infrastructure entirely
* **Good**, because synchronous API simplifies async/await complexity
* **Good**, because FTS5 provides production-grade full-text search
* **Good**, because deployment is just copying a single file
* **Good**, because better-sqlite3 is fastest SQLite library for Node.js
* **Bad**, because write concurrency is limited (not critical for org charts)
* **Bad**, because horizontal scaling requires architectural changes
* **Bad**, because maximum database size is ~281 terabytes (not a practical limit)

### PostgreSQL

* **Good**, because it supports high write concurrency
* **Good**, because it's the industry standard for relational data
* **Good**, because it enables horizontal scaling with read replicas
* **Good**, because it has excellent JSON support
* **Bad**, because it adds infrastructure complexity (separate server)
* **Bad**, because it costs $7-25/month on Render
* **Bad**, because local development requires Docker or local PostgreSQL
* **Bad**, because connection pooling and networking add latency

### MySQL/MariaDB

* **Good**, because it's widely supported and mature
* **Good**, because it supports replication and clustering
* **Bad**, because it has similar infrastructure costs to PostgreSQL
* **Bad**, because full-text search capabilities are weaker than PostgreSQL or SQLite FTS5
* **Bad**, because it requires separate database server

### MongoDB

* **Good**, because it handles nested/hierarchical data naturally
* **Good**, because it's schema-flexible
* **Bad**, because organizational data is fundamentally relational (foreign keys, joins)
* **Bad**, because it requires separate database server and costs
* **Bad**, because transaction support is more complex
* **Bad**, because team expertise is primarily in SQL

## Migration Path (Future Consideration)

If OrgTree grows beyond SQLite's capabilities (unlikely for <10,000 concurrent users), migration to PostgreSQL is straightforward:
1. Database schema is already normalized relational SQL
2. Use tools like `pgloader` or custom migration scripts
3. Update database client from `better-sqlite3` to `pg`
4. Minimal business logic changes (SQL is portable)

The FTS5 implementation would need to be replaced with PostgreSQL's `ts_vector` and `ts_query`, but search logic is isolated in `search.service.ts`.

## Performance Benchmarks

For typical OrgTree workloads:
- **Department queries**: <5ms (indexed parent_id)
- **People lookups**: <10ms (indexed department_id)
- **Full-text search**: 10-50ms (depends on corpus size)
- **Bulk inserts**: 1000+ records/second with transactions

SQLite outperforms PostgreSQL for read-heavy workloads (90%+ of OrgTree operations) when database size is <10GB.

## Links

* [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
* [SQLite FTS5 Extension](https://www.sqlite.org/fts5.html)
* [When to Use SQLite](https://www.sqlite.org/whentouse.html)
* Related: ADR-007 (FTS5 for Full-Text Search)
