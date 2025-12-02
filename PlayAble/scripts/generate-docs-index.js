/**
 * Documentation Index Generator
 *
 * Generates a unified landing page for all documentation.
 * Creates an HTML index that links to client and server documentation.
 */

const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs');
const indexPath = path.join(docsDir, 'index.html');

// Ensure docs directory exists
if (!fs.existsSync(docsDir)) {
  console.error('Error: docs directory does not exist. Run docs generation first.');
  process.exit(1);
}

const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="PlayAble - Complete API and Component Documentation">
  <title>PlayAble Documentation</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    .subtitle {
      font-size: 1.2rem;
      opacity: 0.95;
      font-weight: 300;
    }

    .content {
      padding: 3rem 2rem;
    }

    .intro {
      text-align: center;
      margin-bottom: 3rem;
      color: #555;
      font-size: 1.1rem;
    }

    .docs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .doc-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 2rem;
      text-decoration: none;
      color: inherit;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .doc-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .doc-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
      border-color: #667eea;
    }

    .doc-card:hover::before {
      transform: scaleX(1);
    }

    .doc-card h2 {
      font-size: 1.75rem;
      margin-bottom: 1rem;
      color: #667eea;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .doc-card .icon {
      font-size: 2rem;
    }

    .doc-card p {
      color: #666;
      margin-bottom: 1rem;
      line-height: 1.7;
    }

    .doc-card ul {
      list-style: none;
      margin: 1rem 0;
    }

    .doc-card li {
      padding: 0.5rem 0;
      padding-left: 1.5rem;
      position: relative;
      color: #555;
    }

    .doc-card li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
    }

    .cta {
      display: inline-block;
      margin-top: 1rem;
      color: #667eea;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .cta::after {
      content: ' →';
      transition: transform 0.2s ease;
      display: inline-block;
    }

    .doc-card:hover .cta::after {
      transform: translateX(4px);
    }

    .features {
      background: #f8f9fa;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .features h2 {
      color: #333;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
      text-align: center;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .feature-item {
      padding: 1rem;
      background: white;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }

    .feature-item h3 {
      color: #667eea;
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    .feature-item p {
      color: #666;
      font-size: 0.95rem;
    }

    footer {
      background: #2d3748;
      color: #cbd5e0;
      padding: 2rem;
      text-align: center;
    }

    footer p {
      margin-bottom: 0.5rem;
    }

    footer a {
      color: #90cdf4;
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      h1 {
        font-size: 2rem;
      }

      .content {
        padding: 2rem 1rem;
      }

      .docs-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Accessibility improvements */
    .doc-card:focus {
      outline: 3px solid #667eea;
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎮 PlayAble Documentation</h1>
      <p class="subtitle">Complete API and Component Reference</p>
    </header>

    <div class="content">
      <p class="intro">
        Welcome to the PlayAble documentation site. This comprehensive reference covers all client components,
        server APIs, authentication flows, security implementations, and accessibility features.
      </p>

      <div class="features">
        <h2>📚 Documentation Coverage</h2>
        <div class="feature-grid">
          <div class="feature-item">
            <h3>Admin Game Management</h3>
            <p>Complete CRUD operations, validation logic, and CSRF-protected endpoints</p>
          </div>
          <div class="feature-item">
            <h3>Recently Viewed History</h3>
            <p>Tracking logic, data flow, state management, and API interactions</p>
          </div>
          <div class="feature-item">
            <h3>Authentication & Security</h3>
            <p>JWT implementation, token blacklisting, CSRF protection, and rate limiting</p>
          </div>
          <div class="feature-item">
            <h3>Profile Management</h3>
            <p>User data validation, settings persistence, and accessibility preferences</p>
          </div>
          <div class="feature-item">
            <h3>About Us & Accessibility</h3>
            <p>Component structure, navigation handlers, WCAG compliance features</p>
          </div>
          <div class="feature-item">
            <h3>Security Utilities</h3>
            <p>Middleware implementations, threat mitigation, and configuration options</p>
          </div>
        </div>
      </div>

      <div class="docs-grid">
        <a href="./client/index.html" class="doc-card">
          <h2><span class="icon">⚛️</span> Client Documentation</h2>
          <p>
            Comprehensive documentation for the React frontend application including all components,
            pages, contexts, hooks, and services.
          </p>
          <ul>
            <li>React components and pages</li>
            <li>Context providers (Auth, CSRF, Favourites, etc.)</li>
            <li>Custom hooks and utilities</li>
            <li>Service layer and API integrations</li>
            <li>Accessibility utilities</li>
          </ul>
          <span class="cta">Browse Client Docs</span>
        </a>

        <a href="./server/index.html" class="doc-card">
          <h2><span class="icon">🚀</span> Server Documentation</h2>
          <p>
            Complete API reference for the Express backend including controllers, middleware,
            services, models, and security implementations.
          </p>
          <ul>
            <li>REST API endpoints and controllers</li>
            <li>Authentication & authorization middleware</li>
            <li>Database models and repositories</li>
            <li>Security middleware (CSRF, rate limiting)</li>
            <li>Service layer implementations</li>
          </ul>
          <span class="cta">Browse Server Docs</span>
        </a>
      </div>

      <div class="features">
        <h2>🔍 How to Use This Documentation</h2>
        <div class="feature-grid">
          <div class="feature-item">
            <h3>Search Functionality</h3>
            <p>Use the search bar in each section to quickly find specific functions, classes, or interfaces</p>
          </div>
          <div class="feature-item">
            <h3>Navigation</h3>
            <p>Browse by modules, categories, or use the alphabetical index for quick access</p>
          </div>
          <div class="feature-item">
            <h3>Code Examples</h3>
            <p>Most functions include usage examples showing parameters and expected outputs</p>
          </div>
          <div class="feature-item">
            <h3>Type Information</h3>
            <p>Full TypeScript type definitions with parameter types and return values</p>
          </div>
        </div>
      </div>
    </div>

    <footer>
      <p><strong>PlayAble</strong> - Accessible Games Platform</p>
      <p>Documentation generated with TypeDoc</p>
      <p>Last updated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </footer>
  </div>
</body>
</html>`;

try {
  fs.writeFileSync(indexPath, indexHTML, 'utf8');
  console.log('✅ Documentation index page generated successfully!');
  console.log('📍 Location:', indexPath);
  console.log('🌐 Open docs/index.html in your browser to view the documentation');
} catch (error) {
  console.error('❌ Error generating index page:', error.message);
  process.exit(1);
}
