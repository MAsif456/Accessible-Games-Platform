/**
 * Rate Limiting Middleware
 * Provides rate limiting for API endpoints to prevent abuse and DoS attacks.
 * @module middleware/rateLimiting
 */
import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter - 1000 requests per 15 minutes
 * Applied to all /api/* routes
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: true, // Also enable `X-RateLimit-*` headers for compatibility
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res, _next, options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfterSeconds,
    });
  },
});

/**
 * Admin API rate limiter - More generous limit for admin operations
 * Applied to /api/admin/* routes
 */
export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 requests per window
  standardHeaders: true,
  legacyHeaders: true,
  message: {
    success: false,
    message: 'Too many admin requests from this IP, please try again after 15 minutes.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res, _next, options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many admin requests from this IP, please try again after 15 minutes.',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfterSeconds,
    });
  },
});

/**
 * Login rate limiter - 50 failed attempts per 15 minutes
 * Only counts failed login attempts (skipSuccessfulRequests: true)
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 failed attempts per window (increased from 5 for development)
  skipSuccessfulRequests: true, // Only count failed attempts
  standardHeaders: true,
  legacyHeaders: true,
  message: {
    success: false,
    message: 'Too many failed login attempts. Please try again after 15 minutes.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res, _next, options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many failed login attempts. Please try again after 15 minutes.',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfterSeconds,
      securityNote: 'Multiple failed login attempts detected',
    });
  },
});

/**
 * Signup rate limiter - 30 attempts per hour
 * Prevents mass account creation
 */
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 signups per hour
  standardHeaders: true,
  legacyHeaders: true,
  message: {
    success: false,
    message: 'Too many signup attempts. Please try again after 1 hour.',
    code: 'SIGNUP_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Password reset rate limiter - 30 requests per hour
 * Prevents email flooding and password reset abuse
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 requests per hour
  standardHeaders: true,
  legacyHeaders: true,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 1 hour.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
  },
});

