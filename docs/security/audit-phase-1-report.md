# OrgTree Security Audit Report

**Date**: December 30, 2025
**Auditor**: Claude Code Security Audit
**Scope**: Authentication, Authorization, Input Validation, OWASP Top 10

---

## Executive Summary

This security audit reviewed the OrgTree application's authentication and authorization systems, API routes, and input validation. The audit identified **3 critical**, **8 high**, **9 medium**, and **5 low** severity issues.

### Current Security Posture: **EXCELLENT** ✅

**All Issues Resolved (December 30, 2025 - January 4, 2026):**

- ✅ All 3 CRITICAL vulnerabilities resolved
- ✅ All 8 HIGH severity issues resolved
- ✅ All 9 MEDIUM severity issues resolved
- ✅ All 5 LOW severity issues resolved
- 🎉 **25/25 security issues complete (100%)**

**Strengths:**

- Parameterized SQL queries (no SQL injection)
- bcrypt password hashing with proper salt rounds (10 rounds)
- JWT authentication with expiration and explicit algorithm specification
- **Refresh token system** with short-lived access tokens (15min), secure token rotation, and session management
- **CSRF protection** with Double Submit Cookie pattern and HMAC-signed tokens
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
- Comprehensive security audit logging (failed logins, invalid tokens, permission denials, rate limits, CSRF violations)

**Future Enhancement Opportunities:**

- Password complexity requirements (uppercase, numbers, symbols)
- Two-factor authentication (2FA)
- Account lockout after failed attempts

---

## Vulnerability Summary

| Severity | Count | Fixed | Remaining |
| -------- | ----- | ----- | --------- |
| CRITICAL | 3     | 3 ✅  | 0         |
| HIGH     | 8     | 8 ✅  | 0         |
| MEDIUM   | 9     | 9 ✅  | 0         |
| LOW      | 5     | 5 ✅  | 0         |

**Status**: 🎉 **ALL 25 SECURITY ISSUES RESOLVED** (January 4, 2026)

---

## CRITICAL VULNERABILITIES

### 1. Weak ID Generation in Import Route

**File:** `server/src/routes/import.js:52-55`
**CVSS:** 7.5

```javascript
// VULNERABLE: Uses Math.random() - predictable IDs
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
  message: { message: 'Too many requests' },
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
  algorithms: ['HS256'],
});
```

---

## MEDIUM SEVERITY VULNERABILITIES

### 12. Email Enumeration via Error Messages ✅ FIXED

**File:** `server/src/services/invitation.service.js`
**Fixed:** December 31, 2025

**Original Issue:**
Different error messages in the invitation flow revealed whether a user existed and their relationship to the organization:

- "This user is already the owner of this organization"
- "This user is already a member of this organization"
- "This invitation was sent to a different email address"
- "You are already the owner of this organization"

**Fix Applied:**
Standardized all error messages to generic responses that don't reveal user existence:

- "Cannot send invitation to this email address" (for existing members/owners)
- "Unable to accept invitation" (for acceptance errors)

**Files Modified:**

- `server/src/services/invitation.service.js` (lines 37-40, 48-51, 218-221, 226-229, 247-250)

**Security Improvement:** Prevents email enumeration attacks where attackers could probe for registered users or organization relationships.

---

### 13. Missing CSRF Protection ✅ FIXED

**File:** Multiple files (server/src/middleware/csrf.js, server/src/services/csrf.service.js, src/api/client.js)
**Fixed:** December 31, 2025

**Implementation Details:**

- **Pattern**: Double Submit Cookie with HMAC-signed tokens
- **Token Generation**: Cryptographically secure (128-bit random + SHA256 HMAC signature)
- **Validation**: Middleware validates token from both X-CSRF-Token header and csrf-token cookie
- **Auto-retry**: Frontend automatically refreshes token and retries on CSRF errors
- **Scope**: Applied to all state-changing operations (POST, PUT, DELETE)
- **Exceptions**: Public routes (auth, public) and safe methods (GET, HEAD, OPTIONS) exempt

**Files Created:**

