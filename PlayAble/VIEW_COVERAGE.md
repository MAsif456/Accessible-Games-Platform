# How to View Test Coverage

## 🚀 Quick Commands (NEW!)

I've added convenient npm scripts for you:

### Server Coverage
```bash
cd PlayAble/server

# View in terminal + generate HTML report
npm run test:coverage

# Generate HTML report and open it automatically
npm run test:coverage:open
```

### Client Coverage
```bash
cd PlayAble/client

# View in terminal + generate HTML report
npm run test:coverage

# Generate HTML report and open it automatically
npm run test:coverage:open
```

## 📊 Understanding the Coverage Report

### Terminal Output
You'll see a table like this:
```
--------------------------------|---------|----------|---------|---------|
File                            | % Stmts | % Branch | % Funcs | % Lines |
--------------------------------|---------|----------|---------|---------|
All files                       |   29.14 |    24.57 |      25 |   28.16 |
 src/middleware                 |   75.53 |    50.98 |   70.83 |   74.41 |
  csrfProtection.ts             |   73.33 |    33.33 |   66.66 |   69.23 |
  rateLimiting.ts               |   72.72 |     42.1 |   81.81 |   74.07 |
--------------------------------|---------|----------|---------|---------|
```

**What each column means:**
- **% Stmts**: Percentage of statements executed
- **% Branch**: Percentage of conditional branches tested (if/else)
- **% Funcs**: Percentage of functions called
- **% Lines**: Percentage of code lines executed

**Goal**: 100% in all columns! ✅

### HTML Report (Visual)

After running `npm run test:coverage`, open:
- **Server**: `PlayAble/server/coverage/index.html`
- **Client**: `PlayAble/client/coverage/index.html`

**What you'll see:**
- 🟢 **Green lines** = Covered by tests ✅
- 🔴 **Red lines** = NOT covered (need tests) ❌
- 🟡 **Yellow lines** = Partially covered (some branches missing)
- **Line numbers** = Shows exactly which lines need tests
- **File tree** = Click through your codebase
- **Interactive** = Click on files to see detailed coverage

## 🎯 Check Specific Areas

### Check Admin Game Management
```bash
# Server
cd PlayAble/server
npm test -- --coverage --collectCoverageFrom='src/controllers/games.controller.ts' --collectCoverageFrom='src/routes/games.routes.ts' --collectCoverageFrom='src/services/games.service.ts'

# Client
cd PlayAble/client
npm test -- --coverage --collectCoverageFrom='src/services/gamesAdminService.ts' --collectCoverageFrom='src/pages/AdminGameFormPage.tsx'
```

### Check Authentication
```bash
# Server
cd PlayAble/server
npm test -- --coverage --collectCoverageFrom='src/middleware/auth.ts' --collectCoverageFrom='src/routes/auth.ts'

# Client
cd PlayAble/client
npm test -- --coverage --collectCoverageFrom='src/context/AuthContext.tsx' --collectCoverageFrom='src/services/authService.ts'
```

### Check Security
```bash
# Server
cd PlayAble/server
npm test -- --coverage --collectCoverageFrom='src/middleware/csrfProtection.ts' --collectCoverageFrom='src/middleware/rateLimiting.ts' --collectCoverageFrom='src/middleware/securityHeaders.ts'

# Client
cd PlayAble/client
npm test -- --coverage --collectCoverageFrom='src/context/CsrfContext.tsx' --collectCoverageFrom='src/hooks/useCsrfToken.ts'
```

### Check Profile Management
```bash
cd PlayAble/client
npm test -- --coverage --collectCoverageFrom='src/pages/MyProfilePage.tsx' --collectCoverageFrom='src/pages/ChangeEmailPasswordPage.tsx'
```

### Check Recently Viewed
```bash
# Server
cd PlayAble/server
npm test -- --coverage --collectCoverageFrom='src/controllers/recentlyViewedController.ts'

# Client
cd PlayAble/client
npm test -- --coverage --collectCoverageFrom='src/context/RecentlyViewedContext.tsx'
```

## 📈 Coverage Thresholds

For 100% coverage, you need:
```
✅ Statements: 100%
✅ Branches: 100%
✅ Functions: 100%
✅ Lines: 100%
```

Current status:
```
❌ Server: 29.14% overall
❌ Client: 50.21% overall
```

## 🔍 Finding What Needs Tests

1. Run `npm run test:coverage:open`
2. Look for **red lines** in the HTML report
3. These are the exact lines that need test coverage
4. Write tests that execute those lines
5. Re-run coverage to verify

## 💡 Pro Tips

**Tip 1**: Use the HTML report - it's much easier to see what's missing

**Tip 2**: Focus on one file at a time:
```bash
npm test -- src/__tests__/specific-file.test.ts --coverage
```

**Tip 3**: Watch mode while developing tests:
```bash
npm run test:watch
# Then press 'p' to filter by filename
# Then press 'o' to run only tests related to changed files
```

**Tip 4**: Coverage doesn't run by default (for speed):
```bash
npm test        # Fast, no coverage
npm run test:coverage  # Slower, with coverage
```

## 📁 Coverage Output Location

After running coverage commands:
```
PlayAble/
├── server/
│   └── coverage/
│       ├── index.html          ← Open this in browser
│       ├── lcov-report/
│       └── coverage-summary.json
└── client/
    └── coverage/
        ├── index.html          ← Open this in browser
        ├── lcov-report/
        └── coverage-summary.json
```

## 🚫 Ignored Files

Coverage automatically excludes:
- `node_modules/`
- Test files themselves (`*.test.ts`, `*.test.tsx`)
- Setup files (`setupTests.ts`)
- Type definitions (`*.d.ts`)

## ⚠️ Important Notes

- Coverage reports are **gitignored** (regenerate anytime)
- First run may take 1-2 minutes
- Subsequent runs are faster (cached)
- HTML reports work offline (no internet needed)

## 📞 Quick Reference

| Want to... | Command |
|------------|---------|
| See coverage in terminal | `npm run test:coverage` |
| Open HTML report | `npm run test:coverage:open` |
| Check one file | `npm test -- path/to/file.test.ts --coverage` |
| Watch tests | `npm run test:watch` |
| Run tests (no coverage) | `npm test` |

---

**Updated**: 2nd December 2025
**New Scripts Added**: `test:coverage` and `test:coverage:open`
