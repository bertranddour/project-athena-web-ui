# Security Audit Report
**Project:** Project Athena Web UI
**Date:** 2025-11-17
**Auditor:** Claude Code
**Branch:** main (api-integration)

---

## Executive Summary

This security audit examined the Next.js 16 chat interface for Anthropic Claude agents. The application demonstrates **good security practices overall**, with proper authentication, input validation, and content sanitization. However, several **medium to high-priority vulnerabilities** were identified that require immediate attention.

### Overall Risk Rating: **MEDIUM**

---

## Critical Findings

### 1. ⚠️ HIGH: Dependency Vulnerability - Playwright
**Severity:** HIGH
**Location:** `package.json` (transitive dependency via Next.js)
**CVE:** GHSA-7mvr-c777-76hp

**Issue:**
```
Playwright <1.55.1 downloads and installs browsers without verifying SSL certificates
Current version: 1.52.0 (via @playwright/test)
```

**Impact:**
- Man-in-the-middle attacks during browser downloads
- Potential for malicious browser injection

**Recommendation:**
```bash
pnpm update @playwright/test@latest
# Or add to package.json overrides:
"overrides": {
  "playwright": ">=1.55.1"
}
```

**Priority:** Immediate - Update before production deployment

---

### 2. ⚠️ HIGH: Missing API Key Validation
**Severity:** HIGH
**Location:** `lib/api/client.ts:10-14`

**Issue:**
```typescript
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

if (!API_KEY) {
  console.warn("NEXT_PUBLIC_API_KEY is not set. API requests may fail.");
}
```

**Problems:**
1. Non-null assertion (`!`) used despite checking for missing key
2. Application continues without API key (warning only)
3. API key exposed in client-side bundle (`NEXT_PUBLIC_` prefix)

**Impact:**
- API requests may fail silently
- Potential for unauthorized API access if backend doesn't validate
- Client-side API key exposure

**Recommendation:**
```typescript
// lib/api/client.ts
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

if (!API_KEY) {
  throw new Error(
    "NEXT_PUBLIC_API_KEY is required. Please configure it in .env.local"
  );
}

// Better: Move API key to server-side only
// Use Next.js Server Actions or API routes as middleware
```

**Priority:** High - Fix before production

---

### 3. ⚠️ MEDIUM: Exposed API Key in Client Bundle
**Severity:** MEDIUM
**Location:** `lib/api/client.ts`, `.env.example`

**Issue:**
API keys using `NEXT_PUBLIC_` prefix are embedded in the client-side JavaScript bundle and visible to anyone inspecting the code.

**Impact:**
- API keys can be extracted from browser DevTools
- Potential for API key theft and misuse
- Quota exhaustion attacks

**Current Implementation:**
```typescript
// lib/api/client.ts:10
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

// Used in client-side requests
headers["X-API-Key"] = API_KEY;
```

**Recommendation:**

**Option A: Server-Side Proxy (Recommended)**
```typescript
// app/api/athena/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.ATHENA_API_KEY; // Server-side only

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const body = await request.json();
  const path = params.path.join('/');

  const response = await fetch(`${process.env.API_URL}/v1/${path}`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return NextResponse.json(await response.json());
}
```

**Option B: Stack Auth Session Tokens**
Use Stack Auth's session management instead of API keys:
```typescript
// Use Stack Auth access tokens for authentication
const { accessToken } = await stackServerApp.getUser();
headers["Authorization"] = `Bearer ${accessToken}`;
```

**Priority:** High - Critical for production

---

### 4. ⚠️ MEDIUM: Missing Security Headers
**Severity:** MEDIUM
**Location:** `next.config.mjs`, `app/layout.tsx`

**Issue:**
No Content Security Policy (CSP), X-Frame-Options, or other security headers configured.

**Impact:**
- XSS attacks (mitigated by React, but defense-in-depth missing)
- Clickjacking vulnerabilities
- MIME-type sniffing attacks

**Recommendation:**
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-eval
              "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' http://localhost:8000",
              "frame-ancestors 'none'",
            ].join('; ')
          }
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Priority:** Medium - Important for production

---

### 5. ⚠️ MEDIUM: Insufficient Input Validation
**Severity:** MEDIUM
**Location:** Multiple files

**Issue:**
Limited validation on user inputs and API responses.

**Specific Concerns:**

