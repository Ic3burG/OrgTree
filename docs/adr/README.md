# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the OrgTree project. ADRs document the key architectural decisions made during development, including the context, options considered, and rationale behind each choice.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. ADRs help teams:

- **Understand the "why"** behind architectural choices
- **Avoid revisiting settled decisions** without understanding the tradeoffs
- **Onboard new team members** by providing historical context
- **Document evolution** of the system architecture over time
- **Facilitate discussion** about future architectural changes

## ADR Index

| ADR                                                | Title                                  | Status   | Date       | Tags                                           |
| -------------------------------------------------- | -------------------------------------- | -------- | ---------- | ---------------------------------------------- |
| [000](000-adr-template.md)                         | ADR Template                           | Template | -          | -                                              |
| [001](001-sqlite-as-primary-database.md)           | SQLite as Primary Database             | Accepted | 2025-12-15 | database, architecture, infrastructure         |
| [002](002-dual-token-jwt-authentication.md)        | Dual-Token JWT Authentication Strategy | Accepted | 2025-12-20 | security, authentication, architecture         |
| [003](003-socketio-for-real-time-collaboration.md) | Socket.IO for Real-Time Collaboration  | Accepted | 2025-12-22 | real-time, websockets, collaboration           |
| [004](004-react-context-for-state-management.md)   | React Context API for State Management | Accepted | 2025-12-16 | frontend, state-management, react              |
| [005](005-monorepo-structure.md)                   | Monorepo Structure                     | Accepted | 2025-12-15 | architecture, project-structure, monorepo      |
| [006](006-fts5-full-text-search.md)                | SQLite FTS5 for Full-Text Search       | Accepted | 2025-12-28 | search, database, performance                  |
| [007](007-typescript-migration.md)                 | TypeScript Migration                   | Accepted | 2026-01-07 | typescript, developer-experience, code-quality |
| [008](008-user-analytics.md)                       | User Analytics                         | Accepted | 2026-01-21 | analytics, database, tracking                  |
| [009](009-department-hierarchy-highlighting.md)    | Department Hierarchy Highlighting      | Accepted | 2026-01-22 | map, ux, visualization                         |
| [010](010-centered-vertical-layout.md)             | Centered Vertical Layout               | Accepted | 2026-01-22 | map, layout, ux                                |
| [011](011-rainbow-color-theme.md)                  | Rainbow Color Theme                    | Accepted | 2026-01-22 | map, theme, aesthetics                         |
| [012](012-database-migration-rollback.md)          | Database Migration Rollback            | Accepted | 2026-01-25 | database, migration, infrastructure            |
| [013](013-user-discovery-privacy.md)               | User Discovery and Privacy Controls    | Accepted | 2026-01-25 | privacy, security, user-discovery              |
| [014](014-test-coverage-expansion.md)              | Test Coverage Expansion                | Accepted | 2026-01-25 | testing, quality, code-coverage                |
| [015](015-hierarchical-tree-selector.md)           | Hierarchical Tree Selector             | Accepted | 2026-01-25 | ux, map, form-controls                         |
| [016](016-geds-url-import.md)                      | GEDS URL Import                        | Accepted | 2026-01-25 | data-import, geds, automation                  |
| [017](017-search-enhancements.md)                  | Search Enhancements                    | Accepted | 2026-01-26 | search, performance, ux, analytics             |

## Reading Guide

### For New Developers

Start with these ADRs to understand the core architecture:

1. **[ADR-005: Monorepo Structure](005-monorepo-structure.md)** - Project organization
2. **[ADR-001: SQLite as Primary Database](001-sqlite-as-primary-database.md)** - Data storage strategy
3. **[ADR-002: Dual-Token JWT Authentication](002-dual-token-jwt-authentication.md)** - Security model
4. **[ADR-004: React Context for State Management](004-react-context-for-state-management.md)** - Frontend architecture

### For Feature Development

Reference these ADRs when building features:

- **Real-time features**: [ADR-003: Socket.IO](003-socketio-for-real-time-collaboration.md)
- **Search functionality**: [ADR-006: FTS5 Full-Text Search](006-fts5-full-text-search.md)
- **TypeScript patterns**: [ADR-007: TypeScript Migration](007-typescript-migration.md)

