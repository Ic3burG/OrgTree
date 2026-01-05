import express from 'express';
import { createCsrfTokenPair } from '../services/csrf.service.js';

const router = express.Router();

/**
 * GET /api/csrf-token
 *
 * Generates a new CSRF token and returns it to the client.
 * The token is also set as a cookie for double submit validation.
 *
 * This endpoint:
 * 1. Generates a cryptographically random token
 * 2. Signs the token with HMAC-SHA256
 * 3. Sets the signed token as a cookie (httpOnly=false for JS access)
 * 4. Returns the signed token in response body
 *
 * Frontend should:
 * 1. Call this endpoint on app initialization and after CSRF errors
 * 2. Store the returned token
 * 3. Send the token in X-CSRF-Token header for all state-changing requests
 *
 * Security: No authentication required as this just generates a token.
 * The token only proves the request came from the same origin.
 */
router.get('/csrf-token', (req, res) => {
  try {
    const { signedToken } = createCsrfTokenPair();

    // Set CSRF token as cookie
    // httpOnly=false allows JavaScript to read it for comparison
    // sameSite=strict provides additional CSRF protection
    // secure=true in production ensures HTTPS-only transmission
    res.cookie('csrf-token', signedToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Strict same-site policy
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/', // Available site-wide
    });

    // Return token in response body
    res.json({
      csrfToken: signedToken,
      expiresIn: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    });
  } catch (err) {
    console.error('Error generating CSRF token:', err);
    res.status(500).json({
      message: 'Failed to generate CSRF token',
      code: 'CSRF_GENERATION_ERROR',
    });
  }
});

export default router;
