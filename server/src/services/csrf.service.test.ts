import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCsrfToken,
  signCsrfToken,
  verifyCsrfToken,
  compareCsrfTokens,
  createCsrfTokenPair,
} from './csrf.service.js';

describe('CSRF Service', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('should generate a token', () => {
    const token = generateCsrfToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });

  it('should sign and verify a token', () => {
    const token = generateCsrfToken();
    const signed = signCsrfToken(token);
    expect(signed).toContain(token);
    expect(verifyCsrfToken(signed)).toBe(true);
  });

  it('should reject invalid signatures', () => {
    const token = generateCsrfToken();
    const signed = signCsrfToken(token);
    const tampered = signed.substring(0, signed.length - 5) + 'fake';
    expect(verifyCsrfToken(tampered)).toBe(false);
  });

  it('should reject malformed tokens', () => {
    expect(verifyCsrfToken('no-dot')).toBe(false);
    expect(verifyCsrfToken('')).toBe(false);
    // @ts-expect-error - Testing error handling with invalid input
    expect(verifyCsrfToken(null)).toBe(false);
  });

  it('should compare tokens safely', () => {
    const t1 = 'token123';
    const t2 = 'token123';
    const t3 = 'token456';
    expect(compareCsrfTokens(t1, t2)).toBe(true);
    expect(compareCsrfTokens(t1, t3)).toBe(false);
  });

  it('should create a token pair', () => {
    const pair = createCsrfTokenPair();
    expect(pair).toHaveProperty('token');
    expect(pair).toHaveProperty('signedToken');
    expect(verifyCsrfToken(pair.signedToken)).toBe(true);
  });
});