- `server/src/services/csrf.service.js` - Token generation, signing, and validation
- `server/src/middleware/csrf.js` - CSRF validation middleware with audit logging
- `server/src/routes/csrf.js` - CSRF token endpoint

**Files Modified:**

- `server/src/index.js` - Added cookie-parser, mounted CSRF routes, applied middleware
- `server/package.json` - Added cookie-parser dependency
- `src/api/client.js` - CSRF token fetching, storage, header injection, auto-retry
- `src/App.jsx` - CSRF initialization on app mount

**Security Features:**

- Timing-safe token comparison (prevents timing attacks)
- HMAC signature prevents token tampering
- Token rotation on each request
- Cookie flags: httpOnly=false (JS readable), Secure, SameSite=Strict
- 24-hour token expiration
- Comprehensive audit logging for CSRF violations

**Testing:**

- ✅ CSRF token endpoint generates valid tokens
- ✅ POST requests without CSRF rejected (403)
- ✅ GET requests work without CSRF (safe methods)
- ✅ Auth routes work without CSRF (public endpoints)

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
const tempPassword = randomBytes(9)
  .toString('base64')
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

### 16. No Refresh Token Implementation ✅ FIXED

**Files:** Multiple (db.js, auth.service.js, auth.js routes, client.js, AuthContext.jsx)
**Fixed:** January 3, 2026

**Previous Issue:**

- 7-day JWT access tokens with no revocation capability
- No way to log out other sessions
- Compromised tokens valid until natural expiration

**Implementation Details:**

- **Short-lived access tokens**: 15 minutes (reduced from 7 days)
- **Long-lived refresh tokens**: 7 days, stored as SHA-256 hash in database
- **Token rotation**: New refresh token issued on each refresh, old one revoked
- **Secure storage**: Refresh tokens stored in httpOnly cookies (XSS protection)
- **Session management**: Users can view and revoke active sessions
- **Automatic cleanup**: Hourly job removes expired/revoked tokens

**Database Changes:**

- Added `refresh_tokens` table with id, user_id, token_hash, device_info, ip_address, expires_at, created_at, last_used_at, revoked_at
- Indexed for efficient lookup (user_id, token_hash, expires_at)

**Backend Changes:**

- `server/src/db.js` - Added refresh_tokens table migration
- `server/src/services/auth.service.js` - Token generation, validation, rotation, revocation functions
- `server/src/routes/auth.js` - Added /refresh, /logout, /sessions endpoints
- `server/src/index.js` - Added hourly cleanup job

**Frontend Changes:**

- `src/api/client.js` - 401 interception with auto-refresh, request queuing
- `src/contexts/AuthContext.jsx` - Updated login/logout for new token flow
- `src/components/auth/SessionsPage.jsx` - New session management UI
- `src/App.jsx` - Added /settings/sessions route

**Security Features:**

- Refresh tokens hashed with SHA-256 before storage (like passwords)
- httpOnly cookies prevent XSS access to refresh tokens
- SameSite=strict prevents CSRF on refresh endpoint
- Rate limiting on refresh endpoint (10/min)
- All tokens revoked on password change
- Token rotation prevents reuse attacks

**Security Improvement:** Complete session management with proper token revocation, dramatically reduces exposure window from 7 days to 15 minutes for compromised access tokens

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

### 18. Invitation Metadata Disclosure ✅ FIXED

**File:** `server/src/services/invitation.service.js`
**Fixed:** December 31, 2025

**Original Issue:**
Public invitation endpoint returned excessive metadata including:

- Internal database IDs (invitation.id, organizationId)
- Organization name
- Role
- Status and expiration

**Fix Applied:**
Reduced exposed metadata to minimum required for informed decision-making:

- **Kept**: organizationName, role, status, expiresAt (necessary for recipient)
- **Removed**: invitation id, organizationId (internal implementation details)

**Files Modified:**

- `server/src/services/invitation.service.js` (lines 169-187)

**Security Improvement:** Minimizes information disclosure while maintaining necessary functionality for invitation acceptance.

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

### 21. XSS Risk in Search Highlights ✅ FIXED

HTML tags in FTS snippets could be XSS vector if frontend uses innerHTML.

