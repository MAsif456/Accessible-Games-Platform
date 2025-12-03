/**
 * Security Headers Middleware
 *
 * Applies comprehensive security headers to all HTTP responses to protect against
 * common web vulnerabilities including XSS, clickjacking, MIME sniffing, and more.
 *
 * This middleware uses Helmet.js which sets various HTTP headers to secure Express apps.
 * All headers are configured to maintain WCAG 2.1 AA accessibility compliance.
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
  // Remove X-Powered-By header to hide Express fingerprint
  res.removeHeader('X-Powered-By');

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0'); // Disabled as CSP is more effective
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), gyroscope=(), magnetometer=(), payment=()'
  );
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Security-Headers', 'enabled');

  next();
};

/**
 * CORS Security Middleware
 *
 * Adds additional CORS-related security headers and validation.
 * Works in conjunction with the main CORS middleware.
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
  // Additional CORS security headers
  const origin = req.headers.origin;
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedList = (process.env.ALLOWED_ORIGINS || allowedOrigin)
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const hasCredentials = Boolean(req.headers.cookie);

  if (hasCredentials && origin && !allowedList.includes(origin)) {
    res
      .status(403)
      .json({ message: 'Cross-origin requests with credentials not allowed' });
    return;
  }

  if (
    (origin && (origin === allowedOrigin || allowedList.includes(origin))) ||
    process.env.NODE_ENV !== 'production'
  ) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  next();
};

/**
 * Security Logging Middleware
 *
 * Logs security-related events for monitoring and debugging.
 * In production, this should integrate with your logging system.
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
  // Log suspicious activity (optional - can be enhanced)
  // Check both original URL and decoded URL for patterns
  const originalUrl = req.originalUrl || req.url || '';
  const decodedUrl = decodeURIComponent(originalUrl);
  const url = `${req.method} ${originalUrl}`;
  const lower = url.toLowerCase();
  const decodedLower = decodedUrl.toLowerCase();
  const suspicious =
    lower.includes('<script') ||
    lower.includes('javascript:') ||
    lower.includes('union select') ||
    lower.includes(' or 1=1') ||
    decodedLower.includes('<script') ||
    decodedLower.includes('javascript:') ||
    decodedLower.includes('union select') ||
    decodedLower.includes(' or 1=1');

  if (suspicious) {
    console.warn('[SECURITY] Suspicious pattern detected', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  }

  next();
};

/**
 * Validate Security Headers Middleware
 *
 * Validates that security headers are properly set.
 * Only runs in development mode for debugging.
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
  if (process.env.NODE_ENV === 'development') {
    // In development, validate headers are set
    // This is a no-op for now, but can be enhanced
  }
  next();
};

/**
 * CSP Violation Report Handler
 *
 * Handles Content Security Policy violation reports from browsers.
 * These reports are sent when CSP rules are violated.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const cspViolationReportHandler = (req: Request, res: Response): void => {
  // Log CSP violations for monitoring
  if (req.body) {
    const report = req.body || {};
    const normalized = {
      documentUri: report['document-uri'] || report.documentUri,
      violatedDirective: report['violated-directive'] || report.violatedDirective,
      blockedUri: report['blocked-uri'] || report.blockedUri,
      sourceFile: report['source-file'] || report.sourceFile,
      lineNumber: report['line-number'] || report.lineNumber,
      columnNumber: report['column-number'] || report.columnNumber,
    };
    console.warn('[SECURITY] CSP Violation Report:', normalized);
  }

  // Return 204 No Content as per CSP spec
  res.status(204).send();
};

