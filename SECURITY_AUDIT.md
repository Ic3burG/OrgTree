# OrgTree Security Audit Report

**Date**: December 30, 2025
**Auditor**: Claude Code Security Audit
**Scope**: Authentication, Authorization, Input Validation, OWASP Top 10

---

## Executive Summary

This security audit reviewed the OrgTree application's authentication and authorization systems, API routes, and input validation. The audit identified **3 critical**, **8 high**, **9 medium**, and **5 low** severity issues.

### Current Security Posture: **NEEDS IMPROVEMENT**

**Strengths:**
- Parameterized SQL queries (no SQL injection)
- bcrypt password hashing with proper salt rounds
- JWT authentication with expiration
- Role-based access control (RBAC) implemented
- Database transactions for bulk operations
- CORS properly configured
- Strong invitation tokens (256-bit entropy)

**Areas Requiring Attention:**
- Password policy too weak (6 char minimum)
- Missing rate limiting on critical endpoints
- Inconsistent permission check patterns
- Missing security headers
- Input validation gaps

---

## Vulnerability Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 3 | Action Required |
| HIGH | 8 | Action Required |
| MEDIUM | 9 | Should Fix |
| LOW | 5 | Best Practice |

---

## CRITICAL VULNERABILITIES

### 1. Weak ID Generation in Import Route
**File:** `server/src/routes/import.js:52-55`
**CVSS:** 7.5

```javascript
// VULNERABLE: Uses Math.random() - predictable IDs
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
};
```

**Risk:** Attackers can predict/enumerate IDs, leading to IDOR vulnerabilities.

**Fix:** Replace with `crypto.randomUUID()`:
```javascript
import { randomUUID } from 'crypto';
const id = randomUUID();
```

---

### 2. No Rate Limiting on Public Share Endpoints
**File:** `server/src/routes/public.js:11-82`
**CVSS:** 7.5

**Risk:** Attackers can brute-force share tokens or enumerate organizations.

**Fix:** Add rate limiting:
```javascript
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests' }
});
router.use(publicLimiter);
```

---

### 3. Mass Assignment in Bulk Edit Operations
**File:** `server/src/routes/bulk.js:59-77`
**CVSS:** 6.5

```javascript
// VULNERABLE: No field whitelist validation
const { personIds, updates } = req.body;
const result = bulkEditPeople(orgId, personIds, updates, req.user);
```

**Risk:** Attackers can update unintended fields.

**Fix:** Validate allowed fields:
```javascript
const allowedFields = ['title', 'departmentId'];
const sanitizedUpdates = Object.fromEntries(
  Object.entries(updates).filter(([key]) => allowedFields.includes(key))
);
```

---

## HIGH SEVERITY VULNERABILITIES

### 4. Weak Password Policy
**File:** `server/src/routes/auth.js:29-31`

- Minimum 6 characters only
- No complexity requirements
- No password history

**Fix:** Enforce 12+ characters with complexity.

---

### 5. Import Route Authorization Inconsistency
**File:** `server/src/routes/import.js:20-26`

Uses ownership check instead of `requireOrgPermission('admin')`, inconsistent with other routes.

---

### 6. Missing Rate Limiting on Admin Endpoints
**File:** `server/src/routes/users.js`

Only password reset has rate limiting. Missing on:
- `POST /api/users` (create user)
- `PUT /api/users/:id/role` (change role)
- `DELETE /api/users/:id` (delete user)

---

### 7. Excessive Data in getAllUsers Response
**File:** `server/src/services/users.service.js:42-49`

Returns full organization membership data to superusers - potential information disclosure.

---

### 8. Missing Array Size Validation in Bulk Routes
**File:** `server/src/routes/bulk.js`