**File Upload Validation** (`hooks/use-file-upload.tsx:47-80`):
```typescript
// Only checks MIME type - could be spoofed
const validFiles = fileArray.filter((file) =>
  SUPPORTED_FILE_TYPES.includes(file.type)
);
```

**Missing Checks:**
- File size limits (potential DoS via large files)
- File content validation (magic number verification)
- Filename sanitization

**SSE Parsing** (`lib/sse-stream.ts:44-52`):
```typescript
try {
  const data = JSON.parse(currentData);
  yield { event: currentEvent, data };
} catch (e) {
  console.error("Failed to parse SSE data:", currentData, e);
}
```

**Problems:**
- Silent failure on parse errors
- No schema validation on parsed data
- Potential for injection if data contains unexpected types

**Recommendation:**
```typescript
// Add Zod schema validation
import { z } from 'zod';

const FileSchema = z.object({
  type: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']),
  size: z.number().max(10 * 1024 * 1024), // 10MB limit
  name: z.string().regex(/^[\w\-. ]+$/), // Sanitize filename
});

const SSEEventSchema = z.object({
  event: z.string(),
  data: z.record(z.unknown()),
});

// Use in validation
const validated = FileSchema.safeParse(file);
if (!validated.success) {
  throw new Error('Invalid file');
}
```

**File Size Limits:**
```typescript
// hooks/use-file-upload.tsx
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validFiles = fileArray.filter((file) => {
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    toast.error(`Unsupported file type: ${file.type}`);
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    toast.error(`File too large: ${file.name} (max 10MB)`);
    return false;
  }
  return true;
});
```

**Priority:** Medium - Add validation before production

---

### 6. ⚠️ LOW: localStorage API Key Storage
**Severity:** LOW
**Location:** `lib/api-key.tsx:1-10`

**Issue:**
```typescript
export function getApiKey(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("lg:chat:apiKey") ?? null;
  } catch {
    // no-op
  }
  return null;
}
```

**Note:** This appears to be legacy code from the LangGraph implementation and may not be actively used with the new Stack Auth integration.

**Impact:**
- XSS attacks can access localStorage
- Keys persist across sessions
- No encryption at rest

**Recommendation:**
- Remove if unused (verify no references)
- If needed, use httpOnly cookies via Server Actions
- Never store sensitive tokens in localStorage

**Priority:** Low - Verify if still needed

---

## Security Strengths

### ✅ Authentication & Authorization
**Stack Auth Integration** (`stack/client.tsx`, `stack/server.tsx`):
- Proper separation of client and server auth
- Cookie-based token storage (httpOnly recommended)
- User authentication required before API access
- Redirect to sign-in for unauthenticated users

**Implementation:**
```typescript
// providers/Stream.tsx:72-78
useEffect(() => {
  if (user === null) {
    router.push("/handler/sign-in");
  }
}, [user, router]);
```

**Strengths:**
- Centralized auth provider
- Automatic redirect for unauthorized access
- User ID passed to API for authorization

---

### ✅ XSS Protection
**Markdown Rendering** (`components/thread/markdown-text.tsx:249-261`):
- Uses `react-markdown` (safe by default)
- No `dangerouslySetInnerHTML` found in codebase
- Custom component overrides maintain safety

**Content Rendering:**
```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}
  rehypePlugins={[rehypeKatex]}
  components={defaultComponents}
>
  {children}
</ReactMarkdown>
```

**Strengths:**
- Automatic HTML escaping
- Safe rendering of user content
- KaTeX properly configured for math rendering

---

### ✅ File Upload Security
**Type Validation** (`lib/multimodal-utils.ts:8-21`):
```typescript
const supportedFileTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf"
];

if (!supportedFileTypes.includes(file.type)) {
  toast.error(`Unsupported file type: ${file.type}`);
  return Promise.reject(new Error(`Unsupported file type`));
}
```

**Duplicate Prevention** (`hooks/use-file-upload.tsx:27-44`):
```typescript
const isDuplicate = (file: File, blocks: ContentBlock[]) => {
  // Prevents duplicate uploads by checking name and type
  return blocks.some(b =>
    b.metadata?.filename === file.name &&
    b.mimeType === file.type
  );
};
```

**Strengths:**
- Whitelist-based file type validation
- Base64 encoding for safe transmission
- User feedback on invalid uploads

**Improvement Needed:**
- Add file size limits
- Validate file magic numbers (not just MIME type)

---

