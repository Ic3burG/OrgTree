# Documentation Registry

This directory contains architectural decision records (ADRs) and requests for comments (RFCs) for the OrgTree project.

## [Architecture Decision Records (ADRs)](./adr/)

ADRs document significant architectural decisions that have been finalized and implemented.

| ID  | Title                                                                                 | Status         | Date       |
| --- | ------------------------------------------------------------------------------------- | -------------- | ---------- |
| 009 | [Department Hierarchy Highlighting](./adr/009-department-hierarchy-highlighting.md)   | ✅ Implemented | 2026-01-25 |
| 010 | [Centered Vertical Layout](./adr/010-centered-vertical-layout.md)                     | ✅ Implemented | 2026-01-25 |
| 011 | [Rainbow Color Theme](./adr/011-rainbow-color-theme.md)                               | ✅ Implemented | 2026-01-25 |
| 012 | [Database Migration Rollback](./adr/012-database-migration-rollback.md)               | ✅ Implemented | 2026-01-26 |
| 013 | [User Discovery & Privacy](./adr/013-user-discovery-privacy.md)                       | ✅ Implemented | 2026-01-25 |
| 014 | [Test Coverage Expansion](./adr/014-test-coverage-expansion.md)                       | ✅ Implemented | 2026-01-25 |
| 015 | [Hierarchical Tree Selector](./adr/015-hierarchical-tree-selector.md)                 | ✅ Implemented | 2026-01-25 |
| 016 | [GEDS URL Import](./adr/016-geds-url-import.md)                                       | ✅ Implemented | 2026-01-25 |
| 017 | [Search System Rebuild](./adr/017-search-system-rebuild.md)                           | ✅ Implemented | 2026-01-24 |
| 018 | [Organization Ownership Transfer](./adr/018-organization-ownership-transfer.md)       | ✅ Implemented | 2026-01-27 |
| 019 | [Trigram Search Enhancements](./adr/019-trigram-search-enhancements.md)               | ✅ Implemented | 2026-01-27 |
| 020 | [Backend Test Coverage (80% Achieved)](./adr/020-backend-test-coverage-80-percent.md) | ✅ Implemented | 2026-01-28 |
| 021 | [Frontend Quality & E2E Testing Strategy](./adr/021-frontend-quality-e2e-strategy.md) | ✅ Implemented | 2026-01-29 |
| 022 | [Advanced Sidebar UI](./adr/022-advanced-sidebar-ui.md)                               | ✅ Implemented | 2026-01-31 |
| 023 | [Organization Analytics Dashboard](./adr/023-organization-analytics-dashboard.md)     | ✅ Implemented | 2026-02-02 |

## [Requests for Comments (RFCs)](./rfc/)

RFCs are proposals for new features or significant changes that are currently under discussion or in progress.

| Title                                                                         | Status                   | Priority |
| ----------------------------------------------------------------------------- | ------------------------ | -------- |
| [Coverage Maintenance](./adr/024-coverage-maintenance-ratcheting.md)          | ✅ Accepted              | High     |
| [Invitation Enhancements](./rfc/invitation-enhancements.md)                   | 💡 Proposed              | High     |
| [Organization Analytics Dashboard](./rfc/organization-analytics-dashboard.md) | ⛔ Superseded by ADR-023 | Medium   |

## [Security Documentation](./security/)

Contains audit reports, security RFCs, and guidelines.

- [Security Overview & Audits](./security/README.md)
- [Audit Phase 1 (Jan 2026)](./security/audit-phase-1-report.md)
- [Audit Phase 2 (Jan 2026)](./security/audit-phase-2-report.md)
- [Audit Phase 2 RFC (Jan 2026)](./security/audit-phase-2-rfc.md)

---

### Legend

- ✅ **Implemented**: Decision enacted and code merged.
- 📋 **Planned**: RFC approved, awaiting implementation.
- 💡 **Proposed**: Open for discussion.
- 📝 **Draft**: Initial draft, not yet ready for full review.
- ⛔ **Superseded**: Replaced by a newer decision.
