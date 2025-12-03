/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 *
 * This middleware protects against CSRF attacks by ensuring that state-changing requests
 * (POST, PUT, PATCH, DELETE) include a valid CSRF token that matches the server's secret.
 *
 * @module middleware/csrfProtection
 */

import { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';

/**
 * CSRF Configuration
 *
 * Security Considerations:
 * - Secret should be stored in environment variables (not hardcoded)
 * - Cookie is httpOnly to prevent XSS attacks
 * - SameSite=Strict provides additional CSRF protection
 * - Secure flag ensures cookies only sent over HTTPS in production
 */
const csrfSecret = process.env.CSRF_SECRET || 'your-csrf-secret-change-this-in-production';

const doubleCsrfUtilities = doubleCsrf({
  getSecret: () => csrfSecret,
  cookieName: 'x-csrf-token', // Name of the CSRF cookie
  cookieOptions: {
    httpOnly: true, // Prevents JavaScript access to cookie
    sameSite: 'strict', // Additional CSRF protection
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  },
  size: 64, // Token size in bytes (default: 64)
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't require CSRF for safe methods
  getSessionIdentifier: (req: any) => {
    // Use a consistent identifier per session/user
    // In production, use proper session management (e.g., express-session)
    // For now, use IP address as a simple identifier
    return req.ip || 'anonymous';
  },
});

// Extract utilities from the doubleCsrf library
const csrfProtection = doubleCsrfUtilities.doubleCsrfProtection;
const generateToken = doubleCsrfUtilities.generateCsrfToken;
const invalidCsrfTokenError = doubleCsrfUtilities.invalidCsrfTokenError;

/**
 * CSRF Protection Middleware
 *
 * Validates CSRF tokens on state-changing requests (POST, PUT, PATCH, DELETE).
 * Safe methods (GET, HEAD, OPTIONS) are automatically excluded.
 *
 * Usage in Routes:
 * ```typescript
 * // Protect specific routes
 * router.post('/api/games', csrfProtection, createGame);
 *
 * // Or apply globally in server.ts
 * app.use(csrfProtection);
 * ```
 *
 * Error Response (403):
 * ```json
 * {
 *   "success": false,
 *   "message": "Invalid or missing CSRF token"
 * }
 * ```
 */
export { csrfProtection };

/**
 * Generate CSRF Token Utility
 *
 * Generates a new CSRF token for the current request/response.
 * Call this in your token endpoint to provide tokens to the frontend.
 *
 * @param req - Express request object
 * @param res - Express response object (token is set in cookie)
 * @returns The generated CSRF token string
 *
 * @example
 * ```typescript
 * router.get('/api/csrf-token', (req, res) => {
 *   const token = generateCsrfToken(req, res);
 *   res.json({ csrfToken: token });
 * });
 * ```
 */
export const generateCsrfToken = (req: Request, res: Response): string => {
  return generateToken(req, res);
};

/**
 * CSRF Error Handler Middleware
 *
 * Handles CSRF token validation errors and returns user-friendly error responses.
 * Should be used after csrfProtection middleware.
 *
 * @param err - Error object (may be CSRF error or other error)
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const csrfErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err === invalidCsrfTokenError) {
    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token. Please refresh the page and try again.',
      code: 'CSRF_TOKEN_INVALID',
    });
    return;
  }
  next(err);
};

/**
 * CSRF Development Bypass Flag
 *
 * When set to true, allows development without CSRF tokens.
 * Should NEVER be enabled in production.
 */
export const csrfDevBypass = process.env.CSRF_DEV_BYPASS === 'true';

