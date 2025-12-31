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

| Severity | Count | Fixed | Remaining | Status |
|----------|-------|-------|-----------|--------|
| CRITICAL | 3 | 3 ✅ | 0 | All Fixed (Dec 30, 2025) |
| HIGH | 8 | 7 ✅ | 1 | Nearly Complete |
| MEDIUM | 9 | 5 ✅ | 4 | Good Progress |
| LOW | 5 | 0 | 5 | Backlog |

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

### 4. Weak Password Policy ✅ **FIXED** (Dec 30, 2025)
**File:** `server/src/routes/auth.js:29-31`

- ~~Minimum 6 characters only~~ → **Now 12+ characters required**
- No complexity requirements (still open - item #7 in roadmap)
- No password history

**Status:** Partially fixed. Minimum length increased to 12 characters.

---

### 5. Import Route Authorization Inconsistency ✅ **FIXED** (Dec 31, 2025)
**File:** `server/src/routes/import.js:20-30`

~~Uses ownership check instead of `requireOrgPermission('admin')`, inconsistent with other routes.~~

**Fix Applied:** Import route now uses `requireOrgPermission(orgId, req.user.id, 'admin')` for consistent authorization pattern across all routes.

---

### 6. Missing Rate Limiting on Admin Endpoints ✅ **FIXED** (Dec 31, 2025)
**File:** `server/src/routes/users.js`

~~Only password reset has rate limiting. Missing on:~~
- ~~`POST /api/users` (create user)~~
- ~~`PUT /api/users/:id/role` (change role)~~
- ~~`DELETE /api/users/:id` (delete user)~~

**Fix Applied:** Added `adminActionLimiter` (50 requests/15 minutes) to all three admin endpoints.

---

### 7. Excessive Data in getAllUsers Response ✅ **FIXED** (Dec 31, 2025)
**File:** `server/src/services/users.service.js:7-41`

~~Returns full organization membership data to superusers - potential information disclosure.~~

**Fix Applied:**
- `getAllUsers()` now returns only organization/membership counts (not full data)
- New endpoint `GET /users/:id/organizations` fetches full details on-demand
- Frontend fetches org details only when user explicitly clicks "View Organizations" button

---

### 8. Missing Array Size Validation in Bulk Routes ✅ **FIXED** (Dec 30, 2025)
**File:** `server/src/routes/bulk.js`

~~Arrays checked for emptiness but no maximum size at route level (service has 100 limit but route doesn't validate).~~

**Fix Applied:** Route-level validation added for max 100 items.

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

### 14. Debug Logging in Production ✅ **FIXED** (Dec 30, 2025)
~~`server/src/routes/departments.js` contains console.log statements.~~

**Fix Applied:** Removed 15 debug console.log statements from production code.

### 15. Weak Temporary Password Generation ✅ **FIXED** (Dec 31, 2025)
~~`randomBytes(9)` with base64 filtering reduces entropy.~~

**Fix Applied:**
- Created `generateSecurePassword()` function with proper entropy
- Uses randomBytes without filtering that reduces randomness
- Generates 16-character passwords (was 12) with full alphanumeric charset
- Applied to both `resetUserPassword()` and `createAdminUser()`

### 16. No Refresh Token Implementation
7-day JWT with no revocation capability.

### 17. Missing Password Change Verification ✅ **FIXED** (Dec 31, 2025)
~~No old password required when changing password.~~

**Fix Applied:**
- Password change now requires old password verification via bcrypt.compare()
- Skips verification only when `must_change_password=true` (temporary password flow)
- Returns 401 error if current password is incorrect
- Prevents unauthorized password changes if session is compromised

### 18. Invitation Metadata Disclosure ✅ **FIXED** (Dec 31, 2025)
~~Public endpoint returns organization name, inviter name, role.~~

**Fix Applied:**
- Removed inviter name and email from public `getInvitationByToken()` endpoint
- Public endpoint now returns only: organizationName, role, status, expiresAt
- Updated frontend AcceptInvitation component to handle missing fields
- Reduces information leakage from publicly-accessible invitation tokens

### 19. CSV Import Without Size Limits ✅ **FIXED** (Dec 30, 2025)
~~No validation of import array size.~~

**Fix Applied:** Added 10,000 item limit for CSV imports.

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
1. [x] Fix weak ID generation in import route ✅ **FIXED** (Dec 30, 2025)
2. [x] Add rate limiting to public endpoints ✅ **FIXED** (Dec 30, 2025)
3. [x] Add field whitelist to bulk edit operations ✅ **FIXED** (Dec 30, 2025)
4. [x] Add security headers (helmet.js) ✅ **FIXED** (Dec 30, 2025)
5. [x] Specify JWT algorithm explicitly ✅ **FIXED** (Dec 30, 2025)

### SHORT-TERM (Next 2 Weeks)
6. [x] Increase password minimum to 12 characters ✅ **FIXED** (Dec 30, 2025)
7. [ ] Add complexity requirements to passwords
8. [x] Add rate limiting to admin endpoints ✅ **FIXED** (Dec 31, 2025)
9. [x] Standardize permission check patterns ✅ **FIXED** (Dec 31, 2025)
10. [x] Add array size validation to bulk routes ✅ **FIXED** (Dec 30, 2025)
11. [x] Remove debug console.log statements ✅ **FIXED** (Dec 30, 2025)

### MEDIUM-TERM (Next Month)
12. [ ] Implement refresh tokens (#16)
13. [ ] Add CSRF protection (#13)
14. [ ] Improve audit logging coverage (#20)
15. [x] Add password change verification ✅ **FIXED** (Dec 31, 2025) (#17)
16. [x] Limit invitation metadata exposure ✅ **FIXED** (Dec 31, 2025) (#18)
17. [x] Add CSV import size limits ✅ **FIXED** (Dec 30, 2025) (#19)

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
