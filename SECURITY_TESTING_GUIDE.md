# Security Headers Testing Guide

This guide shows you how to test the security headers implementation in practice.

## Method 1: Browser DevTools (Easiest)

### Step 1: Start Your Application
```bash
# Terminal 1 - Start the server
cd server
npm run dev

# Terminal 2 - Start the client
cd client
npm run dev
```

### Step 2: Open Browser DevTools
1. Open your application in Chrome/Firefox (e.g., http://localhost:5173)
2. Press `F12` to open DevTools
3. Go to the **Network** tab
4. Refresh the page (`Ctrl+R` or `Cmd+R`)

### Step 3: Inspect Security Headers
1. Click on any request to your API (e.g., `/api/games`)
2. Scroll down to **Response Headers** section
3. You should see these security headers:

**Expected Headers:**
```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ...
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
x-api-version: 1.0
x-security-headers: enabled
permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), ...
```

**Headers that should NOT be present:**
```
x-powered-by: Express  ❌ (This should be removed for security)
```

---

## Method 2: Using cURL (Command Line)

Open a terminal and run:

```bash
# Basic test - View all headers
curl -I http://localhost:3000/api/games

# Detailed test - Show all response headers
curl -v http://localhost:3000/api/games

# Test specific security header
curl -I http://localhost:3000/api/games | grep -i "content-security-policy"
curl -I http://localhost:3000/api/games | grep -i "x-frame-options"
curl -I http://localhost:3000/api/games | grep -i "x-content-type-options"
```

**Expected Output:**
```
HTTP/1.1 200 OK
content-security-policy: default-src 'self'; ...
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
x-api-version: 1.0
x-security-headers: enabled
permissions-policy: camera=(), microphone=(), ...
```

---

## Method 3: Using Postman

1. Open Postman
2. Create a new GET request to: `http://localhost:3000/api/games`
3. Click **Send**
4. Scroll down to the **Headers** tab in the response
5. Verify all security headers are present

---

## Method 4: Online Security Scanner

### Option A: SecurityHeaders.com (Recommended)
1. Deploy your application to a public URL (or use ngrok for local testing)
2. Visit: https://securityheaders.com
3. Enter your URL and click "Scan"
4. You should get an **A** or **A+** rating

### Option B: Using ngrok for Local Testing
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Test with SecurityHeaders.com using that URL
```

---

## Method 5: Testing CSP Violations

### Test that CSP is blocking unsafe scripts:

1. Open your browser DevTools Console
2. While on your application, try running:
```javascript
// This should be blocked by CSP
eval('console.log("test")');  // Should fail in production

// This should also be blocked
const script = document.createElement('script');
script.src = 'https://evil-site.com/malicious.js';
document.body.appendChild(script);  // Should be blocked
```

3. Check the **Console** tab - you should see CSP violation warnings:
```
Refused to execute inline script because it violates the following Content Security Policy directive: ...
```

---

## Method 6: Testing CORS Security

### Test 1: Allowed Origin (Should Work)
```bash
curl -H "Origin: http://localhost:5173" \
     -H "Cookie: sessionid=abc123" \
     -v http://localhost:3000/api/games
```
**Expected:** Request succeeds (200 OK)

### Test 2: Malicious Origin (Should Be Blocked)
```bash
curl -H "Origin: http://malicious-site.com" \
     -H "Cookie: sessionid=abc123" \
     -v http://localhost:3000/api/games
```
**Expected:** Request blocked (403 Forbidden) with message:
```json
{
  "success": false,
  "message": "Cross-origin requests with credentials not allowed from this origin"
}
```

**Check Server Logs:** You should see:
```
[SECURITY] Suspicious CORS request from origin: http://malicious-site.com
[SECURITY] Blocked cross-origin request with credentials from: http://malicious-site.com
```

---

## Method 7: Testing Security Logging

The security middleware logs suspicious patterns. Test it:

### Test XSS Pattern Detection:
```bash
curl "http://localhost:3000/api/games?search=<script>alert('xss')</script>"
```

**Check Server Logs:** You should see:
```
[SECURITY] Suspicious pattern detected in request: {
  ip: '::1',
  url: '/api/games?search=<script>alert(\'xss\')</script>',
  method: 'GET',
  pattern: /<script/i,
  userAgent: 'curl/...'
}
```

### Test SQL Injection Pattern Detection:
```bash
curl "http://localhost:3000/api/games?search=' UNION SELECT * FROM users--"
```

**Check Server Logs:** You should see warnings about SQL injection patterns.

### Test MongoDB Injection Pattern Detection:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": {"$ne": null}, "password": {"$ne": null}}'
```

**Check Server Logs:** You should see warnings about MongoDB injection patterns.

---

## Method 8: Automated Testing with Jest

Run the comprehensive test suite:

```bash
cd server
npm test -- src/__tests__/middleware/securityHeaders.test.ts
```

**Expected Output:**
```
PASS src/__tests__/middleware/securityHeaders.test.ts
  ✓ All 28 tests should pass

Test Suites: 1 passed
Tests:       28 passed
```

---

## Quick Verification Checklist

Run these quick checks to verify everything works:

### ✅ Check 1: Headers Present
```bash
curl -I http://localhost:3000/api/games | grep -E "(content-security-policy|x-frame-options|x-content-type-options)"
```

### ✅ Check 2: X-Powered-By Removed
```bash
curl -I http://localhost:3000/api/games | grep -i "x-powered-by"
# Should return nothing (header removed)
```

### ✅ Check 3: Custom Headers Added
```bash
curl -I http://localhost:3000/api/games | grep -E "(x-api-version|x-security-headers|permissions-policy)"
```

### ✅ Check 4: CORS Protection Working
```bash
# Should be blocked (403)
curl -H "Origin: http://evil.com" -H "Cookie: test=123" http://localhost:3000/api/games
```

### ✅ Check 5: Security Logging Working
```bash
# Check server logs for security warnings
curl "http://localhost:3000/api/games?test=<script>alert(1)</script>"
# Then check your server terminal for [SECURITY] warnings
```

---

## Production Testing

When deploying to production:

1. **Environment Variables:** Ensure `.env` has production values:
   ```env
   NODE_ENV=production
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

2. **HSTS Header:** In production, HSTS should be enabled:
   ```bash
   curl -I https://yourdomain.com/api/games | grep "strict-transport-security"
   # Should show: strict-transport-security: max-age=31536000; includeSubDomains; preload
   ```

3. **CSP Strictness:** Production CSP should NOT allow 'unsafe-inline' or 'unsafe-eval'

---

## Troubleshooting

### Issue: Headers not appearing
**Solution:** Check that security middleware is applied BEFORE other middleware in [server.ts](server/src/server.ts)

### Issue: CSP blocking legitimate resources
**Solution:** Update CSP directives in [cspConfig.ts](server/src/config/cspConfig.ts) to whitelist specific domains

### Issue: CORS errors in development
**Solution:** Add your frontend URL to `ALLOWED_ORIGINS` in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

---

## Next Steps

Once you've verified security headers work, you can implement the remaining security features:

1. ✅ **Security Headers + CSP** (Complete)
2. ⏳ **Input Validation & Sanitisation**
3. ⏳ **Rate Limiting & Anti-Brute Force**
4. ⏳ **JWT Token Security Enhancements**
5. ⏳ **CSRF Protection**

---

## Additional Resources

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [SecurityHeaders.com Scanner](https://securityheaders.com/)
