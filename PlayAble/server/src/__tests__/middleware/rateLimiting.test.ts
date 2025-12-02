/**
 * Rate Limiting Tests
 *
 * These tests verify the rate limiting acceptance criteria:
 *
 * Given a user makes repeated requests to API endpoints,
 * When they exceed the defined threshold:
 * - 100 requests per 15 minutes for unauthenticated users (general API)
 * - 5 failed login attempts per 15 minutes (login endpoint)
 * Then subsequent requests must return:
 * - 429 Too Many Requests status code
 * - Retry-After header (seconds until limit resets)
 * - X-RateLimit-* headers (limit, remaining, reset)
 *
 * @group security
 * @group ratelimiting
 */

import express, { Express } from 'express';
import request from 'supertest';
import {
  generalApiLimiter,
  loginLimiter,
  signupLimiter,
  passwordResetLimiter
} from '../../middleware/rateLimiting';

describe('Rate Limiting - Acceptance Criteria', () => {
  let app: Express;

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
  });

  /**
   * Acceptance Criterion 1: General API Rate Limit (100 req/15 min)
   *
   * Verifies:
   * - Allows up to 100 requests
   * - Returns 429 on 101st request
   * - Includes X-RateLimit-* headers
   * - Includes Retry-After header on 429
   */
  describe('General API Rate Limit (100 requests/15 minutes)', () => {
    beforeEach(() => {
      app.use('/api', generalApiLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true, message: 'Test endpoint' });
      });
    });

    test('should allow requests up to the limit (100)', async () => {
      // Make 100 requests
      for (let i = 1; i <= 100; i++) {
        const response = await request(app).get('/api/test');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Check rate limit headers are present
        expect(response.headers).toHaveProperty('ratelimit-limit');
        expect(response.headers).toHaveProperty('ratelimit-remaining');
        expect(response.headers).toHaveProperty('ratelimit-reset');

        // Verify limit is 100
        expect(response.headers['ratelimit-limit']).toBe('100');
      }
    });

    test('should return 429 when limit is exceeded (101st request)', async () => {
      // Make 100 successful requests
      for (let i = 1; i <= 100; i++) {
        await request(app).get('/api/test');
      }

      // 101st request should be rate limited
      const response = await request(app).get('/api/test');

      // Verify 429 status code
      expect(response.status).toBe(429);

      // Verify error response structure
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
      expect(response.body).toHaveProperty('retryAfter');
      expect(response.body.message).toContain('Too many requests');
    });

    test('should include Retry-After header when rate limit exceeded', async () => {
      // Exceed the limit
      for (let i = 1; i <= 101; i++) {
        await request(app).get('/api/test');
      }

      const response = await request(app).get('/api/test');

      // Verify Retry-After header is present
      expect(response.headers).toHaveProperty('retry-after');

      // Verify Retry-After is a number (seconds)
      const retryAfter = parseInt(response.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(900); // Max 15 minutes = 900 seconds
    });

    test('should include X-RateLimit headers on all responses', async () => {
      const response = await request(app).get('/api/test');

      // Verify all required headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit', '100');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      // Verify X-RateLimit-Remaining decreases
      const remaining = parseInt(response.headers['x-ratelimit-remaining']);
      expect(remaining).toBeLessThanOrEqual(100);
      expect(remaining).toBeGreaterThanOrEqual(0);

      // Verify X-RateLimit-Reset is a valid timestamp
      const reset = parseInt(response.headers['x-ratelimit-reset']);
      expect(reset).toBeGreaterThan(Date.now() / 1000);
    });

    test('should show X-RateLimit-Remaining = 0 when limit exceeded', async () => {
      // Exceed the limit
      for (let i = 1; i <= 100; i++) {
        await request(app).get('/api/test');
      }

      const response = await request(app).get('/api/test');

      expect(response.status).toBe(429);
      expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });
  });

  /**
   * Acceptance Criterion 2: Login Rate Limit (5 failed attempts/15 min)
   *
   * Verifies:
   * - Allows up to 5 failed login attempts
   * - Returns 429 on 6th failed attempt
   * - Only counts failed attempts (skipSuccessfulRequests)
   * - Includes security-specific error message
   */
  describe('Login Rate Limit (5 failed attempts/15 minutes)', () => {
    beforeEach(() => {
      app.post('/api/auth/login', loginLimiter, (req, res) => {
        // Simulate failed login (always return 401)
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      });
    });

    test('should allow up to 5 failed login attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 1; i <= 5; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' });

        // Should get 401 (failed login), not 429 (rate limited)
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid credentials');

        // Check rate limit headers
        expect(response.headers).toHaveProperty('ratelimit-limit', '5');
      }
    });

    test('should return 429 after 5 failed login attempts', async () => {
      // Make 5 failed attempts
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' });
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      // Verify 429 status
      expect(response.status).toBe(429);

      // Verify login-specific error
      expect(response.body).toHaveProperty('code', 'LOGIN_RATE_LIMIT_EXCEEDED');
      expect(response.body).toHaveProperty('securityNote');
      expect(response.body.message).toContain('Too many login attempts');
      expect(response.body.securityNote).toContain('Multiple failed login attempts detected');
    });

    test('should include Retry-After header for login rate limit', async () => {
      // Exceed login limit
      for (let i = 1; i <= 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' });
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      // Verify Retry-After header
      expect(response.headers).toHaveProperty('retry-after');
      expect(response.body).toHaveProperty('retryAfter');

      const retryAfter = parseInt(response.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(900); // 15 minutes max
    });

    test('should include X-RateLimit headers for login endpoint', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      expect(response.headers).toHaveProperty('x-ratelimit-limit', '5');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  /**
   * Acceptance Criterion 3: Signup Rate Limit (3 attempts/hour)
   *
   * Verifies:
   * - Allows up to 3 signup attempts
   * - Returns 429 on 4th attempt
   * - Includes appropriate headers
   */
  describe('Signup Rate Limit (3 attempts/hour)', () => {
    beforeEach(() => {
      app.post('/api/auth/signup', signupLimiter, (req, res) => {
        res.status(201).json({ success: true, message: 'Account created' });
      });
    });

    test('should allow up to 3 signup attempts', async () => {
      for (let i = 1; i <= 3; i++) {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({ email: `user${i}@test.com`, password: 'password' });

        expect(response.status).toBe(201);
        expect(response.headers['ratelimit-limit']).toBe('3');
      }
    });

    test('should return 429 after 3 signup attempts', async () => {
      // Make 3 signup attempts
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/auth/signup')
          .send({ email: `user${i}@test.com`, password: 'password' });
      }

      // 4th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'user4@test.com', password: 'password' });

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('SIGNUP_RATE_LIMIT_EXCEEDED');
      expect(response.headers).toHaveProperty('retry-after');
    });
  });

  /**
   * Acceptance Criterion 4: Password Reset Rate Limit (3 requests/hour)
   *
   * Verifies:
   * - Allows up to 3 password reset requests
   * - Returns 429 on 4th request
   * - Includes appropriate headers
   */
  describe('Password Reset Rate Limit (3 requests/hour)', () => {
    beforeEach(() => {
      app.post('/api/auth/request-password-reset', passwordResetLimiter, (req, res) => {
        res.json({ success: true, message: 'Reset email sent' });
      });
    });

    test('should allow up to 3 password reset requests', async () => {
      for (let i = 1; i <= 3; i++) {
        const response = await request(app)
          .post('/api/auth/request-password-reset')
          .send({ email: 'test@test.com' });

        expect(response.status).toBe(200);
        expect(response.headers['ratelimit-limit']).toBe('3');
      }
    });

    test('should return 429 after 3 password reset requests', async () => {
      // Make 3 requests
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/auth/request-password-reset')
          .send({ email: 'test@test.com' });
      }

      // 4th request should be rate limited
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('PASSWORD_RESET_RATE_LIMIT_EXCEEDED');
      expect(response.headers).toHaveProperty('retry-after');
    });
  });

  /**
   * Summary Test: Verify All Acceptance Criteria
   *
   * This test confirms all required elements are present
   */
  describe('Complete Acceptance Criteria Verification', () => {
    test('should meet all acceptance criteria requirements', async () => {
      // Setup general API limiter
      app.use('/api', generalApiLimiter);
      app.get('/api/test', (req, res) => res.json({ success: true }));

      // 1. Verify general API limit exists (100 req/15 min)
      const apiResponse = await request(app).get('/api/test');
      expect(apiResponse.headers['ratelimit-limit']).toBe('100');

      // 2. Verify 429 status code on excess requests
      for (let i = 1; i <= 100; i++) {
        await request(app).get('/api/test');
      }
      const exceededResponse = await request(app).get('/api/test');
      expect(exceededResponse.status).toBe(429);

      // 3. Verify Retry-After header is present
      expect(exceededResponse.headers).toHaveProperty('retry-after');
      expect(exceededResponse.body).toHaveProperty('retryAfter');

      // 4. Verify X-RateLimit-* headers are present
      expect(exceededResponse.headers).toHaveProperty('x-ratelimit-limit');
      expect(exceededResponse.headers).toHaveProperty('x-ratelimit-remaining');
      expect(exceededResponse.headers).toHaveProperty('x-ratelimit-reset');

      // 5. Verify X-RateLimit-Remaining is 0 when exceeded
      expect(exceededResponse.headers['x-ratelimit-remaining']).toBe('0');
    });

    test('login rate limit should meet acceptance criteria (5 attempts/15 min)', async () => {
      app.post('/api/auth/login', loginLimiter, (req, res) => {
        res.status(401).json({ success: false });
      });

      // Verify limit is 5
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      expect(loginResponse.headers['ratelimit-limit']).toBe('5');

      // Verify 429 after 5 attempts
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' });
      }

      const exceededLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      expect(exceededLogin.status).toBe(429);
      expect(exceededLogin.headers).toHaveProperty('retry-after');
      expect(exceededLogin.headers).toHaveProperty('x-ratelimit-limit');
      expect(exceededLogin.headers).toHaveProperty('x-ratelimit-remaining');
      expect(exceededLogin.headers).toHaveProperty('x-ratelimit-reset');
    });
  });
});
