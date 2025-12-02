/**
 * Rate Limiting Middleware
 *
 * Implements rate limiting to protect API endpoints from abuse and DoS attacks.
 *
 * Acceptance Criteria:
 * Given a user makes repeated requests to API endpoints,
 * When they exceed the defined threshold:
 * - 100 requests per 15 minutes for unauthenticated users (general API)
 * - 5 failed login attempts per 15 minutes (login endpoint)
 * Then subsequent requests must return:
 * - 429 Too Many Requests status code
 * - Retry-After header (seconds until limit resets)
 * - X-RateLimit-* headers (limit, remaining, reset)
 *
 * Security Benefits:
 * - Prevents brute force attacks on login
 * - Protects against DoS attacks
 * - Reduces server load from automated requests
 * - Prevents credential stuffing attacks
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const isNonProduction = process.env.NODE_ENV !== 'production';

// TypeScript type declarations for express-rate-limit
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime: Date | number;
      };
    }
  }
}

/**
 * Helper function to get resetTime in seconds
 * Handles both Date objects and timestamps
 */
function getResetTimeInSeconds(resetTime: Date | number | undefined): number {
  if (!resetTime) return 900; // Default 15 minutes

  if (resetTime instanceof Date) {
    return Math.ceil(resetTime.getTime() / 1000);
  }

  return Math.ceil(resetTime / 1000);
}

/**
 * Helper function to calculate retry after in seconds
 */
function calculateRetryAfter(resetTime: Date | number | undefined): number {
  const resetSeconds = getResetTimeInSeconds(resetTime);
  const nowSeconds = Math.ceil(Date.now() / 1000);
  return Math.max(0, resetSeconds - nowSeconds);
}

function isAdminRoute(req: Request): boolean {
  const originalUrl = req.originalUrl || req.url || '';
  return originalUrl.startsWith('/api/admin');
}

const buildRateLimitHandler =
  (message: string, code: string) =>
  (req: Request, res: Response): void => {
    const rateLimit = req.rateLimit;
    if (!rateLimit) {
      res.status(429).json({ success: false, message, code });
      return;
    }

    const retryAfter = calculateRetryAfter(rateLimit.resetTime);
    const resetTime = getResetTimeInSeconds(rateLimit.resetTime);

    res
      .status(429)
      .set({
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetTime.toString(),
      })
      .json({
        success: false,
        message,
        code,
        retryAfter,
      });
  };

/**
 * General API Rate Limiter
 *
 * Limits: 100 requests per 15 minutes for all API endpoints
 * Applied to: All /api/* routes (except those with specific limiters)
 *
 * Use case: Prevents excessive API usage and DoS attacks
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: true, // Also enable `X-RateLimit-*` headers for compatibility

  // Custom handler to add Retry-After header
  handler: buildRateLimitHandler(
    'Too many requests from this IP, please try again after 15 minutes.',
    'RATE_LIMIT_EXCEEDED'
  ),

  // Skip rate limiting for successful requests in some cases (optional)
  skip: (req: Request) => {
    if (isNonProduction) {
      return true;
    }
    return isAdminRoute(req);
  }

  // Key generator defaults to IP address (handled automatically by library)
});

/**
 * Admin API Rate Limiter
 *
 * Limits: Higher ceiling to accommodate dashboard traffic while still protecting
 * administrator-only endpoints from runaway loops.
 */
export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Admin activity rate limit reached. Please wait a moment and try again.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler(
    'Admin activity rate limit reached. Please wait a moment and try again.',
    'ADMIN_RATE_LIMIT_EXCEEDED'
  ),
  skip: () => isNonProduction,
});

/**
 * Login Rate Limiter
 *
 * Limits: 5 login attempts per 15 minutes per IP address
 * Applied to: POST /api/auth/login
 *
 * Security: Prevents brute force and credential stuffing attacks
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,

  // Custom handler with security-specific message
  handler: (req: Request, res: Response) => {
    const rateLimit = req.rateLimit;
    if (!rateLimit) {
      return res.status(429).json({ success: false, message: 'Too many login attempts' });
    }

    const retryAfter = calculateRetryAfter(rateLimit.resetTime);
    const resetTime = getResetTimeInSeconds(rateLimit.resetTime);

    res.status(429).set({
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': resetTime.toString()
    }).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfter,
      securityNote: 'Multiple failed login attempts detected. For security, this IP has been temporarily blocked.'
    });
  },

  // Only count failed login attempts
  skipSuccessfulRequests: true

  // Key generator defaults to IP address (handled automatically)
});

/**
 * Signup Rate Limiter
 *
 * Limits: 3 signup attempts per hour per IP address
 * Applied to: POST /api/auth/signup
 *
 * Security: Prevents mass account creation and spam
 */
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 signup attempts per hour
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again after an hour.',
    code: 'SIGNUP_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req: Request, res: Response) => {
    const rateLimit = req.rateLimit;
    if (!rateLimit) {
      return res.status(429).json({ success: false, message: 'Too many signup attempts' });
    }

    const retryAfter = calculateRetryAfter(rateLimit.resetTime);
    const resetTime = getResetTimeInSeconds(rateLimit.resetTime);

    res.status(429).set({
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': resetTime.toString()
    }).json({
      success: false,
      message: 'Too many accounts created from this IP. Please try again later.',
      code: 'SIGNUP_RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfter
    });
  },

  skipSuccessfulRequests: false // Count all signup attempts
});

/**
 * Password Reset Rate Limiter
 *
 * Limits: 3 password reset requests per hour per IP
 * Applied to: POST /api/auth/request-password-reset
 *
 * Security: Prevents email flooding and password reset abuse
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset requests, please try again after an hour.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req: Request, res: Response) => {
    const rateLimit = req.rateLimit;
    if (!rateLimit) {
      return res.status(429).json({ success: false, message: 'Too many password reset requests' });
    }

    const retryAfter = calculateRetryAfter(rateLimit.resetTime);
    const resetTime = getResetTimeInSeconds(rateLimit.resetTime);

    res.status(429).set({
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': resetTime.toString()
    }).json({
      success: false,
      message: 'Too many password reset requests. Please try again later.',
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfter
    });
  }
});

/**
 * Strict Rate Limiter (for sensitive operations)
 *
 * Limits: 10 requests per 15 minutes
 * Applied to: Admin operations, sensitive data access
 *
 * Security: Extra protection for critical endpoints
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Very restrictive limit
  message: {
    success: false,
    message: 'Too many requests for this sensitive operation.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req: Request, res: Response) => {
    const rateLimit = req.rateLimit;
    if (!rateLimit) {
      return res.status(429).json({ success: false, message: 'Rate limit exceeded' });
    }

    const retryAfter = calculateRetryAfter(rateLimit.resetTime);
    const resetTime = getResetTimeInSeconds(rateLimit.resetTime);

    res.status(429).set({
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': resetTime.toString()
    }).json({
      success: false,
      message: 'Rate limit exceeded for sensitive operation.',
      code: 'STRICT_RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfter
    });
  }
});
