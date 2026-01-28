# RFC: Security Audit Phase 2 (COMPLETED)

## Context

The initial OrgTree security audit (documented in [SECURITY_AUDIT.md](../SECURITY_AUDIT.md)) was completed on January 4, 2026, with all 25 identified issues resolved. Since then, the application has undergone significant structural and functional changes that introduce new attack surfaces. Specifically:

1. **TypeScript Migration**: The entire codebase was migrated to TypeScript. While improving type safety, this process can introduce logic errors, improper type assertions (`as any`), and runtime drift.
2. **Search System Rebuild (FTS5 & Trigrams)**: A new high-performance search system was implemented using SQLite FTS5 virtual tables and custom trigram triggers. This involves raw SQL construction and complex query parsing.
3. **User Discovery & Privacy**: New endpoints for user discovery were added to support collaboration, introducing risks related to data enumeration and privacy leaks.
4. **Ownership Transfer**: Critical privilege escalation logic was added to handle organization ownership transfers.
5. **Custom Fields**: A dynamic system for custom attributes was implemented across the stack.

## Goal

The goal of Phase 2 is to perform a targeted security review of all code added or significantly modified between January 4, 2026, and the present date.

## Proposed Scope

### 1. Search Logic & SQL Injection

- **FTS5 Query Parsing**: Audit `validateFtsQuery` and `buildFtsQuery` in `server/src/services/search.service.ts` for potential syntax injection or DoS vectors.
- **Trigram Search**: Review `searchDepartmentsTrigram` and `searchPeopleTrigram` for safe SQL construction when building `MATCH` queries.
- **Custom Field Search**: Ensure the `UNION ALL` logic for custom field search correctly enforces organization boundaries and doesn't leak data across tenants.

### 2. User Discovery & Privacy

- **Endpoint Authorization**: Verify that `GET /api/users/search` is properly scoped and cannot be used by unauthorized users to enumerate the entire user base.
- **Privacy Enforcement**: Ensure `is_discoverable=0` is strictly respected across all search paths.
- **Data Disclosure**: Review the fields returned by discovery endpoints to ensure no sensitive metadata (roles, IDs, last login) is leaked unnecessarily.

### 3. Ownership Transfer

- **State Machine Integrity**: Audit the ownership transfer flow to ensure it cannot be bypassed or intercepted.
- **Race Conditions**: Verify that multiple concurrent transfer requests or cancellations don't lead to inconsistent states.
- **Audit Logging**: Confirm all transfer events are properly logged in the high-integrity audit trail.

### 4. TypeScript Migration & Code Quality

- **Type Assertion Audit**: Search for and review all instances of `as any` or `@ts-ignore` that might be bypassing security-critical checks.
- **Logic Verification**: Compare migrated TypeScript logic with original JavaScript implementations for critical paths (Auth, Permissions, Data Import).

### 5. Custom Fields

- **Input Validation**: Ensure custom field values are sanitized before being stored and indexed.
- **XSS Vectors**: Verify that custom field values are properly escaped when rendered in the Org Map or Admin UI.

## Proposed Methodology

- **Manual Code Review**: Deep-dive into the identified service files and routes.
- **Automated Security Scanning**: Run `npm audit`, `snyk`, and specialized SAST tools.
- **Endpoint Fuzzing**: Use automated tools to test search endpoints with malicious FTS5 syntax and long strings.
- **Permission Matrix Verification**: Systematically test every role (Superuser, Owner, Admin, Editor, Viewer) against the new features.

## Timeline

- **Planning**: 1 day (RFC review)
- **Execution**: 3-5 days
- **Remediation**: 2-3 days
- **Verification**: 1 day

## Success Criteria

1. **Zero Critical/High Vulnerabilities**: All newly identified issues of high severity are resolved.
2. **Comprehensive Documentation**: The [SECURITY_AUDIT.md](../SECURITY_AUDIT.md) is updated with Phase 2 results.
3. **Updated Threat Model**: New features are incorporated into the project's overall security architecture documentation.

---

**Proposed By**: Antigravity (AI Coding Assistant)
**Date**: January 28, 2026