### ✅ Environment Configuration
**Proper Separation** (`.env.example`, `.gitignore`):
```bash
# .gitignore
.env
.env.local
*.local
```

**Strengths:**
- `.env` files excluded from git
- Example configuration provided
- Clear documentation in CLAUDE.md

**Areas for Improvement:**
- Move API keys to server-side
- Add runtime validation for required env vars

---

### ✅ Error Handling
**API Client** (`lib/api/client.ts:47-62`):
```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({
    error: "unknown_error",
    message: response.statusText,
  }));

  console.error("API request failed:", {
    endpoint,
    status: response.status,
    statusText: response.statusText,
    errorData,
  });

  throw new Error(errorData.message || errorData.detail || "API request failed");
}
```

**Strengths:**
- Detailed error logging
- Graceful fallback for unparseable errors
- User-friendly error messages

**Improvement:**
- Sanitize error messages to avoid information disclosure
- Implement error tracking service (Sentry, etc.)

---

## Recommendations by Priority

### Immediate (Before Production)
1. **Update Playwright** to v1.55.1+ to fix SSL vulnerability
2. **Move API key to server-side** via Next.js API routes or Server Actions
3. **Add proper API key validation** with startup checks
4. **Implement security headers** in `next.config.mjs`

### High Priority (This Sprint)
5. **Add input validation with Zod schemas** for all API inputs
6. **Implement file size limits** (10MB recommended)
7. **Add rate limiting** on API routes
8. **Set up error monitoring** (Sentry/LogRocket)

### Medium Priority (Next Sprint)
9. **Add Content Security Policy** tuned for your stack
10. **Implement request logging** for security auditing
11. **Add CSRF protection** for state-changing operations
12. **Review and remove** unused legacy code (`lib/api-key.tsx`)

### Low Priority (Backlog)
13. **Add automated security scanning** to CI/CD pipeline
14. **Implement file content validation** (magic number checks)
15. **Add penetration testing** before major releases
16. **Document security practices** in SECURITY.md

---

## Compliance Considerations

### GDPR / Privacy
- ✅ User data encrypted in transit (HTTPS)
- ⚠️ Need data retention policy documentation
- ⚠️ Add privacy policy and terms of service
- ⚠️ Implement user data export/deletion APIs

### OWASP Top 10 Coverage
- ✅ A01:2021 - Broken Access Control: Stack Auth handles this
- ✅ A03:2021 - Injection: React prevents most injection attacks
- ⚠️ A05:2021 - Security Misconfiguration: Missing security headers
- ⚠️ A06:2021 - Vulnerable Components: Playwright vulnerability
- ✅ A07:2021 - XSS: react-markdown provides protection
- ⚠️ A08:2021 - Insecure Design: API key in client bundle

---

## Testing Recommendations

### Security Testing Checklist
```bash
# 1. Dependency scanning
pnpm audit
pnpm audit --audit-level=moderate

# 2. Static analysis
pnpm lint
pnpm type-check

# 3. Bundle analysis
ANALYZE=true pnpm build

# 4. Runtime security
# - Test file upload with oversized files
# - Test file upload with invalid MIME types
# - Verify authentication redirects
# - Test SSE error handling
# - Verify API key is required

# 5. Penetration testing (recommended)
# - OWASP ZAP scan
# - Burp Suite professional testing
```

### Automated Security Testing
```yaml
# .github/workflows/security.yml
name: Security Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm audit --audit-level=moderate
      - run: pnpm lint
```

---

## Additional Security Resources

### Next.js Security Best Practices
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

### Authentication
- [Stack Auth Documentation](https://docs.stack-auth.com/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### General Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)

---

## Conclusion

The Project Athena Web UI demonstrates **solid security fundamentals** with proper authentication, XSS protection, and input handling. The main concerns are:

1. **Playwright vulnerability** (HIGH) - Easy fix, high impact
2. **Client-side API key exposure** (HIGH) - Requires architectural change
3. **Missing security headers** (MEDIUM) - Quick configuration fix

With the recommended fixes applied, this application will have **strong security posture** suitable for production deployment.

### Next Steps
1. Create GitHub issues for each HIGH priority item
2. Schedule security review meeting
3. Implement fixes in priority order
4. Re-audit after fixes are applied
5. Set up automated security scanning in CI/CD

---

**Report Generated:** 2025-11-17
**Auditor:** Claude Code (Anthropic)
**Review Status:** Complete
**Follow-up Date:** After implementing HIGH priority fixes
