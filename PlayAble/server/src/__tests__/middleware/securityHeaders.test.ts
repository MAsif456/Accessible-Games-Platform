/**
 * Security Headers Middleware Tests
 *
 * Tests verify that security headers and Content Security Policy are correctly applied.
 * These tests cover the core acceptance criteria for security header implementation.
 *
 * @module __tests__/middleware/securityHeaders
 */

import request from 'supertest';
import express, { Express } from 'express';
import {
  securityHeadersMiddleware,
  customSecurityHeaders,
  corsSecurityMiddleware,
  securityLoggingMiddleware,
  cspViolationReportHandler
} from '../../middleware/securityHeaders';

describe('Security Headers Middleware', () => {
  let app: Express;

  beforeEach(() => {
    // Create a fresh Express app with full security stack
    app = express();
    app.use(securityHeadersMiddleware);
    app.use(customSecurityHeaders);
    app.use(corsSecurityMiddleware);
    app.use(securityLoggingMiddleware);
    app.use(express.json());

    app.get('/test', (req, res) => res.json({ message: 'Test endpoint' }));
    app.post('/csp-report', cspViolationReportHandler);
  });

  /**
   * Acceptance Criterion 1: Essential security headers must be present
   *
   * Verifies that all critical security headers are applied:
   * - Content-Security-Policy (prevents XSS attacks)
   * - X-Content-Type-Options (prevents MIME sniffing)
   * - X-Frame-Options (prevents clickjacking)
   * - Permissions-Policy (restricts browser features)
   * - X-Powered-By removed (hides server technology)
   */
  test('should apply all essential security headers', async () => {
    const response = await request(app).get('/test');

    // Helmet security headers
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBeDefined();

    // Custom security headers
    expect(response.headers['permissions-policy']).toBeDefined();
    expect(response.headers['permissions-policy']).toContain('camera=()');
    expect(response.headers['x-api-version']).toBe('1.0');
    expect(response.headers['x-security-headers']).toBe('enabled');

    // X-Powered-By must be removed (security by obscurity)
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  /**
   * Acceptance Criterion 2: Content Security Policy directives configured correctly
   *
   * Verifies that CSP includes required directives and properly restricts content sources.
   * This prevents Cross-Site Scripting (XSS) and code injection attacks.
   */
  test('should configure CSP with all required directives', async () => {
    const response = await request(app).get('/test');
    const csp = response.headers['content-security-policy'];

    // Required CSP directives
    expect(csp).toContain('default-src');
    expect(csp).toContain('script-src');
    expect(csp).toContain('style-src');
    expect(csp).toContain('img-src');
    expect(csp).toContain('font-src');
    expect(csp).toContain('connect-src');

    // Security restrictions
    expect(csp).toContain("object-src 'none'"); // Block Flash/plugins
    expect(csp).toContain("frame-ancestors 'none'"); // Prevent embedding
    expect(csp).toContain('data:'); // Allow data URLs for images
  });

  /**
   * Acceptance Criterion 3: CORS security blocks malicious cross-origin requests
   *
   * Verifies that cross-origin requests with credentials are blocked
   * when the origin is not in the allowed list.
   */
  test('should block cross-origin requests with credentials from untrusted origins', async () => {
    const originalEnv = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

    const response = await request(app)
      .get('/test')
      .set('Origin', 'http://malicious-site.com')
      .set('Cookie', 'sessionId=abc123');

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Cross-origin requests with credentials not allowed');

    process.env.ALLOWED_ORIGINS = originalEnv;
  });

  /**
   * Acceptance Criterion 4: Security logging detects suspicious patterns
   *
   * Verifies that the security logging middleware detects and logs
   * common attack patterns (XSS and SQL injection).
   */
  test('should detect and log suspicious attack patterns', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Test XSS pattern detection
    await request(app).get('/test?input=<script>alert(1)</script>');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY] Suspicious pattern detected'),
      expect.any(Object)
    );

    // Test SQL injection pattern detection
    consoleSpy.mockClear();
    await request(app).get('/test?query=union select * from users');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY] Suspicious pattern detected'),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });

  /**
   * Acceptance Criterion 5: CSP violation reporting works correctly
   *
   * Verifies that the CSP violation report endpoint accepts and logs
   * violations, enabling monitoring of security policy breaches.
   */
  test('should accept and log CSP violation reports', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const violationReport = {
      'document-uri': 'https://example.com/page',
      'violated-directive': 'script-src',
      'blocked-uri': 'https://malicious.com/script.js',
      'source-file': 'https://example.com/page',
      'line-number': 42,
      'column-number': 10
    };

    const response = await request(app)
      .post('/csp-report')
      .send(violationReport);

    expect(response.status).toBe(204);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[SECURITY] CSP Violation Report:',
      expect.objectContaining({
        documentUri: 'https://example.com/page',
        violatedDirective: 'script-src',
        blockedUri: 'https://malicious.com/script.js'
      })
    );

    consoleSpy.mockRestore();
  });
});
