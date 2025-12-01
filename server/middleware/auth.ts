/**
 * JWT Authentication Middleware
 *
 * @module middleware/auth
 * @description
 * Provides JWT-based authentication and authorization for protected routes.
 *
 * **Security Features:**
 * - JWT token verification with explicit algorithm specification
 * - Token blacklisting for logout functionality
 * - Role-based access control (RBAC)
 * - Protection against algorithm confusion attacks
 *
 * **Production Considerations:**
 * - Token blacklist uses in-memory Set (use Redis for distributed systems)
 * - JWT_SECRET should be stored in environment variables
 * - Consider implementing token refresh mechanism
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../src/models/user';

/**
 * JWT secret key from environment variables.
 * @constant {string}
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * In-memory token blacklist for logout functionality.
 *
 * @description
 * Stores invalidated tokens to prevent reuse after logout.
 * In production, use Redis for:
 * - Distributed systems support
 * - Persistence across server restarts
 * - Automatic expiration handling
 *
 * @type {Set<string>}
 */
const tokenBlacklist = new Set<string>();

/**
 * Adds a token to the blacklist.
 *
 * @param {string} token - JWT token to blacklist
 *
 * @description
 * Used by logout endpoint to immediately invalidate tokens.
 *
 * @example
 * blacklistToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 */
export const blacklistToken = (token: string): void => {
  tokenBlacklist.add(token);
};

/**
 * Checks if a token has been blacklisted.
 *
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is blacklisted
 *
 * @example
 * if (isTokenBlacklisted(token)) {
 *   return res.status(401).json({ message: 'Token revoked' });
 * }
 */
export const isTokenBlacklisted = (token: string): boolean => {
  return tokenBlacklist.has(token);
};

/**
 * Extended Express Request type with user property.
 * @global
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

/**
 * JWT authentication middleware.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @description
 * Protects routes by verifying JWT tokens from the Authorization header.
 *
 * **Process:**
 * 1. Extracts token from Authorization: Bearer <token> header
 * 2. Checks if token is blacklisted (logged out)
 * 3. Verifies token signature with explicit HS256 algorithm
 * 4. Fetches user from database
 * 5. Attaches user to request object
 *
 * **Security:**
 * - Explicit algorithm specification prevents algorithm confusion attacks
 * - Token blacklist prevents reuse of logged-out tokens
 * - User validation ensures token references existing user
 *
 * @throws {401} If token is missing, invalid, expired, or blacklisted
 * @throws {500} If database or verification error occurs
 *
 * @example
 * router.get('/api/protected', protect, (req, res) => {
 *   res.json({ userId: req.user.id });
 * });
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Not authorised to access this route. Please log in.',
      });
      return;
    }

    // Check if token has been blacklisted (logged out)
    if (isTokenBlacklisted(token)) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please log in again.',
      });
      return;
    }

    try {
      // Verify token with explicit algorithm specification
      // This prevents algorithm confusion attacks
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'] // Only allow HS256, reject others
      }) as { id: string };

      // Find user by id from token
      const user = await User.findById(decoded.id).select('-passwordHash');

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found. Please log in again.',
        });
        return;
      }

      // Attach user to request object
      req.user = {
        id: user._id.toString(),
        role: user.role,
      };

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.',
      });
      return;
    }
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
  }
};

/**
 * Role-based authorization middleware.
 *
 * @param {...string} roles - Allowed role names (e.g., 'admin', 'user')
 * @returns {Function} Express middleware function
 *
 * @description
 * Restricts route access to specific user roles.
 * Must be used AFTER the `protect` middleware.
 *
 * **Process:**
 * 1. Checks if user is attached to request (requires `protect` middleware first)
 * 2. Verifies user's role is in the allowed roles list
 * 3. Grants or denies access based on role
 *
 * **Usage:**
 * Chain after protect middleware:
 * ```typescript
 * router.delete('/api/admin/games/:id', protect, authorize('admin'), deleteGame);
 * ```
 *
 * @throws {403} If user doesn't have required role
 *
 * @example
 * // Single role
 * router.post('/api/admin/games', protect, authorize('admin'), createGame);
 *
 * @example
 * // Multiple roles
 * router.get('/api/moderator', protect, authorize('admin', 'moderator'), getResource);
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
      return;
    }
    next();
  };
};