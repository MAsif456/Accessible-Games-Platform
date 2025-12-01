import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../src/models/user';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Token blacklist for logout functionality
// In production, use Redis for distributed systems and persistence
// This ensures tokens are invalidated immediately upon logout
const tokenBlacklist = new Set<string>();

// Export blacklist functions for use in auth controller
export const blacklistToken = (token: string): void => {
  tokenBlacklist.add(token);
};

export const isTokenBlacklisted = (token: string): boolean => {
  return tokenBlacklist.has(token);
};

// Extend Express Request type to include user
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

// Protect routes - verify JWT token
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

// Authorize specific roles
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