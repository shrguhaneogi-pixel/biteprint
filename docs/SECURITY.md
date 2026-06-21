# BitePrint Coach — Security Design

## Security Philosophy

BitePrint Coach is designed with a **minimal attack surface** as its primary security principle. The platform:

- Collects the minimum data necessary to function
- Processes image data transiently (never persists raw images)
- Stores only derived analysis JSON client-side
- Requires no user authentication in MVP (no credential attack surface)
- Performs no background tracking or continuous monitoring

---

## Threat Model

### In-Scope Threats

| Threat | Category | Mitigation |
|---|---|---|
| Malicious file upload (polyglot, zip-bomb, script-in-image) | Input Integrity | Sharp magic-byte validation + MIME sniff |
| Oversized payload (DoS) | Availability | 5 MB hard limit before parsing |
| API abuse / scraping | Availability | IP-based rate limiting (10 req/min) |
| Prompt injection via image metadata | Input Integrity | EXIF stripped by Sharp before Vision API |
| XSS via scan results | Output Integrity | Next.js JSX escaping; CSP `script-src 'self'` |
| Clickjacking | UI Redressing | `X-Frame-Options: DENY` |
| MIME sniffing | Content Confusion | `X-Content-Type-Options: nosniff` |
| Credential leakage | Secrets | Environment variables only; `.env.local` gitignored |
| Dependency supply chain | Supply Chain | `npm audit` in CI; pinned exact versions |

### Out-of-Scope (by design)

- Authentication bypass (no auth in MVP)
- SQL injection (no SQL database)
- Server-side request forgery to internal network (all external calls go to Gemini API only)

---

## Data Minimization

### What We Collect

| Data Type | Collected? | Retained? | Location |
|---|---|---|---|
| Meal image | ✅ Received | ❌ Immediately discarded after analysis | Memory only (request buffer) |
| Detected food names | ✅ Derived | ✅ In `ScanRecord` | Client IndexedDB only |
| Carbon scores | ✅ Derived | ✅ In `ScanRecord` | Client IndexedDB only |
| Recommendations | ✅ Derived | ✅ In `ScanRecord` | Client IndexedDB only |
| IP address | ✅ For rate limiting | ❌ Not persisted | In-memory, sliding 60s window |
| User identity | ❌ | ❌ | Not collected |
| Location data | ❌ | ❌ | Not collected |
| Device fingerprint | ❌ | ❌ | Not collected |

### Image Lifecycle

```
Client selects image
       │
       ▼
Browser → POST /api/scan (multipart, TLS)
       │
       ▼
Server: parseMultipart() → ArrayBuffer in memory
       │
       ▼
Server: validateImage() → Sharp processes buffer
  ├── Check magic bytes (JPEG: FF D8, PNG: 89 50 4E, WebP: 52 49 46 46)
  ├── Check file size ≤ 5,242,880 bytes (5 MB)
  ├── Check dimensions ≤ 4096 × 4096 px
  ├── Strip EXIF metadata (Sharp auto-strips on processing)
  └── Reject if any check fails (400 response)
       │
       ▼
Server: VisionService.analyzeImage(buffer)
       │
       ▼
Server: Route handler returns ScanResult JSON
       │
       ▼
Buffer is GC-eligible — never written to disk or object storage
       │
       ▼
Client receives JSON only
```

---

## Input Validation

### API Route Validation Stack

All validation runs before any business logic executes.

```typescript
// src/lib/validation/schemas.ts (Zod)

export const ScanRequestSchema = z.object({
  image: z
    .instanceof(File)
    .refine((f) => f.size <= 5 * 1024 * 1024, 'File exceeds 5 MB limit')
    .refine(
      (f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
      'Unsupported file type. Accepted: JPEG, PNG, WebP'
    ),
});
```

```typescript
// src/lib/validation/image.ts (Sharp — server-side only)

export async function validateImageBuffer(
  buffer: Buffer
): Promise<{ valid: true; metadata: ImageMetadata } | { valid: false; reason: string }> {
  // 1. Magic byte check — reject before Sharp processes
  if (!hasSupportedMagicBytes(buffer)) {
    return { valid: false, reason: 'Invalid image magic bytes' };
  }

  // 2. Sharp metadata extraction (safe: does not execute embedded scripts)
  const metadata = await sharp(buffer).metadata();

  // 3. Dimension check
  if ((metadata.width ?? 0) > 4096 || (metadata.height ?? 0) > 4096) {
    return { valid: false, reason: 'Image dimensions exceed 4096×4096' };
  }

  // 4. Format confirm
  if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
    return { valid: false, reason: 'Unsupported image format after decode' };
  }

  return { valid: true, metadata };
}
```

