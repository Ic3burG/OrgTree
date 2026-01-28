# OrgTree Security Documentation

This directory contains reports and guides related to the security posture of the OrgTree application. We follow a security-first development approach, conducting regular audits after major feature releases.

## Audit Reports

Security audits are conducted in phases. Each report details the vulnerabilities found, mitigation strategies, and verified fixes.

- **[Audit Phase 1 (Jan 2026)](file:///Users/ojdavis/Claude Code/OrgTree/docs/security/audit-phase-1-report.md)**
  - Scope: Core Authentication, RBAC, JWT, CSRF, and general OWASP Top 10.
  - Result: 25/25 issues resolved.
- **[Audit Phase 2 (Jan 2026)](file:///Users/ojdavis/Claude Code/OrgTree/docs/security/audit-phase-2-report.md)**
  - Scope: Advanced Search (FTS5/Trigrams), User Discovery, and Organization Ownership Transfer.
  - Result: All new features verified secure against injection and DoS.

## Related Documentation

- **[Security Audit Phase 2 RFC](file:///Users/ojdavis/Claude Code/OrgTree/docs/rfc/security-audit-phase-2.md)** - The planning document for the Phase 2 audit.
- **[Search System Rebuild (ADR-017)](file:///Users/ojdavis/Claude Code/OrgTree/docs/adr/017-search-system-rebuild.md)** - Includes security considerations for the new search infrastructure.

## Security Practices

We maintain strict security hygiene, including:

- **Parameterized Queries**: Mandatory use of `better-sqlite3` parameterized statements.
- **Strict Type Safety**: Avoiding `any` and ensuring valid data boundaries.
- **Automated Security Tests**: Regression tests for known attack vectors (Injection, DoS, Permission bypass).
