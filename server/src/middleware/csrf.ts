import type { Response, NextFunction } from 'express';
import { verifyCsrfToken, compareCsrfTokens } from '../services/csrf.service.js';
import { createAuditLog } from '../services/audit.service.js';
import type { AuthRequest } from '../types/index.js';

/**
 * CSRF Protection Middleware
 *
 * Implements Double Submit Cookie pattern:
 * 1. Validates CSRF token from X-CSRF-Token header
 * 2. Validates CSRF token from csrf-token cookie
 * 3. Ensures both tokens match and are properly signed
 * 4. Skips validation for safe HTTP methods (GET, HEAD, OPTIONS)
 *
 * Safe methods are exempt because they should not change state
 * (as per HTTP spec and REST best practices).
 */

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * CSRF validation middleware
 */
export function validateCsrf(req: AuthRequest, res: Response, next: NextFunction): void {
  // Skip CSRF check for safe methods
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // Extract CSRF token from custom header
  const headerToken = Array.isArray(req.headers['x-csrf-token'])
    ? req.headers['x-csrf-token'][0]
    : req.headers['x-csrf-token'];

  // Extract CSRF token from cookie
  const cookieToken = req.cookies['csrf-token'] as string | undefined;

  const ipAddress = req.ip || req.connection?.remoteAddress;

  // Both tokens must be present
  if (!headerToken || !cookieToken) {
    // Security: Log CSRF validation failure
    createAuditLog(
      null, // System-wide security event
      req.user ? { id: req.user.id, name: req.user.name, email: req.user.email } : null,
      'csrf_validation_failed',
      'security',
      'csrf_protection',
      {
        reason: !headerToken ? 'missing_header_token' : 'missing_cookie_token',
        path: req.path,
        method: req.method,
        ipAddress,
        timestamp: new Date().toISOString(),
      }
    );

    res.status(403).json({
      message: 'CSRF token validation failed',
      code: 'CSRF_TOKEN_MISSING',
    });
    return;
  }

  // Verify both tokens are properly signed
  const isHeaderTokenValid = verifyCsrfToken(headerToken);
  const isCookieTokenValid = verifyCsrfToken(cookieToken);

  if (!isHeaderTokenValid || !isCookieTokenValid) {
    // Security: Log CSRF validation failure
    createAuditLog(
      null, // System-wide security event
      req.user ? { id: req.user.id, name: req.user.name, email: req.user.email } : null,
      'csrf_validation_failed',
      'security',
      'csrf_protection',
      {
        reason: !isHeaderTokenValid ? 'invalid_header_signature' : 'invalid_cookie_signature',
        path: req.path,
        method: req.method,
        ipAddress,
        timestamp: new Date().toISOString(),
      }
    );

    res.status(403).json({
      message: 'CSRF token validation failed',
      code: 'CSRF_TOKEN_INVALID',
    });
    return;
  }

  // Verify tokens match (double submit validation)
  if (!compareCsrfTokens(headerToken, cookieToken)) {
    // Security: Log CSRF validation failure
    createAuditLog(
      null, // System-wide security event
      req.user ? { id: req.user.id, name: req.user.name, email: req.user.email } : null,
      'csrf_validation_failed',
      'security',
      'csrf_protection',
      {
        reason: 'token_mismatch',
        path: req.path,
        method: req.method,
        ipAddress,
        timestamp: new Date().toISOString(),
      }
    );

    res.status(403).json({
      message: 'CSRF token validation failed',
      code: 'CSRF_TOKEN_MISMATCH',
    });
    return;
  }

  // CSRF validation passed
  next();
}

/**
 * Conditional CSRF middleware - only validates if user is authenticated
 * This allows public endpoints to work without CSRF tokens
 */
export function validateCsrfIfAuthenticated(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // Only validate CSRF for authenticated requests
  if (req.user) {
    return validateCsrf(req, res, next);
  }
  next();
}
