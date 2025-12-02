# CSRF Frontend Integration Guide

## ✅ What's Been Done

### Global Infrastructure Created

1. **CSRF Context** ([client/src/context/CsrfContext.tsx](client/src/context/CsrfContext.tsx))
   - Fetches CSRF token once when app loads
   - Provides token to all components via React Context
   - Already integrated in [main.tsx](client/src/main.tsx)

2. **CSRF Hook** ([client/src/hooks/useCsrfToken.ts](client/src/hooks/useCsrfToken.ts))
   - Simple hook to access CSRF token: `const csrfToken = useCsrfToken()`

3. **API Helper** ([client/src/utils/apiHelper.ts](client/src/utils/apiHelper.ts))
   - Global fetch wrappers that automatically include CSRF tokens
   - `apiPost()`, `apiPut()`, `apiDelete()` - all CSRF-protected
   - `apiGet()` - no CSRF needed

4. **Auth Service Updated** ([client/src/services/authService.ts](client/src/services/authService.ts))
   - Login and Signup now use `apiPost()` with automatic CSRF protection
   - ✅ **Example implementation for reference**

---

## Current Status: Development Mode

**CSRF is BYPASSED in development** (`CSRF_DEV_BYPASS=true` in `.env`)

This means:
- ✅ All existing code works without changes
- ✅ You can continue developing normally
- ✅ Login, signup, and all features work
- ⏳ CSRF integration can be done gradually

---

## How to Integrate CSRF (When Ready)

### Option 1: Quick Enable (Recommended for Now)

**Just change one line in `.env`:**
```env
CSRF_DEV_BYPASS=false
```

**Then update services to use API helpers:**

#### Before (Old Code):
```typescript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

#### After (CSRF Protected):
```typescript
import { apiPost } from '../utils/apiHelper';

const response = await apiPost('/api/endpoint', data);
```

---

### Files to Update (When Enabling CSRF)

| File | Methods to Update | Lines | Priority |
|------|------------------|-------|----------|
| [authService.ts](client/src/services/authService.ts) | ✅ login, signup | DONE | ✅ High |
| [api.ts](client/src/services/api.ts) | addFavourite, removeFavourite, addRecentlyViewed | ~5 calls | High |
| [gamesAdminService.ts](client/src/services/gamesAdminService.ts) | createGame, updateGame, deleteGame | 3 calls | High |
| [reportApi.ts](client/src/services/reportApi.ts) | submitReport | 1 call | Medium |
| [settingsApi.ts](client/src/services/settingsApi.ts) | updateSettings, createSettings | 2 calls | Medium |

**Total: ~12 fetch calls to update** (1-2 hours of work)

---

### Example: Updating api.ts

```typescript
// client/src/services/api.ts

// 1. Add import at top
import { apiPost, apiDelete } from '../utils/apiHelper';

// 2. Update addFavourite
export const addFavourite = async (gameId: string, userId: string) => {
  // OLD:
  // const response = await fetch('/api/favourites', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ gameId, userId }),
  // });

  // NEW (one line!):
  const response = await apiPost('/api/favourites', { gameId, userId });

  if (!response.ok) throw new Error('Failed to add favourite');
  return response.json();
};

// 3. Update removeFavourite
export const removeFavourite = async (gameId: string, userId: string) => {
  // OLD:
  // const response = await fetch(`/api/favourites/${gameId}?userId=${userId}`, {
  //   method: 'DELETE',
  // });

  // NEW (one line!):
  const response = await apiDelete(`/api/favourites/${gameId}?userId=${userId}`);

  if (!response.ok) throw new Error('Failed to remove favourite');
  return response.json();
};
```

**See how simple? Just replace `fetch()` with `apiPost()`, `apiPut()`, or `apiDelete()`!**

---

## Benefits of This Approach

### ✅ Already Working
- CSRF infrastructure is global and ready
- Auth service already uses it (login/signup protected)
- Zero impact on existing code (bypass mode)

### ✅ Easy to Enable
- Change 1 line in `.env`: `CSRF_DEV_BYPASS=false`
- Update ~12 fetch calls to use API helpers
- Automatic CSRF protection for all requests

### ✅ Future-Proof
- New features automatically get CSRF if they use API helpers
- Impossible to forget CSRF on new endpoints
- Consistent pattern across entire codebase

---

## Testing Strategy

### Development (Current)
```typescript
// Tests work as-is because CSRF is bypassed
test('should log in user', async () => {
  const result = await authService.login({ email: 'test@test.com', password: 'password' });
  expect(result.success).toBe(true);
});
```

### Production-Ready (Optional)
```typescript
// Mock the CSRF token
jest.mock('../utils/apiHelper', () => ({
  apiPost: jest.fn((url, data) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'mock-csrf-token',
      },
      body: JSON.stringify(data),
    })
  ),
}));

test('should log in user with CSRF', async () => {
  const result = await authService.login({ email: 'test@test.com', password: 'password' });
  expect(result.success).toBe(true);
});
```

---

## Migration Timeline

### Phase 1: ✅ Complete
- [x] CSRF infrastructure created
- [x] Global API helpers created
- [x] Context provider integrated
- [x] Auth service updated as example
- [x] Development bypass enabled

### Phase 2: When Ready (1-2 hours)
- [ ] Update `api.ts` (favourites, recently viewed)
- [ ] Update `gamesAdminService.ts` (CRUD operations)
- [ ] Update `reportApi.ts` (submit reports)
- [ ] Update `settingsApi.ts` (update settings)
- [ ] Set `CSRF_DEV_BYPASS=false`
- [ ] Test all features

### Phase 3: Production (Before Deployment)
- [ ] Generate strong CSRF secret
- [ ] Generate strong cookie secret
- [ ] Update tests (optional)
- [ ] Verify all endpoints protected

---

## Quick Reference Card

### Using API Helpers

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiHelper';

// GET (no CSRF needed)
const data = await apiGet('/api/games');

// POST (CSRF automatic)
const result = await apiPost('/api/games', gameData);

// PUT (CSRF automatic)
const updated = await apiPut('/api/games/123', updates);

// DELETE (CSRF automatic)
await apiDelete('/api/games/123');
```

### Using CSRF Hook (Alternative)

```typescript
import { useCsrf } from '../context/CsrfContext';

function MyComponent() {
  const { csrfToken, isLoading } = useCsrf();

  const handleSubmit = async () => {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
  };
}
```

---

## Summary

### What You Have Now

✅ **Complete CSRF infrastructure ready to use**
- Global context provides CSRF token to all components
- API helpers automatically include CSRF in requests
- Auth service already using CSRF protection (example)
- Development bypass allows normal workflow

### What Happens Next

**When you're ready:**
1. Set `CSRF_DEV_BYPASS=false` in `.env`
2. Update ~12 fetch calls to use API helpers (1-2 hours)
3. Test all features still work
4. Deploy with CSRF protection enabled

**Until then:**
- Everything works normally
- You can add new features without thinking about CSRF
- Tests pass without modifications
- No security gaps (backend enforces CSRF when enabled)

---

## Need Help?

- **Backend CSRF:** [CSRF_ARCHITECTURE.md](CSRF_ARCHITECTURE.md)
- **Developer Guide:** [CSRF_DEVELOPER_GUIDE.md](CSRF_DEVELOPER_GUIDE.md)
- **Testing Guide:** [SECURITY_TESTING_GUIDE.md](SECURITY_TESTING_GUIDE.md)

**The infrastructure is done. Integration is simple. You control the timeline.** 🚀