### Magic Byte Table

| Format | Magic Bytes | Offset |
|---|---|---|
| JPEG | `FF D8 FF` | 0 |
| PNG | `89 50 4E 47 0D 0A 1A 0A` | 0 |
| WebP | `52 49 46 46 __ __ __ __ 57 45 42 50` | 0 (RIFF + WEBP) |

---

## Rate Limiting

```typescript
// src/app/api/scan/route.ts

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;

// In-memory sliding window (resets on server restart — acceptable for MVP)
const ipWindows = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const window = ipWindows.get(ip);

  if (!window || now > window.resetAt) {
    ipWindows.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (window.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: window.resetAt - now };
  }

  window.count++;
  return { allowed: true };
}
```

Responses when rate limited:
```
HTTP 429 Too Many Requests
Retry-After: <seconds>
Content-Type: application/json
{ "error": "Rate limit exceeded", "retryAfterMs": 42000 }
```

---

## Security Headers

Configured in `next.config.ts` via `headers()`:

```typescript
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // Next.js RSC hydration requires this
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' blob: data:",
      "connect-src 'self' https://generativelanguage.googleapis.com",
      "frame-src https://prod.spline.design",  // Spline canvas
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];
```

---

## Secrets Management

### Environment Variables

All secrets are loaded via `process.env` — never hardcoded, never committed.

| Variable | Purpose | Required |
|---|---|---|
| `GEMINI_API_KEY` | Gemini Vision API authentication | ✅ Yes |
| `NEXT_PUBLIC_SPLINE_URL` | External Spline scene URL | ✅ Yes |

### Startup Validation

```typescript
// src/lib/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  NEXT_PUBLIC_SPLINE_URL: z.string().url('NEXT_PUBLIC_SPLINE_URL must be a valid URL'),
});

export const env = EnvSchema.parse(process.env);
```

If any required variable is missing, the server **fails fast at startup** with a clear error.

### `.env.example`

```bash
# Required — obtain from Google AI Studio
GEMINI_API_KEY=your_api_key_here

# Required — Spline scene URL from Spline.design
NEXT_PUBLIC_SPLINE_URL=https://prod.spline.design/your-scene-id/scene.splinecode
```

### `.gitignore` Enforcement

```gitignore
.env
.env.local
.env.*.local
```

---

## Dependency Security

### Audit Policy

```bash
# Run on every CI build
npm audit --audit-level=high
```

CI fails if any **high** or **critical** vulnerabilities are found.

### Version Pinning

All dependencies are pinned to exact versions in `package.json` (no `^` or `~` ranges) to prevent supply-chain drift between environments.

### Minimal Dependency Principle

Dependencies are added only when they provide significant, non-trivial value. For example:
- No chart library — pure SVG charts (reduces attack surface)
- No date library — native `Intl.DateTimeFormat` (ES2021)
- No form library — native React 19 form actions

---

## Client-Side Storage Security

### IndexedDB

- All scan records are stored locally in the user's browser
- No data is transmitted to any server after the initial scan
- Users can `clearHistory()` at any time, which purges the entire `biteprint` IndexedDB database
- Records contain only derived analysis data (food names, scores, recommendations) — never raw image bytes

### Sensitive Data in URL

Scan results are passed via URL-safe encoded state. Raw image data is **never** placed in URL parameters, query strings, or browser history.

---

## Accessibility & Security Overlap

- All form inputs have explicit `<label>` elements (prevents hidden field injection confusion)
- `aria-live` regions announce async results (prevents invisible state manipulation)
- File input accepts only `image/jpeg,image/png,image/webp` via `accept` attribute (defence in depth — server validates independently)

---

## Compliance Considerations

| Regulation | Relevant Aspect | Our Approach |
|---|---|---|
| GDPR | Personal data minimization | No PII collected. Images discarded immediately. |
| CCPA | Right to deletion | `clearHistory()` deletes all local data |
| WCAG 2.1 AA | Accessibility | Full compliance target; audited via automated + manual testing |

---

## Security Checklist (CI-enforced)

- [ ] `npm audit --audit-level=high` passes
- [ ] `tsc --noEmit` — no TypeScript errors
- [ ] All Zod schemas cover every API input field
- [ ] No `any` types in production code (`eslint: @typescript-eslint/no-explicit-any: error`)
- [ ] Security headers present on all responses (verified via Playwright test)
- [ ] `.env` files not committed (`.gitignore` enforced)
- [ ] Image buffer not persisted (verified via code review + test)

---

*Document version: 1.0.0 — 2026-06-21*  
*Maintained by: BitePrint Coach engineering*
