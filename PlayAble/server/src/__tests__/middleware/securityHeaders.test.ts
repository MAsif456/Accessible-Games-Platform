/**
 * Security Headers Middleware Tests
 *
 * Comprehensive test suite for security headers and Content Security Policy implementation.
 * Tests ensure that all security headers are correctly applied and configured.
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
    // Create a fresh Express app for each test
    app = express();

    // Apply security middleware
    app.use(securityHeadersMiddleware);
    app.use(customSecurityHeaders);

    // Simple test route
    app.get('/test', (req, res) => {
      res.json({ message: 'Test endpoint' });
    });

    app.post('/test', (req, res) => {
      res.json({ message: 'POST endpoint' });
    });
  });

  describe('Helmet Security Headers', () => {
    test('should set Content-Security-Policy header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    test('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should set Referrer-Policy header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['referrer-policy']).toBeDefined();
    });

    test('should not set X-Powered-By header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Custom Security Headers', () => {
    test('should set X-API-Version header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-api-version']).toBe('1.0');
    });

    test('should set X-Security-Headers header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['x-security-headers']).toBe('enabled');
    });

    test('should set Permissions-Policy header', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['permissions-policy']).toBeDefined();
      expect(response.headers['permissions-policy']).toContain('camera=()');
      expect(response.headers['permissions-policy']).toContain('microphone=()');
      expect(response.headers['permissions-policy']).toContain('geolocation=()');
    });
  });

  describe('Content Security Policy Directives', () => {
    test('should include all required CSP directives', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      // Required directives
      expect(csp).toContain('default-src');
      expect(csp).toContain('script-src');
      expect(csp).toContain('style-src');
      expect(csp).toContain('img-src');
      expect(csp).toContain('font-src');
      expect(csp).toContain('connect-src');
    });

    test('should allow images from data URLs', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain('data:');
    });

    test('should block object/embed elements', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain("object-src 'none'");
    });

    test('should block iframe embedding', async () => {
      const response = await request(app).get('/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe('Security Headers on Different HTTP Methods', () => {
    test('should apply security headers to GET requests', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should apply security headers to POST requests', async () => {
      const response = await request(app).post('/test');

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('HTTPS/HSTS Headers', () => {
    test('should not set HSTS header in development', async () => {
      // Ensure we're in development mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app).get('/test');

      expect(response.headers['strict-transport-security']).toBeUndefined();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    test('should set HSTS header in production', async () => {
      // Switch to production mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Use Jest's module system to clear cache
      jest.resetModules();

      // Dynamically import with production environment
      const { securityHeadersMiddleware: prodMiddleware } = await import('../../middleware/securityHeaders');

      // Recreate app with production config
      const prodApp = express();
      prodApp.use(prodMiddleware);
      prodApp.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(prodApp).get('/test');

      expect(response.headers['strict-transport-security']).toBeDefined();

      // Restore environment
      process.env.NODE_ENV = originalEnv;

      // Reset modules to restore original config
      jest.resetModules();
    });
  });
});

describe('CORS Security Middleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(corsSecurityMiddleware);

    app.get('/test', (req, res) => {
      res.json({ message: 'Test endpoint' });
    });
  });

  test('should allow requests without origin header', async () => {
    const response = await request(app).get('/test');

    expect(response.status).toBe(200);
  });

  test('should allow requests from allowed origins', async () => {
    const originalEnv = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

    const response = await request(app)
      .get('/test')
      .set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(200);

    process.env.ALLOWED_ORIGINS = originalEnv;
  });

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
});

describe('Security Logging Middleware', () => {
  let app: Express;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(securityLoggingMiddleware);

    app.get('/test', (req, res) => res.json({ ok: true }));
    app.post('/test', (req, res) => res.json({ ok: true }));

    // Spy on console.warn
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should log suspicious script tag patterns', async () => {
    await request(app).get('/test?input=<script>alert(1)</script>');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY] Suspicious pattern detected'),
      expect.any(Object)
    );
  });

  test('should log SQL injection patterns', async () => {
    await request(app).get('/test?query=union select * from users');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY] Suspicious pattern detected'),
      expect.any(Object)
    );
  });

  test('should log MongoDB injection patterns', async () => {
    await request(app)
      .post('/test')
      .send({ email: { $ne: null } });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY] Suspicious pattern detected'),
      expect.any(Object)
    );
  });

  test('should log requests without User-Agent header', async () => {
    await request(app)
      .get('/test')
      .set('User-Agent', ''); // Remove user agent

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY] Request without User-Agent header'),
      expect.any(Object)
    );
  });

  test('should not log normal requests', async () => {
    await request(app)
      .get('/test?name=john')
      .set('User-Agent', 'Mozilla/5.0'); // Include User-Agent to prevent warning

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('CSP Violation Report Handler', () => {
  let app: Express;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    app.post('/csp-report', cspViolationReportHandler);

    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should accept CSP violation reports', async () => {
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
  });

  test('should log CSP violations', async () => {
    const violationReport = {
      'document-uri': 'https://example.com',
      'violated-directive': 'img-src',
      'blocked-uri': 'http://insecure.com/image.jpg'
    };

    await request(app)
      .post('/csp-report')
      .send(violationReport);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[SECURITY] CSP Violation Report:',
      expect.objectContaining({
        documentUri: 'https://example.com',
        violatedDirective: 'img-src'
      })
    );
  });
});

describe('Integration: Full Security Stack', () => {
  let app: Express;

  beforeEach(() => {
    app = express();

    // Apply all security middleware
    app.use(securityHeadersMiddleware);
    app.use(customSecurityHeaders);
    app.use(corsSecurityMiddleware);
    app.use(securityLoggingMiddleware);

    app.get('/api/test', (req, res) => {
      res.json({ message: 'Secure endpoint' });
    });
  });

  test('should apply all security headers on API response', async () => {
    const response = await request(app).get('/api/test');

    // Check all critical security headers are present
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['permissions-policy']).toBeDefined();
    expect(response.headers['x-api-version']).toBe('1.0');
    expect(response.headers['x-security-headers']).toBe('enabled');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  test('should return 200 for normal requests', async () => {
    const response = await request(app).get('/api/test');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Secure endpoint');
  });
});