Arrays checked for emptiness but no maximum size at route level (service has 100 limit but route doesn't validate).

---

### 9. Inconsistent Permission Check Patterns
Multiple files use different patterns:
- Some use `requireOrgPermission()` (correct)
- Some use manual `checkOrgAccess()` checks
- Some check ownership only

---

### 10. Missing HTTPS/Security Headers
**File:** `server/src/index.js`

Missing:
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Content-Security-Policy`
- `X-XSS-Protection`

**Fix:** Use helmet.js middleware.

---

### 11. JWT Algorithm Not Explicitly Specified
**File:** `server/src/middleware/auth.js:12`

```javascript
// Should specify algorithm to prevent algorithm confusion attacks
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256']
});
```

---

## MEDIUM SEVERITY VULNERABILITIES

### 12. Email Enumeration via Error Messages
Different error messages reveal user existence in invitation flow.

### 13. Missing CSRF Protection
No CSRF tokens (mitigated by CORS but still a gap).

### 14. Debug Logging in Production
`server/src/routes/departments.js` contains console.log statements.

### 15. Weak Temporary Password Generation
`randomBytes(9)` with base64 filtering reduces entropy.

### 16. No Refresh Token Implementation
7-day JWT with no revocation capability.

### 17. Missing Password Change Verification
No old password required when changing password.

### 18. Invitation Metadata Disclosure
Public endpoint returns organization name, inviter name, role.

### 19. CSV Import Without Size Limits
No validation of import array size.

### 20. Insufficient Audit Logging
Many security events not logged (failed logins, permission denials).

---

## LOW SEVERITY VULNERABILITIES

### 21. XSS Risk in Search Highlights
HTML tags in FTS snippets could be XSS vector if frontend uses innerHTML.

### 22. Health Endpoint Exposes Environment
Returns `NODE_ENV` value.

### 23. Cascade Deletes Without Soft Delete
No audit trail for cascaded deletions.

### 24. Incomplete Circular Reference Protection
Edge cases in department parent validation.

### 25. Superuser Check Inconsistency
Manual role checks instead of middleware in some routes.

---

## Remediation Roadmap

### IMMEDIATE (This Week)
1. [ ] Fix weak ID generation in import route
2. [ ] Add rate limiting to public endpoints
3. [ ] Add field whitelist to bulk edit operations
4. [ ] Add security headers (helmet.js)
5. [ ] Specify JWT algorithm explicitly

### SHORT-TERM (Next 2 Weeks)
6. [ ] Increase password minimum to 12 characters
7. [ ] Add complexity requirements to passwords
8. [ ] Add rate limiting to admin endpoints
9. [ ] Standardize permission check patterns
10. [ ] Add array size validation to bulk routes
11. [ ] Remove debug console.log statements

### MEDIUM-TERM (Next Month)
12. [ ] Implement refresh tokens
13. [ ] Add CSRF protection
14. [ ] Improve audit logging coverage
15. [ ] Add password change verification
16. [ ] Limit invitation metadata exposure
17. [ ] Add CSV import size limits

---

## Positive Security Findings

The following security measures are properly implemented:

1. **SQL Injection Prevention**: All queries use parameterized statements (better-sqlite3)
2. **Password Hashing**: bcrypt with 10 salt rounds
3. **JWT Implementation**: Proper token generation with expiration
4. **Role-Based Access Control**: Owner > Admin > Editor > Viewer hierarchy
5. **Database Transactions**: Bulk operations are atomic
6. **CORS Configuration**: Proper origin whitelist
7. **Input Validation**: Basic type checking on most endpoints
8. **Invitation Security**: 256-bit random tokens
9. **Foreign Key Constraints**: Database enforces referential integrity
10. **Error Handling**: Generic error messages prevent information leakage (mostly)

---

## Compliance Notes

### OWASP Top 10 Coverage

| Category | Status | Notes |
|----------|--------|-------|
| A01:2021 Broken Access Control | Partial | RBAC implemented, some inconsistencies |
| A02:2021 Cryptographic Failures | Good | bcrypt, JWT properly configured |
| A03:2021 Injection | Good | Parameterized queries throughout |
| A04:2021 Insecure Design | Partial | Some design gaps identified |
| A05:2021 Security Misconfiguration | Needs Work | Missing headers, rate limits |
| A06:2021 Vulnerable Components | Good | Dependencies appear current |
| A07:2021 Auth Failures | Partial | Weak password policy |
| A08:2021 Data Integrity Failures | Good | Proper validation |
| A09:2021 Logging Failures | Needs Work | Incomplete security logging |
| A10:2021 SSRF | Good | No SSRF vectors identified |

---

**Report Generated**: December 30, 2025
**Next Audit Recommended**: After remediation of CRITICAL/HIGH issues
