# Documentation Wiki Template

Copy and paste this into your GitLab wiki page:

---

## 📚 PlayAble Documentation

Complete, auto-generated documentation for the PlayAble accessible games platform.

### 🌐 Online Documentation

**Live Documentation**: [https://YOUR-USERNAME.pages.cardiff.ac.uk/accessible-games-website/](https://YOUR-USERNAME.pages.cardiff.ac.uk/accessible-games-website/)

> **Note**: Replace `YOUR-USERNAME` with your actual Cardiff GitLab username (e.g., c23049129)

### 📑 Documentation Sections

| Section | Description | Link |
|---------|-------------|------|
| **Main Index** | Overview and navigation hub | [View](https://YOUR-USERNAME.pages.cardiff.ac.uk/accessible-games-website/) |
| **Client Docs** | React components, hooks, services, pages | [View](https://YOUR-USERNAME.pages.cardiff.ac.uk/accessible-games-website/client/) |
| **Server Docs** | API endpoints, middleware, controllers, models | [View](https://YOUR-USERNAME.pages.cardiff.ac.uk/accessible-games-website/server/) |

### 🎯 What's Documented

The documentation includes comprehensive coverage of:

#### Frontend (Client)
- ✅ All page components (About, Browse, Profile, Admin, Settings, etc.)
- ✅ UI components (GameCard, Navbar, Modal, Footer, Pagination)
- ✅ Context providers (Auth, CSRF, Favourites, Recently Viewed, Voice Assistant)
- ✅ Custom hooks (keyboard navigation, voice recording, focus traps)
- ✅ Service layer (API integration, validation)
- ✅ Accessibility utilities

#### Backend (Server)
- ✅ Authentication & authorization (JWT, role-based access)
- ✅ Security middleware (CSRF protection, rate limiting, security headers)
- ✅ Game management (CRUD operations)
- ✅ User profile management
- ✅ Reports and reviews system
- ✅ Recently viewed tracking
- ✅ Email notifications

### 🔍 Documentation Features

- **Searchable**: Full-text search across all documentation
- **Cross-linked**: Click on types to navigate to their definitions
- **Type-safe**: Complete TypeScript type information
- **Examples**: Usage examples for complex functions
- **Parameters**: Detailed parameter descriptions with types
- **Security Notes**: Security considerations for sensitive operations

### 🛠️ Generating Documentation Locally

If you want to build the documentation on your local machine:

```bash
cd PlayAble
npm run docs
```

Then open `PlayAble/docs/index.html` in your browser.

### 📖 Documentation Coverage by Feature

| Feature | Documentation Status |
|---------|---------------------|
| Admin Game Management | ✅ Complete - CRUD operations, validation, security |
| Recently Viewed History | ✅ Complete - Tracking logic, state management, API |
| Authentication System | ✅ Complete - JWT, security, error handling |
| Profile Management | ✅ Complete - Validation, settings, API interactions |
| About Us & Accessibility | ✅ Complete - Component structure, WCAG compliance |
| Security Features | ✅ Complete - CSRF, rate limiting, headers, threats |

### 🚀 Auto-Deployment

Documentation is automatically rebuilt and deployed when code is pushed to the `main` branch. The CI/CD pipeline:

1. Installs dependencies
2. Generates TypeDoc documentation
3. Deploys to GitLab Pages
4. Updates the live site (usually within 2-3 minutes)

### 📝 Contributing to Documentation

When adding new functions or components, include JSDoc comments:

```typescript
/**
 * Brief description of what the function does.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws Description of errors that might be thrown
 *
 * @example
 * ```typescript
 * const result = myFunction('example');
 * console.log(result);
 * ```
 */
function myFunction(paramName: string): ReturnType {
  // implementation
}
```

Run `npm run docs` to regenerate, then commit and push.

### 🔗 Related Resources

- [TypeDoc Documentation](https://typedoc.org/)
- [Project README](../README.md)
- [Setup Instructions](../PlayAble/SETUP_INSTRUCTIONS.md)
- [GitLab Pages Setup Guide](../PlayAble/GITLAB_PAGES_SETUP.md)

### ❓ Support

If the documentation link isn't working:

1. Check [CI/CD Pipelines](../../pipelines) to ensure the build succeeded
2. Verify GitLab Pages is enabled in [Settings → Pages](../../settings/pages)
3. Wait 5-10 minutes after first deployment
4. See [GITLAB_PAGES_SETUP.md](../PlayAble/GITLAB_PAGES_SETUP.md) for troubleshooting

---

**Last Updated**: 2nd December 2025
**Documentation Version**: Auto-generated from source code
**Maintained By**: Development Team
