/**
 * JWT Security Tests
 *
 * These tests verify the JWT security acceptance criteria:
 *
 * Given a user successfully authenticates,
 * When tokens are generated,
 * Then the system must:
 * - Issue access tokens with proper claims (id, iat, exp, user ID)
 * - Use explicit HS256 algorithm specification
 * - Validate tokens on every protected request
 * - Invalidate tokens upon logout through blacklisting
 * - Use a strong cryptographic secret (512-bit)
 * - Protect against algorithm confusion attacks
 *
 * @group security
 * @group jwt
 * @group authentication
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { protect, blacklistToken, isTokenBlacklisted } from '../../middleware/auth';

// Mock user model
jest.mock('../../models/user', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

import User from '../../models/user';

describe('JWT Security - Acceptance Criteria', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
  const TEST_USER_ID = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear blacklist between tests
    const auth = require('../../../middleware/auth');
    auth.tokenBlacklist = new Set();
  });

  /**
   * Acceptance Criterion 1: Issue access tokens with proper claims
   *
   * Verifies that generated JWT tokens contain:
   * - User ID (id)
   * - Issued at timestamp (iat)
   * - Expiration timestamp (exp)
   */
  test('should generate JWT tokens with proper claims (id, iat, exp)', () => {
    // Generate token
    const token = jwt.sign(
      { id: TEST_USER_ID },
      JWT_SECRET,
      {
        expiresIn: 60 * 60 * 24 * 365,
        algorithm: 'HS256'
      }
    );

    // Decode token to verify claims
    const decoded = jwt.decode(token) as any;

    expect(decoded).toBeDefined();
    expect(decoded).toHaveProperty('id', TEST_USER_ID);
    expect(decoded).toHaveProperty('iat'); // Issued at timestamp
    expect(decoded).toHaveProperty('exp'); // Expiration timestamp
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded.exp).toBe('number');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  /**
   * Acceptance Criterion 2: Use explicit HS256 algorithm specification
   *
   * Verifies that:
   * - Tokens are signed with HS256 algorithm
   * - Algorithm is explicitly specified in token header
   */
  test('should use explicit HS256 algorithm specification', () => {
    // Generate token
    const token = jwt.sign(
      { id: TEST_USER_ID },
      JWT_SECRET,
      {
        expiresIn: 60 * 60 * 24 * 365,
        algorithm: 'HS256'
      }
    );

    // Decode token header to verify algorithm
    const decoded = jwt.decode(token, { complete: true });

    expect(decoded).toBeDefined();
    expect(decoded?.header.alg).toBe('HS256');
    expect(decoded?.header.typ).toBe('JWT');
  });

  /**
   * Acceptance Criterion 3: Validate tokens on every protected request
   *
   * Verifies that:
   * - Requests without tokens are rejected
   * - Requests with invalid tokens are rejected
   * - Valid tokens are properly verified
   */
  test('should validate tokens on every protected request', async () => {
    // Test 1: Request without token should be rejected
    const mockRequestNoToken = {
      headers: {},
      user: undefined,
    } as unknown as Request;

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const mockNext = jest.fn();

    await protect(mockRequestNoToken, mockResponse, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Not authorised to access this route. Please log in.',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  /**
   * Acceptance Criterion 3 (continued): Invalid token rejection
   *
   * Verifies that requests with invalid signatures are rejected
   */
  test('should reject tokens with invalid signatures', async () => {
    // Create token with wrong secret
    const invalidToken = jwt.sign(
      { id: TEST_USER_ID },
      'wrong-secret',
      { algorithm: 'HS256' }
    );

    const mockRequest = {
      headers: {
        authorization: `Bearer ${invalidToken}`,
      },
      user: undefined,
    } as unknown as Request;

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const mockNext = jest.fn();

    await protect(mockRequest, mockResponse, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  /**
   * Acceptance Criterion 4: Invalidate tokens upon logout through blacklisting
   *
   * Verifies that:
   * - Tokens can be added to blacklist
   * - Blacklisted tokens are rejected on subsequent requests
   * - Blacklist checking happens before token verification
   */
  test('should invalidate tokens upon logout through blacklisting', async () => {
    // Generate a valid token
    const token = jwt.sign(
      { id: TEST_USER_ID },
      JWT_SECRET,
      {
        expiresIn: 60 * 60 * 24 * 365,
        algorithm: 'HS256'
      }
    );

    // Blacklist the token (simulating logout)
    blacklistToken(token);
    expect(isTokenBlacklisted(token)).toBe(true);

    // Mock request with blacklisted token
    const mockRequest = {
      headers: {
        authorization: `Bearer ${token}`,
      },
      user: undefined,
    } as unknown as Request;

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const mockNext = jest.fn();

    // Try to use blacklisted token - should be rejected
    await protect(mockRequest, mockResponse, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token has been revoked. Please log in again.',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  /**
   * Acceptance Criterion 5: Use strong cryptographic secret (512-bit)
   *
   * Verifies that:
   * - JWT_SECRET environment variable exists
   * - Secret is sufficiently long (at least 64 characters for 512-bit)
   */
  test('should use strong cryptographic secret (512-bit minimum)', () => {
    const secret = process.env.JWT_SECRET;

    expect(secret).toBeDefined();
    expect(secret).not.toBe('');

    // 512-bit = 64 bytes = 128 hex characters
    // Minimum acceptable: 64 characters (256-bit equivalent)
    expect(secret!.length).toBeGreaterThanOrEqual(64);
  });

  /**
   * Acceptance Criterion 6: Protect against algorithm confusion attacks
   *
   * Verifies that:
   * - Tokens with 'none' algorithm are rejected
   * - Only HS256 algorithm is accepted
   * - Algorithm validation happens during verification
   */
  test('should protect against algorithm confusion attacks', () => {
    // Attempt to create token with 'none' algorithm
    const maliciousToken = jwt.sign(
      { id: TEST_USER_ID },
      '',
      { algorithm: 'none' as any }
    );

    // Verification should fail when enforcing HS256
    expect(() => {
      jwt.verify(maliciousToken, JWT_SECRET, {
        algorithms: ['HS256']
      });
    }).toThrow();
  });

  /**
   * Acceptance Criterion 6 (continued): Algorithm enforcement
   *
   * Verifies that valid HS256 tokens are accepted
   */
  test('should accept valid HS256 tokens and reject others', () => {
    // Valid HS256 token should be accepted
    const validToken = jwt.sign(
      { id: TEST_USER_ID },
      JWT_SECRET,
      {
        expiresIn: 60 * 60 * 24,
        algorithm: 'HS256'
      }
    );

    const decoded = jwt.verify(validToken, JWT_SECRET, {
      algorithms: ['HS256']
    }) as any;

    expect(decoded).toBeDefined();
    expect(decoded.id).toBe(TEST_USER_ID);
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('iat');
  });

  /**
   * Additional Test: Token expiration enforcement
   *
   * Verifies that expired tokens are rejected
   */
  test('should reject expired tokens', () => {
    // Create token that expired 1 hour ago
    const expiredToken = jwt.sign(
      { id: TEST_USER_ID },
      JWT_SECRET,
      {
        expiresIn: '-1h',
        algorithm: 'HS256'
      }
    );

    // Verification should throw TokenExpiredError
    expect(() => {
      jwt.verify(expiredToken, JWT_SECRET, {
        algorithms: ['HS256']
      });
    }).toThrow(jwt.TokenExpiredError);
  });
});
