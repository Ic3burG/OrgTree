# ADR-002: Dual-Token JWT Authentication Strategy

**Status**: Accepted
**Date**: 2025-12-20
**Deciders**: Development Team
**Tags**: security, authentication, architecture

## Context and Problem Statement

OrgTree requires secure user authentication with session management across multiple devices. The authentication system must balance security (short-lived tokens to minimize compromise risk) with user experience (not forcing frequent re-login). Additionally, the system must support session revocation and prevent XSS/CSRF attacks.

## Decision Drivers

- **Security**: Minimize impact of token theft (XSS attacks)
- **User Experience**: Allow users to stay logged in without frequent re-authentication
- **Session Management**: Support multiple concurrent sessions per user
- **Revocability**: Ability to revoke sessions remotely
- **CSRF Protection**: Prevent cross-site request forgery
- **XSS Protection**: Limit damage from cross-site scripting attacks
- **Simplicity**: Avoid complex OAuth flows for single-application use case

## Considered Options

- **Dual-token JWT** (short-lived access + long-lived refresh)
- Single long-lived JWT
- Session-based authentication (server-side sessions)
- OAuth 2.0 with third-party providers

## Decision Outcome

Chosen option: **Dual-token JWT strategy**, because it provides optimal balance between security (short-lived access tokens) and user experience (automatic token refresh without re-login).

### Implementation Details

**Access Token**:

- **Lifetime**: 15 minutes
- **Storage**: localStorage (accessible to JavaScript for API calls)
- **Transport**: Authorization header (`Bearer <token>`)
- **Purpose**: Authorize API requests
- **Revocation**: Not revocable (short lifetime limits risk)

**Refresh Token**:

- **Lifetime**: 7 days
- **Storage**: httpOnly cookie (not accessible to JavaScript)
- **Transport**: Automatically sent with HTTP requests
- **Purpose**: Obtain new access tokens
- **Revocation**: Stored in database, can be revoked instantly

**Refresh Strategy**:

- Frontend automatically refreshes access token at 80% of lifetime (~12 minutes)
- Refresh requests queued to prevent concurrent refresh attempts
- On 401 error, attempt token refresh before redirecting to login
- See `src/api/client.ts:151` for implementation

### Positive Consequences

- **Limited XSS impact**: Stolen access tokens expire in 15 minutes
- **CSRF protection**: Refresh tokens in httpOnly cookies + CSRF token validation
- **Session revocation**: Users can revoke refresh tokens from any device
- **Multi-device support**: Each device gets its own refresh token
- **Seamless UX**: Users stay logged in for 7 days without manual refresh
- **Stateless API**: Access tokens don't require database lookup
- **Audit trail**: Refresh token table tracks device info and last activity

### Negative Consequences

- **Added complexity**: Two tokens require coordination logic in client
- **Database dependency**: Refresh token validation requires DB query
- **Storage limitations**: httpOnly cookies not accessible to mobile apps (future consideration)
- **Token refresh race conditions**: Requires careful queue management

## Pros and Cons of the Options

### Dual-token JWT (Chosen)

- **Good**, because XSS attacks only steal 15-minute access tokens
- **Good**, because refresh tokens are protected from JavaScript access
- **Good**, because users don't need to re-login every 15 minutes
- **Good**, because sessions can be revoked instantly via database
- **Good**, because supports multiple concurrent devices
- **Bad**, because client-side refresh logic adds complexity
- **Bad**, because refresh endpoint adds database load

### Single Long-Lived JWT

- **Good**, because implementation is simpler (no refresh logic)
- **Good**, because no database queries for token validation
- **Bad**, because stolen tokens are valid for entire lifetime (days/weeks)
- **Bad**, because no way to revoke sessions without server-side blocklist
- **Bad**, because violates principle of least privilege (long-lived credentials)

### Session-Based Authentication

- **Good**, because sessions can be revoked instantly
- **Good**, because server has full control over session state
- **Good**, because battle-tested approach with mature libraries
- **Bad**, because requires server-side storage (memory or Redis)
- **Bad**, because complicates horizontal scaling (sticky sessions or shared storage)
- **Bad**, because cookies alone don't work well for mobile apps or third-party API access
- **Bad**, because less suitable for stateless microservices architecture

### OAuth 2.0 with Third-Party Providers

- **Good**, because delegates authentication to trusted providers (Google, GitHub)
- **Good**, because users don't need another password
- **Good**, because reduces security burden (provider handles password resets, 2FA)
- **Bad**, because adds external dependencies (provider downtime affects app)
- **Bad**, because privacy concerns (user data shared with third parties)
- **Bad**, because still need fallback for email/password users
- **Bad**, because more complex integration (OAuth flows, provider SDKs)

## Security Considerations

### Token Storage

**Access Token (localStorage)**:

- Vulnerable to XSS attacks (malicious scripts can read localStorage)
- Mitigation: Short 15-minute lifetime limits damage window
- Mitigation: Content Security Policy prevents inline script execution
- Mitigation: Input sanitization prevents XSS injection

**Refresh Token (httpOnly cookie)**:

- Protected from JavaScript access (XSS cannot steal it)
- Vulnerable to CSRF attacks
- Mitigation: Double-submit CSRF token pattern (see ADR-003)
- Mitigation: SameSite cookie attribute (Lax mode)

### Token Rotation

Refresh tokens are NOT rotated on each use:

- **Pros**: Simpler implementation, fewer database writes
- **Cons**: Stolen refresh token remains valid until expiry or manual revocation
- **Acceptable risk**: 7-day lifetime is reasonable, users can view/revoke sessions

Future enhancement: Implement refresh token rotation (issue new refresh token on each use, invalidate old one).

### JWT Secret Management

- Secret stored in environment variable `JWT_SECRET`
- Production validation: Server exits if default secret detected
- Recommendation: 64+ character cryptographically random string
- Same secret used for both access and refresh tokens (simplifies key management)

## Performance Impact

- **Access token validation**: <1ms (in-memory JWT verification, no DB query)
- **Refresh token validation**: 5-10ms (single DB query to `refresh_tokens` table)
- **Token refresh rate**: ~1 request per user per 12 minutes (low overhead)

## Future Enhancements

1. **Refresh token rotation**: Issue new refresh token on each use
2. **Refresh token families**: Detect token replay attacks
3. **Device fingerprinting**: Bind tokens to specific devices
4. **Two-factor authentication**: Add TOTP or SMS verification
5. **OAuth provider integration**: Add "Login with Google/GitHub" options

## Links

- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- Implementation: `server/src/services/auth.service.ts`
- Client implementation: `src/api/client.ts`
- Related: ADR-003 (CSRF Protection)
