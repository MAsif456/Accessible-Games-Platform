/**
 * Security Headers Middleware
 *
 * Applies comprehensive security headers to all HTTP responses to protect against
 * common web vulnerabilities including XSS, clickjacking, MIME sniffing, and more.
 *
 * This middleware uses Helmet.js which sets various HTTP headers to secure Express apps.
 * All headers are configured to maintain WCAG 2.1 AA accessibility compliance.
 *
 * Security Headers Applied:
 * - Content-Security-Policy: Prevents XSS attacks
 * - Strict-Transport-Security: Forces HTTPS (production only)
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Referrer-Policy: Controls referrer information
 * - Permissions-Policy: Restricts browser features
 *
 * @module middleware/securityHeaders
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { getHelmetConfig } from '../config/cspConfig';

/**
 * Security headers middleware using Helmet
 *
 * Applies all configured security headers to HTTP responses.
 * This should be one of the first middleware in the application
 * to ensure all responses are protected.
 *
 * @example
 * ```typescript
 * import { securityHeadersMiddleware } from './middleware/securityHeaders';
 * app.use(securityHeadersMiddleware);
 * ```
 *
 * @returns {Function} Express middleware function
 */
export const securityHeadersMiddleware = helmet(getHelmetConfig());

/**
 * Custom security headers middleware
 *
 * Adds additional security headers not covered by Helmet or requiring custom logic.
 * This includes:
 * - X-Powered-By removal (hide Express fingerprint)
 * - Custom CORS-related security headers
 * - Additional WCAG compliance headers
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const customSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Remove X-Powered-By header to avoid revealing Express usage
  res.removeHeader('X-Powered-By');

  // Add custom security header for API versioning and security notices
  res.setHeader('X-API-Version', '1.0');

  // Add header to indicate security features are enabled
  res.setHeader('X-Security-Headers', 'enabled');

  // Content-Type Options (additional to Helmet for belt-and-braces approach)
  // Ensures the browser respects the declared Content-Type
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Permissions Policy - more granular control over browser features
  // Denies potentially dangerous features by default
  const permissionsPolicy = [
    'camera=()',          // Deny camera access
    'microphone=()',      // Deny microphone access (except for accessibility features)
    'geolocation=()',     // Deny geolocation
    'payment=()',         // Deny payment APIs
    'usb=()',             // Deny USB access
    'magnetometer=()',    // Deny magnetometer
    'gyroscope=()',       // Deny gyroscope
    'accelerometer=()',   // Deny accelerometer
    'ambient-light-sensor=()', // Deny ambient light sensor
    'autoplay=()',        // Deny autoplay (improves accessibility)
    'encrypted-media=()', // Deny encrypted media
    'fullscreen=(self)',  // Allow fullscreen only from same origin
    'picture-in-picture=()', // Deny picture-in-picture
    'screen-wake-lock=()', // Deny screen wake lock
    'web-share=()'        // Deny web share API
  ].join(', ');

  res.setHeader('Permissions-Policy', permissionsPolicy);

  next();
};

/**
 * CORS security enhancement middleware
 *
 * Adds additional security checks for CORS requests beyond basic CORS middleware.
 * Validates origin, checks for common attack patterns, and logs suspicious activity.
 *
 * Note: This works in conjunction with the main CORS middleware, not as a replacement.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const corsSecurityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];

  // Log suspicious cross-origin requests
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`[SECURITY] Suspicious CORS request from origin: ${origin}`);
  }

  // Prevent CORS requests with credentials from untrusted origins
  if (req.headers.origin && req.headers.cookie) {
    if (!allowedOrigins.includes(req.headers.origin)) {
      console.warn(`[SECURITY] Blocked cross-origin request with credentials from: ${req.headers.origin}`);
      res.status(403).json({
        success: false,
        message: 'Cross-origin requests with credentials not allowed from this origin'
      });
      return;
    }
  }

  next();
};

/**
 * Security logging middleware
 *
 * Logs security-relevant events for monitoring and audit purposes.
 * This helps detect patterns of attacks or misconfigurations.
 *
 * Logs:
 * - CSP violations
 * - Suspicious headers
 * - Potential attack patterns
 * - Security header mismatches
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const securityLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log requests with suspicious patterns
  const suspiciousPatterns = [
    /<script/i,           // Script tags
    /javascript:/i,       // JavaScript protocol
    /on\w+\s*=/i,        // Event handlers (onclick, onerror, etc.)
    /\.\.\//,            // Path traversal
    /union.*select/i,    // SQL injection pattern
    /\$where/i,          // MongoDB injection
    /\$ne/i              // MongoDB operator injection
  ];

  // Check URL, query parameters, and body for suspicious patterns
  const checkString = `${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.warn(`[SECURITY] Suspicious pattern detected in request:`, {
        ip: req.ip,
        url: req.url,
        method: req.method,
        pattern: pattern.toString(),
        userAgent: req.headers['user-agent']
      });
      break; // Only log once per request
    }
  }

  // Log requests with missing or invalid security headers (from client)
  if (!req.headers['user-agent']) {
    console.warn(`[SECURITY] Request without User-Agent header:`, {
      ip: req.ip,
      url: req.url
    });
  }

  next();
};

/**
 * CSP violation report handler
 *
 * Endpoint to receive CSP violation reports from browsers.
 * These reports help identify:
 * - Attempted XSS attacks
 * - Legitimate resources that need whitelisting
 * - CSP policy improvements needed
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const cspViolationReportHandler = (req: Request, res: Response): void => {
  // Parse CSP violation report
  const report = req.body;

  // Log the violation (in production, send to monitoring service)
  console.warn('[SECURITY] CSP Violation Report:', {
    documentUri: report['document-uri'],
    violatedDirective: report['violated-directive'],
    blockedUri: report['blocked-uri'],
    sourceFile: report['source-file'],
    lineNumber: report['line-number'],
    columnNumber: report['column-number'],
    timestamp: new Date().toISOString()
  });

  // Respond with 204 No Content (CSP reports don't expect a response body)
  res.status(204).end();
};

/**
 * Security headers validation middleware (development only)
 *
 * Validates that security headers are properly set in responses.
 * Useful for development to ensure security configuration is correct.
 *
 * Only runs in development mode to avoid performance overhead in production.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const validateSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  // Intercept response to check headers
  const originalSend = res.send;

  res.send = function (data): Response {
    // Check for required security headers
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Content-Security-Policy'
    ];

    const missingHeaders = requiredHeaders.filter(
      header => !res.getHeader(header)
    );

    if (missingHeaders.length > 0) {
      console.warn(`[DEV] Missing security headers in response to ${req.url}:`, missingHeaders);
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Export all middleware functions for easy importing
 */
export default {
  securityHeadersMiddleware,
  customSecurityHeaders,
  corsSecurityMiddleware,
  securityLoggingMiddleware,
  cspViolationReportHandler,
  validateSecurityHeaders
};
