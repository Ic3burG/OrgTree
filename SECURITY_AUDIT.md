# OrgTree Security Audit Report

**Date**: December 30, 2025
**Auditor**: Claude Code Security Audit
**Scope**: Authentication, Authorization, Input Validation, OWASP Top 10

---

## Executive Summary

This security audit reviewed the OrgTree application's authentication and authorization systems, API routes, and input validation. The audit identified **3 critical**, **8 high**, **9 medium**, and **5 low** severity issues.

### Current Security Posture: **SIGNIFICANTLY IMPROVED** ✅

**Recent Fixes (December 30-31, 2025):**
- ✅ All 3 CRITICAL vulnerabilities resolved
- ✅ All 8 HIGH severity issues resolved
- ✅ 5 of 9 MEDIUM severity issues resolved
- ✅ 2 of 5 LOW severity issues resolved
- ⏳ 4 MEDIUM severity issues remain
- ⏳ 3 LOW severity issues remain

**Strengths:**
- Parameterized SQL queries (no SQL injection)
- bcrypt password hashing with proper salt rounds (10 rounds)
- JWT authentication with expiration and explicit algorithm specification
- Role-based access control (RBAC) with standardized permission checks
- Database transactions for bulk operations
- CORS properly configured
- Strong invitation tokens (256-bit entropy)
- Security headers (helmet.js) protecting against common attacks
- Rate limiting on all critical endpoints
- Strong password policy (12+ character minimum)
- Secure ID generation using crypto.randomUUID()
- Input validation with array size limits
- Field whitelisting for bulk operations
- Comprehensive security audit logging (failed logins, invalid tokens, permission denials, rate limits)

**Remaining Areas for Future Enhancement:**
- CSRF protection
- Refresh token implementation
- Password complexity requirements

---

## Vulnerability Summary

| Severity | Count | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 3 | 3 ✅ | 0 |
| HIGH | 8 | 8 ✅ | 0 |
| MEDIUM | 9 | 5 ✅ | 4 |
| LOW | 5 | 2 ✅ | 3 |

**Status**: All CRITICAL and HIGH severity issues resolved. 5 of 9 MEDIUM + 2 of 5 LOW severity issues fixed (December 31, 2025).

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

### 4. Weak Password Policy ✅ FIXED
**File:** `server/src/routes/auth.js:29-31`
**Fixed:** December 30, 2025 (Previous session)

Increased minimum password length from 6 to 12 characters.

---

### 5. Import Route Authorization Inconsistency ✅ FIXED
**File:** `server/src/routes/import.js:30`
**Fixed:** December 31, 2025

Now uses `requireOrgPermission(orgId, req.user.id, 'admin')` instead of manual ownership check. Consistent with other routes and respects multi-user collaboration permissions.

---

### 6. Missing Rate Limiting on Admin Endpoints ✅ FIXED
**File:** `server/src/routes/users.js:26-32, 39, 91, 117`
**Fixed:** December 31, 2025

Added `adminOperationsLimiter` (50 req/15min) to:
- `POST /api/users` (create user)
- `PUT /api/users/:id/role` (change role)
- `DELETE /api/users/:id` (delete user)

---

### 7. Excessive Data in getAllUsers Response ✅ FIXED
**File:** `server/src/services/users.service.js:7-42`
**Fixed:** December 31, 2025

Modified to return only counts (organizationCount, membershipCount) instead of full organization arrays. Detailed data available via `getUserById()` when specifically requested.

**Frontend Update:** `UserManagement.jsx` now fetches full user details via `api.getUser()` when opening organization details modal.

---

### 8. Missing Array Size Validation in Bulk Routes ✅ FIXED
**File:** `server/src/routes/bulk.js:16-30`
**Fixed:** December 30, 2025 (Previous session)

Route-level validation enforces MAX_BULK_SIZE = 100 for all bulk operations.

---

### 9. Inconsistent Permission Check Patterns ✅ FIXED
**File:** `server/src/routes/members.js:29`
**Fixed:** December 31, 2025

Standardized GET /members endpoint to use `requireOrgPermission()` instead of manual `checkOrgAccess()`. All routes now follow consistent authorization pattern.

**Verified:** All service functions (audit, bulk, search, invitation, org, department, people) use `requireOrgPermission()` consistently.

---

### 10. Missing HTTPS/Security Headers ✅ FIXED
**File:** `server/src/index.js`
**Fixed:** December 30, 2025 (Previous session)

Added helmet.js middleware providing:
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Content-Security-Policy`
- `X-XSS-Protection`

---

### 11. JWT Algorithm Not Explicitly Specified ✅ FIXED
**File:** `server/src/middleware/auth.js:13-15`
**Fixed:** December 30, 2025 (Previous session)

Now explicitly specifies HS256 algorithm to prevent algorithm confusion attacks:
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256']
});
```

---

## MEDIUM SEVERITY VULNERABILITIES

### 12. Email Enumeration via Error Messages
Different error messages reveal user existence in invitation flow.

