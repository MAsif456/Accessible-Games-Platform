/**
 * JWT Authentication Middleware - Complete Test Coverage
 * Tests all authentication scenarios, token validation, blacklisting, and authorization
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { protect, authorize, blacklistToken, isTokenBlacklisted } from '../../../middleware/auth';
import User from '../../models/user';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Mock data
const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  passwordHash: 'hashedpassword',
};

const mockAdmin = {
  _id: new mongoose.Types.ObjectId(),
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  passwordHash: 'hashedpassword',
};

// Helper to generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1d' });
};

// Mock Express objects
const createMockRequest = (authHeader?: string): Partial<Request> => ({
  headers: authHeader ? { authorization: authHeader } : {},
  user: undefined,
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('JWT Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('protect middleware', () => {
    describe('Successful Authentication', () => {
      it('should authenticate user with valid token', async () => {
        const token = generateToken(mockUser._id.toString());
        const req = createMockRequest(`Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        jest.spyOn(User, 'findById').mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        } as any);

        await protect(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user?.id).toBe(mockUser._id.toString());
        expect(req.user?.role).toBe('user');
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should authenticate admin with valid token', async () => {
        const token = generateToken(mockAdmin._id.toString());
        const req = createMockRequest(`Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        jest.spyOn(User, 'findById').mockReturnValue({
          select: jest.fn().mockResolvedValue(mockAdmin),
        } as any);

        await protect(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user?.role).toBe('admin');
      });

      it('should exclude passwordHash from user object', async () => {
        const token = generateToken(mockUser._id.toString());
        const req = createMockRequest(`Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const selectSpy = jest.fn().mockResolvedValue({
          ...mockUser,
          passwordHash: undefined,
        });

        jest.spyOn(User, 'findById').mockReturnValue({
          select: selectSpy,
        } as any);

        await protect(req, res, next);

        expect(selectSpy).toHaveBeenCalledWith('-passwordHash');
      });
    });

    describe('Missing or Invalid Token', () => {
      it('should reject request without Authorization header', async () => {
        const req = createMockRequest() as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorised to access this route. Please log in.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject request with malformed Authorization header (no Bearer)', async () => {
        const token = generateToken(mockUser._id.toString());
        const req = createMockRequest(token) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorised to access this route. Please log in.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject request with empty token', async () => {
        const req = createMockRequest('Bearer ') as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorised to access this route. Please log in.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject request with invalid JWT format', async () => {
        const req = createMockRequest('Bearer invalid-token-format') as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid or expired token. Please log in again.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject expired token', async () => {
        const expiredToken = jwt.sign(
          { id: mockUser._id.toString() },
          JWT_SECRET,
          { expiresIn: '-1s' } // Already expired
        );
        const req = createMockRequest(`Bearer ${expiredToken}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid or expired token. Please log in again.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject token signed with wrong secret', async () => {
        const wrongToken = jwt.sign(
          { id: mockUser._id.toString() },
          'wrong-secret-key',
          { expiresIn: '1d' }
        );
        const req = createMockRequest(`Bearer ${wrongToken}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid or expired token. Please log in again.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject token with invalid algorithm', async () => {
        // JWT library will reject tokens with non-HS256 algorithm
        const req = createMockRequest('Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6IjEyMyJ9.') as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid or expired token. Please log in again.',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Token Blacklist', () => {
      it('should reject blacklisted token', async () => {
        const token = generateToken(mockUser._id.toString());
        blacklistToken(token);

        const req = createMockRequest(`Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Token has been revoked. Please log in again.',
        });
        expect(next).not.toHaveBeenCalled();
        expect(User.findById).not.toHaveBeenCalled();
      });

      it('should detect token is blacklisted with isTokenBlacklisted', () => {
        const token = 'test-token-123';
        blacklistToken(token);
        expect(isTokenBlacklisted(token)).toBe(true);
      });

      it('should detect token is not blacklisted', () => {
        const token = 'non-blacklisted-token';
        expect(isTokenBlacklisted(token)).toBe(false);
      });
    });

    describe('User Not Found', () => {
      it('should reject valid token if user no longer exists', async () => {
        // Use a new user ID to avoid blacklist conflicts from previous tests
        const nonExistentUserId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(nonExistentUserId);
        const req = createMockRequest(`Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        jest.spyOn(User, 'findById').mockReturnValue({
          select: jest.fn().mockResolvedValue(null),
        } as any);

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'User not found. Please log in again.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject token if user was deleted', async () => {
        const deletedUserId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(deletedUserId);
        const req = createMockRequest(`Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        jest.spyOn(User, 'findById').mockReturnValue({
          select: jest.fn().mockResolvedValue(null),
        } as any);

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Database Errors', () => {
      it('should handle database connection errors gracefully', async () => {
        // Use a unique token to avoid blacklist conflicts
        const uniqueUserId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(uniqueUserId);
        const req = createMockRequest(`Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        jest.spyOn(User, 'findById').mockReturnValue({
          select: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        } as any);

        await protect(req, res, next);

        // Database errors during user lookup are caught in inner try-catch
        // and return 401 with "Invalid or expired token" message
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid or expired token. Please log in again.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should handle timeout errors', async () => {
        // Use a unique token to avoid blacklist conflicts
        const uniqueUserId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(uniqueUserId);
        const req = createMockRequest(`Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        jest.spyOn(User, 'findById').mockReturnValue({
          select: jest.fn().mockRejectedValue(new Error('Query timeout')),
        } as any);

        await protect(req, res, next);

        // Timeout errors during user lookup are caught in inner try-catch
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      it('should handle token with extra whitespace', async () => {
        const token = generateToken(mockUser._id.toString());
        const req = createMockRequest(`Bearer   ${token}   `) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        // The split will create empty strings, should be rejected
        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });

      it('should handle multiple Bearer keywords', async () => {
        const token = generateToken(mockUser._id.toString());
        const req = createMockRequest(`Bearer Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });

      it('should handle case-sensitive Bearer keyword', async () => {
        const token = generateToken(mockUser._id.toString());
        const req = createMockRequest(`bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorised to access this route. Please log in.',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should handle token without payload', async () => {
        const malformedToken = jwt.sign({}, JWT_SECRET);
        const req = createMockRequest(`Bearer ${malformedToken}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('authorize middleware', () => {
    describe('Successful Authorization', () => {
      it('should authorize user with correct role', () => {
        const req = { user: { id: mockUser._id.toString(), role: 'user' } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('user');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should authorize admin with admin role', () => {
        const req = { user: { id: mockAdmin._id.toString(), role: 'admin' } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('admin');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should authorize when multiple roles are allowed', () => {
        const req = { user: { id: mockUser._id.toString(), role: 'user' } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('user', 'admin', 'moderator');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should authorize admin when both user and admin are allowed', () => {
        const req = { user: { id: mockAdmin._id.toString(), role: 'admin' } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('user', 'admin');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });
    });

    describe('Failed Authorization', () => {
      it('should reject user without req.user property', () => {
        const req = {} as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('user');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You do not have permission to access this resource',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject user with wrong role', () => {
        const req = { user: { id: mockUser._id.toString(), role: 'user' } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('admin');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'You do not have permission to access this resource',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject regular user trying to access admin-only route', () => {
        const req = { user: { id: mockUser._id.toString(), role: 'user' } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('admin', 'moderator');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject when role is undefined', () => {
        const req = { user: { id: mockUser._id.toString(), role: undefined as any } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('user');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject when role is null', () => {
        const req = { user: { id: mockUser._id.toString(), role: null as any } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('user');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty roles array', () => {
        const req = { user: { id: mockUser._id.toString(), role: 'user' } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize();
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should be case-sensitive for role matching', () => {
        const req = { user: { id: mockUser._id.toString(), role: 'Admin' } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('admin');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should handle special characters in role', () => {
        const req = { user: { id: mockUser._id.toString(), role: 'super-admin' } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('super-admin');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should reject role with extra whitespace', () => {
        const req = { user: { id: mockUser._id.toString(), role: 'user ' } } as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        const middleware = authorize('user');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Integration with protect', () => {
      it('should work in sequence after protect middleware', async () => {
        const token = generateToken(mockAdmin._id.toString());
        const req = createMockRequest(`Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        jest.spyOn(User, 'findById').mockReturnValue({
          select: jest.fn().mockResolvedValue(mockAdmin),
        } as any);

        // First protect middleware
        await protect(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toBeDefined();

        // Then authorize middleware
        const authMiddleware = authorize('admin');
        authMiddleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(2);
      });

      it('should reject after successful protect but failed authorize', async () => {
        // Use a unique user to avoid blacklist conflicts from previous tests
        const uniqueUser = {
          _id: new mongoose.Types.ObjectId(),
          email: 'unique@test.com',
          name: 'Unique User',
          role: 'user',
        };
        const token = generateToken(uniqueUser._id.toString());
        const req = createMockRequest(`Bearer ${token}`) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();

        jest.spyOn(User, 'findById').mockReturnValue({
          select: jest.fn().mockResolvedValue(uniqueUser),
        } as any);

        // First protect middleware succeeds
        await protect(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);

        // Then authorize middleware fails
        const authMiddleware = authorize('admin');
        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).toHaveBeenCalledTimes(1); // Not called second time
      });
    });
  });

  describe('Blacklist utility functions', () => {
    it('should add token to blacklist', () => {
      const token = 'test-token-456';
      blacklistToken(token);
      expect(isTokenBlacklisted(token)).toBe(true);
    });

    it('should handle multiple tokens in blacklist', () => {
      const token1 = 'token-1';
      const token2 = 'token-2';
      const token3 = 'token-3';

      blacklistToken(token1);
      blacklistToken(token2);
      blacklistToken(token3);

      expect(isTokenBlacklisted(token1)).toBe(true);
      expect(isTokenBlacklisted(token2)).toBe(true);
      expect(isTokenBlacklisted(token3)).toBe(true);
    });

    it('should not affect non-blacklisted tokens', () => {
      const blacklistedToken = 'blacklisted';
      const normalToken = 'normal';

      blacklistToken(blacklistedToken);

      expect(isTokenBlacklisted(blacklistedToken)).toBe(true);
      expect(isTokenBlacklisted(normalToken)).toBe(false);
    });

    it('should handle duplicate blacklist additions', () => {
      const token = 'duplicate-token';
      blacklistToken(token);
      blacklistToken(token); // Add again

      expect(isTokenBlacklisted(token)).toBe(true);
    });
  });
});