**Status**: Fixed (January 4, 2026)
**Fix Applied**:

- Created `server/src/utils/escape.js` with `escapeHtml()` utility to sanitize strings
- Updated `server/src/services/search.service.js` to import and apply `escapeHtml()` to all `highlight` fields returned from `searchDepartments()` and `searchPeople()`
- The frontend is already using safe rendering methods, but this fix hardens the backend by ensuring that any potentially unsafe characters in the FTS snippets are properly escaped before being sent to the client. This provides an additional layer of defense-in-depth against XSS.

---

### 22. Health Endpoint Exposes Environment ✅ FIXED

**File:** `server/src/index.js:121-140`
**Fixed:** December 31, 2025

Removed `environment: process.env.NODE_ENV` from health endpoint response. Health checks now only return status, timestamp, and database connectivity without exposing environment details.

**Security Improvement:** Prevents information disclosure that could aid attackers in understanding the deployment environment.

---

### 23. Cascade Deletes Without Soft Delete ✅ FIXED

No audit trail for cascaded deletions.

**Status**: Fixed (January 4, 2026)
**Fix Applied**:

- Added a `deleted_at` column to both the `departments` and `people` tables in `server/src/db.js`.
- Modified all database queries in `server/src/services/people.service.js`, `server/src/services/department.service.js`, and `server/src/services/bulk.service.js` to respect the `deleted_at` flag, ensuring soft-deleted items are excluded from results.
- Replaced all `DELETE` statements with `UPDATE` statements that set the `deleted_at` timestamp.
- The `deleteDepartment` and `bulkDeleteDepartments` functions now recursively soft-delete all child departments and their associated people, ensuring a complete and auditable record of deletions.
- This approach preserves the data for audit purposes while effectively removing it from the application's active use.

---

### 24. Incomplete Circular Reference Protection ✅ FIXED

Edge cases in department parent validation.

**Status**: Fixed (January 4, 2026)
**Fix Applied**:

- Implemented a new `checkIsDescendant` helper function in `server/src/services/department.service.js`.
- This function is now called during the `updateDepartment` operation to perform a comprehensive check before changing a department's parent.
- It traverses up the ancestry of the potential new parent department to ensure the department being moved is not one of its ancestors.
- This prevents a department from being moved under one of its own children, which would create a detached loop in the hierarchy and make a branch of the org chart inaccessible.

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

1. [ ] Increase password minimum to 12 characters
2. [ ] Add complexity requirements to passwords
3. [ ] Add rate limiting to admin endpoints
4. [ ] Standardize permission check patterns
5. [ ] Add array size validation to bulk routes
6. [ ] Remove debug console.log statements

### MEDIUM-TERM (Next Month)

1. [ ] Implement refresh tokens
2. [ ] Add CSRF protection
3. [ ] Improve audit logging coverage
4. [ ] Add password change verification
5. [ ] Limit invitation metadata exposure
6. [ ] Add CSV import size limits

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

| Category                           | Status     | Notes                                  |
| ---------------------------------- | ---------- | -------------------------------------- |
| A01:2021 Broken Access Control     | Partial    | RBAC implemented, some inconsistencies |
| A02:2021 Cryptographic Failures    | Good       | bcrypt, JWT properly configured        |
| A03:2021 Injection                 | Good       | Parameterized queries throughout       |
| A04:2021 Insecure Design           | Partial    | Some design gaps identified            |
| A05:2021 Security Misconfiguration | Needs Work | Missing headers, rate limits           |
| A06:2021 Vulnerable Components     | Good       | Dependencies appear current            |
| A07:2021 Auth Failures             | Partial    | Weak password policy                   |
| A08:2021 Data Integrity Failures   | Good       | Proper validation                      |
| A09:2021 Logging Failures          | Needs Work | Incomplete security logging            |
| A10:2021 SSRF                      | Good       | No SSRF vectors identified             |

---

**Report Generated**: December 30, 2025
**Last Updated**: January 4, 2026
**Status**: 🎉 ALL 25 SECURITY ISSUES RESOLVED (100% Complete)
**Next Audit Recommended**: Quarterly review or after major feature additions
