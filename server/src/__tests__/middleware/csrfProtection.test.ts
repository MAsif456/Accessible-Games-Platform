/**
 * CSRF Protection Middleware Tests
 *
 * Tests verify that CSRF protection is working correctly:
 * 1. GET requests are allowed without CSRF tokens (safe methods)
 * 2. POST requests without CSRF tokens are blocked (403 Forbidden)
 * 3. POST requests with valid CSRF tokens are allowed (200 OK)
 * 4. CSRF token endpoint provides valid tokens to clients
 * 5. CSRF error handler provides clear error messages
 *
 * These tests ensure protection against Cross-Site Request Forgery attacks
 * where malicious websites trick users into performing unwanted actions.
 *
 * @group security
 * @group csrf
 */

import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import {
  csrfProtection,
  generateCsrfToken,
  csrfErrorHandler
} from '../../middleware/csrfProtection';

describe('CSRF Protection Middleware', () => {
  let app: Express;

  beforeEach(() => {
    // Set up a test Express app with CSRF protection
    app = express();

    // Required middleware for CSRF to work (must be in this order)
    app.use(cookieParser());  // No secret needed for testing
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // CSRF token endpoint (must be BEFORE csrfProtection middleware)
    app.get('/api/csrf-token', (req: Request, res: Response) => {
      const token = generateCsrfToken(req, res);
      res.json({ csrfToken: token });
    });

    // Apply CSRF protection to all routes
    app.use(csrfProtection);

    // Test routes
    app.get('/api/test', (req: Request, res: Response) => {
      res.json({ message: 'GET request successful' });
    });

    app.post('/api/test', (req: Request, res: Response) => {
      res.json({ message: 'POST request successful', data: req.body });
    });

    app.put('/api/test', (req: Request, res: Response) => {
      res.json({ message: 'PUT request successful' });
    });

    app.delete('/api/test/:id', (req: Request, res: Response) => {
      res.json({ message: 'DELETE request successful' });
    });

    // CSRF error handler
    app.use(csrfErrorHandler);
  });

  /**
   * Acceptance Criterion 1: GET requests should not require CSRF tokens
   *
   * Rationale: GET requests should be safe and idempotent (read-only).
   * They don't modify server state, so CSRF protection is not needed.
   */
  test('should allow GET requests without CSRF token', async () => {
    const response = await request(app)
      .get('/api/test')
      .expect(200);

    expect(response.body.message).toBe('GET request successful');
  });

  /**
   * Acceptance Criterion 2: POST requests without CSRF tokens should be blocked
   *
   * Rationale: POST requests modify server state and must be protected against
   * CSRF attacks. Without a valid token, the request should be rejected.
   */
  test('should block POST requests without CSRF token', async () => {
    const response = await request(app)
      .post('/api/test')
      .send({ data: 'test' })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('CSRF token');
    expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
  });

  /**
   * Acceptance Criterion 3: POST requests with valid CSRF tokens should succeed
   *
   * Rationale: When a client includes a valid CSRF token, the request should
   * be processed normally. This is the happy path for authenticated requests.
   */
  test('should allow POST requests with valid CSRF token', async () => {
    // Step 1: Get a CSRF token
    const tokenResponse = await request(app)
      .get('/api/csrf-token')
      .expect(200);

    const csrfToken = tokenResponse.body.csrfToken;
    expect(csrfToken).toBeDefined();
    expect(typeof csrfToken).toBe('string');
    expect(csrfToken.length).toBeGreaterThan(0);

    // Step 2: Extract cookies from the token response
    const cookies = tokenResponse.headers['set-cookie'];

    // Step 3: Make POST request with token in header and cookies
    const response = await request(app)
      .post('/api/test')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrfToken)
      .send({ data: 'test data' })
      .expect(200);

    expect(response.body.message).toBe('POST request successful');
    expect(response.body.data).toEqual({ data: 'test data' });
  });

  /**
   * Acceptance Criterion 4: CSRF token endpoint should provide valid tokens
   *
   * Rationale: The /api/csrf-token endpoint is how clients obtain CSRF tokens.
   * It must return a valid token and set the required cookie.
   */
  test('should provide CSRF token via /api/csrf-token endpoint', async () => {
    const response = await request(app)
      .get('/api/csrf-token')
      .expect(200);

    // Verify token is returned in response body
    expect(response.body.csrfToken).toBeDefined();
    expect(typeof response.body.csrfToken).toBe('string');
    expect(response.body.csrfToken.length).toBeGreaterThan(0);

    // Verify CSRF cookie is set
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // Convert cookies to array if it's a string
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];

    // Check for the CSRF cookie
    const csrfCookie = cookieArray.find((cookie: string) => cookie.startsWith('x-csrf-token'));
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie).toContain('HttpOnly'); // Security: prevent XSS access
    expect(csrfCookie).toContain('SameSite=Strict'); // Security: additional CSRF protection
  });

  /**
   * Acceptance Criterion 5: Other state-changing methods should also require CSRF tokens
   *
   * Rationale: PUT and DELETE requests also modify server state and need
   * CSRF protection, not just POST requests.
   */
  test('should require CSRF token for PUT and DELETE requests', async () => {
    // Test PUT request without token
    const putResponse = await request(app)
      .put('/api/test')
      .send({ data: 'update' })
      .expect(403);

    expect(putResponse.body.success).toBe(false);
    expect(putResponse.body.code).toBe('CSRF_TOKEN_INVALID');

    // Test DELETE request without token
    const deleteResponse = await request(app)
      .delete('/api/test/123')
      .expect(403);

    expect(deleteResponse.body.success).toBe(false);
    expect(deleteResponse.body.code).toBe('CSRF_TOKEN_INVALID');

    // Now test with valid token
    const tokenResponse = await request(app).get('/api/csrf-token');
    const csrfToken = tokenResponse.body.csrfToken;
    const cookies = tokenResponse.headers['set-cookie'];

    // PUT with valid token should succeed
    await request(app)
      .put('/api/test')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrfToken)
      .send({ data: 'update' })
      .expect(200);

    // DELETE with valid token should succeed
    await request(app)
      .delete('/api/test/123')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrfToken)
      .expect(200);
  });
});
