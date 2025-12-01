/**
 * Content Security Policy (CSP) Configuration
 *
 * Defines CSP directives to prevent XSS, clickjacking, and other code injection attacks.
 * CSP works by specifying which sources of content are trusted for the application.
 *
 * WCAG 2.1 AA Compliance Note:
 * CSP helps maintain security without compromising accessibility features.
 * All accessibility tools (screen readers, keyboard navigation) work with CSP.
 *
 * @module config/cspConfig
 */

import { HelmetOptions } from 'helmet';

/**
 * Determines if the application is running in production mode
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy directives configuration
 *
 * Each directive controls where resources can be loaded from:
 * - defaultSrc: Fallback for other directives
 * - scriptSrc: JavaScript sources
 * - styleSrc: CSS sources
 * - imgSrc: Image sources
 * - connectSrc: AJAX, WebSocket, EventSource connections
 * - fontSrc: Font sources
 * - objectSrc: <object>, <embed>, <applet> elements
 * - mediaSrc: <audio>, <video> sources
 * - frameSrc: <frame>, <iframe> sources
 * - frameAncestors: Pages that can embed this site
 * - baseUri: Restricts <base> element URLs
 * - formAction: Restricts form submission targets
 * - upgradeInsecureRequests: Automatically upgrades HTTP to HTTPS in production
 */
export const cspDirectives = {
  // Default policy for all resource types not explicitly defined
  defaultSrc: ["'self'"],

  // Allow scripts from same origin
  // Note: 'unsafe-inline' should be removed in production and replaced with nonces
  // For development, we allow inline scripts for hot reload and dev tools
  scriptSrc: [
    "'self'",
    ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"]) // Dev only
  ],

  // Allow styles from same origin and inline styles
  // Inline styles are common in React applications and accessibility tools
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // Required for styled-components and inline styles
    'https://fonts.googleapis.com' // Google Fonts
  ],

  // Allow images from same origin, data URLs, and HTTPS sources
  // data: URLs are used for inline images (base64 encoded)
  imgSrc: [
    "'self'",
    'data:',
    'https:', // Allow any HTTPS image source
    'blob:' // For dynamically generated images
  ],

  // Allow connections to same origin and specific APIs
  connectSrc: [
    "'self'",
    // Add your API domain in production
    ...(isProduction ? ['https://api.yourdomain.com'] : [])
  ],

  // Allow fonts from same origin and Google Fonts
  fontSrc: [
    "'self'",
    'https://fonts.gstatic.com',
    'data:' // For base64 encoded fonts
  ],

  // Block all object/embed/applet elements (reduce attack surface)
  objectSrc: ["'none'"],

  // Allow media from same origin
  mediaSrc: ["'self'"],

  // Block all iframes (prevent clickjacking)
  frameSrc: ["'none'"],

  // Prevent this site from being embedded in iframes (anti-clickjacking)
  frameAncestors: ["'none'"],

  // Restrict <base> element to same origin
  baseUri: ["'self'"],

  // Restrict form submissions to same origin
  formAction: ["'self'"],

  // Automatically upgrade HTTP requests to HTTPS in production
  ...(isProduction && { upgradeInsecureRequests: [] })
};

/**
 * Complete Helmet configuration with CSP and other security headers
 *
 * This configuration provides comprehensive security headers including:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 *
 * @returns {HelmetOptions} Helmet configuration object
 */
export const getHelmetConfig = (): HelmetOptions => {
  return {
    // Content Security Policy
    contentSecurityPolicy: {
      useDefaults: false,
      directives: cspDirectives
    },

    // HTTP Strict Transport Security (HSTS)
    // Forces browsers to use HTTPS for all future requests
    // Only enabled in production to avoid development issues
    hsts: isProduction ? {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true, // Apply to all subdomains
      preload: true // Allow inclusion in browser HSTS preload lists
    } : false,

    // X-Frame-Options: Prevents clickjacking attacks
    // DENY prevents the page from being displayed in an iframe
    frameguard: {
      action: 'deny'
    },

    // X-Content-Type-Options: Prevents MIME type sniffing
    // Forces browsers to respect declared content types
    noSniff: true,

    // Referrer-Policy: Controls referrer information sent with requests
    // strict-origin-when-cross-origin: Send full URL for same-origin, origin only for cross-origin
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },

    // Permissions-Policy: Controls which browser features can be used
    // Denies access to camera, microphone, and geolocation by default
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none'
    },

    // X-DNS-Prefetch-Control: Controls browser DNS prefetching
    dnsPrefetchControl: {
      allow: false
    },

    // X-Download-Options: Prevents IE from executing downloads in site context
    ieNoOpen: true,

    // X-XSS-Protection: Legacy XSS protection (disabled as CSP is more effective)
    // Modern browsers ignore this in favour of CSP
    xssFilter: false
  };
};

/**
 * CSP violation reporting configuration
 *
 * In production, you can add a report-uri or report-to directive
 * to receive CSP violation reports and monitor security issues.
 *
 * Example:
 * reportUri: ['/api/csp-violation-report']
 *
 * This allows you to:
 * - Monitor attempted attacks
 * - Identify legitimate resources that need whitelisting
 * - Improve your CSP policy over time
 */
export const cspReportingConfig = {
  reportUri: process.env.CSP_REPORT_URI || undefined,
  reportOnly: process.env.CSP_REPORT_ONLY === 'true'
};