**Status**: Not yet fixed (Low priority - minimal practical exploit value)

---

### 13. Missing CSRF Protection
No CSRF tokens (mitigated by CORS but still a gap).

**Status**: Not yet fixed (Medium priority - CORS provides partial protection)

---

### 14. Debug Logging in Production ✅ FIXED
**File:** `server/src/routes/departments.js`, `server/src/services/department.service.js`
**Fixed:** December 30, 2025 (Previous session)

Removed 15 debug console.log statements from production code.

---

### 15. Weak Temporary Password Generation ✅ FIXED
**File:** `server/src/services/users.service.js:13-30, 187, 243`
**Fixed:** December 31, 2025

**Previous Implementation:**
```javascript
const tempPassword = randomBytes(9).toString('base64')
  .replace(/[^a-zA-Z0-9]/g, '')
  .slice(0, 12);
```

**New Implementation:**
- Created `generateSecurePassword()` helper function
- Uses full entropy from crypto.randomBytes (no filtering)
- Generates 16-character passwords (increased from 12)
- Base62 encoding (alphanumeric charset) for maximum entropy
- Each byte mapped directly to charset without loss

**Security Improvement:** ~96 bits of entropy vs ~60 bits previously

---

### 16. No Refresh Token Implementation
7-day JWT with no revocation capability.

**Status**: Not yet fixed (High priority for future - requires architectural changes)

---

### 17. Missing Password Change Verification ✅ FIXED
**File:** `server/src/routes/auth.js:68-127`
**Fixed:** December 31, 2025

**Changes Applied:**
- Require old password verification before password changes
- Exception: Users with `must_change_password=true` (temporary password flow)
- Prevent password reuse (new password must differ from old)
- Updated API client and frontend validation

**Security Improvement:** Prevents unauthorized password changes if session is compromised

---

### 18. Invitation Metadata Disclosure
Public endpoint returns organization name, inviter name, role.

**Status**: Not yet fixed (Low priority - token holder is intended recipient)

---

### 19. CSV Import Without Size Limits ✅ FIXED
**File:** `server/src/routes/import.js:21-26`
**Fixed:** December 30, 2025 (Previous session)

Added MAX_IMPORT_SIZE = 10,000 items limit to prevent DoS attacks.

---

### 20. Insufficient Audit Logging ✅ FIXED
**Files:** `server/src/services/auth.service.js`, `server/src/middleware/auth.js`, `server/src/services/member.service.js`, `server/src/routes/auth.js`, `server/src/routes/users.js`, `server/src/routes/public.js`
**Fixed:** December 31, 2025

**Changes Applied:**
1. **Failed Login Logging** - Logs failed attempts with reason (user_not_found, invalid_password), email, IP address
2. **Invalid Token Logging** - Logs missing/expired/invalid token attempts with IP address, path, error details
3. **Permission Denied Logging** - Logs insufficient role and organization permission denials with user details, required/actual roles
4. **Rate Limit Violations** - Logs rate limit exceeded events across all rate limiters (auth, admin, public endpoints)

**Implementation Details:**
- Uses existing `createAuditLog()` service from audit.service.js
- System-wide security events use `null` for orgId
- Organization-specific events (permission denials) link to orgId
- Captures IP addresses, timestamps, and relevant context
- All events use actionType 'failed_login', 'invalid_token', 'permission_denied', 'rate_limit_exceeded'
- EntityType 'security' groups all security events together

**Security Improvement:** Comprehensive security event visibility for detecting attacks and monitoring suspicious activity

---

## LOW SEVERITY VULNERABILITIES

### 21. XSS Risk in Search Highlights
HTML tags in FTS snippets could be XSS vector if frontend uses innerHTML.

**Status**: Not yet fixed (Low priority - frontend currently uses safe rendering)

---

### 22. Health Endpoint Exposes Environment ✅ FIXED
**File:** `server/src/index.js:121-140`
**Fixed:** December 31, 2025

Removed `environment: process.env.NODE_ENV` from health endpoint response. Health checks now only return status, timestamp, and database connectivity without exposing environment details.

**Security Improvement:** Prevents information disclosure that could aid attackers in understanding the deployment environment.

---

### 23. Cascade Deletes Without Soft Delete
No audit trail for cascaded deletions.

**Status**: Not yet fixed (Low priority - audit logs capture parent deletions)

---

### 24. Incomplete Circular Reference Protection
Edge cases in department parent validation.

**Status**: Not yet fixed (Low priority - current validation handles common cases)

---

### 25. Superuser Check Inconsistency ✅ FIXED
**File:** `server/src/routes/audit.js:59-79`
**Fixed:** December 31, 2025

Replaced manual role check (`if (req.user.role !== 'superuser')`) with standard `requireSuperuser` middleware in `/admin/audit-logs` route. Now consistent with other admin endpoints.

**Security Improvement:** Standardized authorization pattern reduces risk of inconsistent permission enforcement and provides centralized security logging.

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