### For Architecture Decisions

When making new architectural decisions:

1. Review existing ADRs to understand current patterns
2. Consider whether the decision impacts or supersedes existing ADRs
3. Use [ADR-000: Template](000-adr-template.md) to document the new decision
4. Link related ADRs in the "Links" section

## Key Architectural Themes

### Simplicity Over Complexity

OrgTree prioritizes **simple, proven technologies** over cutting-edge complexity:

- SQLite over PostgreSQL/MySQL (infrastructure simplicity)
- React Context over Redux (fewer dependencies)
- Monorepo without tooling over Nx/Turborepo (minimal overhead)

**Rationale**: Simple systems are easier to understand, debug, and maintain. The team can move faster with fewer abstractions.

### Performance Through Smart Defaults

OrgTree achieves excellent performance **without premature optimization**:

- SQLite FTS5 for fast search (built-in, no external service)
- Socket.IO for real-time updates (automatic reconnection, room-based broadcasting)
- TypeScript for compile-time safety (catch bugs before runtime)

**Rationale**: Choose technologies that provide good performance out-of-the-box. Optimize specific bottlenecks only when measured.

### Security by Design

Security is **built into the architecture**, not bolted on:

- Dual-token JWT strategy (limits XSS/CSRF impact)
- httpOnly cookies for refresh tokens (JavaScript cannot access)
- CSRF protection at protocol level (double-submit pattern)

**Rationale**: Retrofitting security is expensive and error-prone. Design with security from the start.

### Developer Experience Matters

Architecture decisions consider **developer productivity**:

- TypeScript for better IDE support and refactoring confidence
- Monorepo for atomic commits across frontend/backend
- React Context for familiar patterns (no Redux boilerplate)

**Rationale**: Happy, productive developers ship better features faster. Optimize for developer experience where possible.

## ADR Lifecycle

### Status Values

- **Proposed**: Decision is under consideration
- **Accepted**: Decision has been approved and implemented
- **Deprecated**: Decision is no longer recommended but not yet replaced
- **Superseded**: Decision has been replaced by a newer ADR (link to new ADR)

### When to Create an ADR

Create an ADR when making decisions about:

- **Technology choices**: Database, frameworks, libraries
- **Architectural patterns**: State management, API design, authentication
- **Infrastructure**: Deployment, scaling, monitoring
- **Project structure**: Monorepo vs polyrepo, folder organization
- **Development processes**: Testing strategy, CI/CD pipeline

**Don't create ADRs for**:

- Minor implementation details (variable naming, code formatting)
- Temporary workarounds (document in code comments instead)
- Decisions easily reversed (feature flags, UI tweaks)

### How to Create an ADR

1. **Copy the template**: `cp 000-adr-template.md XXX-your-title.md`
2. **Number sequentially**: Next available number (001, 002, 003, ...)
3. **Use kebab-case**: Lowercase with hyphens (e.g., `001-database-choice.md`)
4. **Fill in all sections**: Context, options, decision, consequences
5. **Link related ADRs**: Reference related decisions in "Links" section
6. **Update this README**: Add entry to the ADR Index table
7. **Commit and PR**: Get team review before merging

## Tools and Resources

### ADR Tools

- **adr-tools**: CLI for managing ADRs (https://github.com/npryce/adr-tools)
- **log4brains**: ADR visualization and browser (https://github.com/thomvaill/log4brains)

### Further Reading

- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) - Michael Nygard (original ADR proposal)
- [ADR GitHub Organization](https://adr.github.io/) - Collection of ADR resources
- [When Should I Write an ADR?](https://engineering.atspotify.com/2020/04/when-should-i-write-an-architecture-decision-record/) - Spotify Engineering

## Contributing

When proposing a new ADR:

1. Start a discussion in GitHub Issues or team chat
2. Draft the ADR using the template
3. Share with the team for feedback
4. Iterate based on input
5. Submit a pull request
6. Merge once consensus is reached

ADRs are **living documents**. If circumstances change:

- Update the ADR with new information (add "Update" section)
- Mark as "Deprecated" if no longer recommended
- Create a new ADR that supersedes the old one (mark as "Superseded" with link)

---

**Last Updated**: January 7, 2026
**Maintainers**: OrgTree Development Team
