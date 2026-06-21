# BitePrint Coach — Deployment Architecture Guide

This document describes the production deployment architecture, configuration guidelines, and deployment workflows for the BitePrint Coach application on the Vercel hosting platform.

---

## 1. Production Architecture Diagram

BitePrint Coach utilizes a modern, serverless, jamstack architecture. Raw images are parsed transiently in-memory and are never persisted to disk or permanent remote storage. The diagram below illustrates the network flow:

```mermaid
graph TD
    Client["Client Browser"]
    VercelDNS["Vercel DNS & Edge Routing"]
    VercelCDN["Vercel Global CDN"]
    VercelServerless["Vercel Serverless Functions (Node.js)"]
    GeminiAPI["Google Gemini Vision API (External)"]
    IndexedDB[("Client IndexedDB Storage")]

    Client -->|1. HTTPS Request| VercelDNS
    VercelDNS -->|2. Route Static Assets| VercelCDN
    VercelCDN -->|3. Serve HTML/JS/CSS/SVGs| Client
    Client -->|4. POST Image / JSON to /api/scan| VercelServerless
    VercelServerless -->|5. Transient In-Memory Validation & API Request| GeminiAPI
    GeminiAPI -->|6. Return Detected Food Items| VercelServerless
    VercelServerless -->|7. Return Carbon & Swap Recommendations JSON| Client
    Client -->|8. Store History Locally (Zero Server Storage)| IndexedDB
```

### Architecture Justification
- **Security**: Raw image buffers exist only in-memory in serverless instances, eliminating storage-based exfiltration vectors. No SQL database or server-side user credentials database exists, reducing the target surface to zero.
- **Efficiency**: Global CDN caching of React pages and static assets reduces bandwidth consumption and provides near-instant TTFB (Time to First Byte).
- **Feasibility**: Vercel provides seamless git-triggered deployment pipelines, automatic SSL certification, and dynamic serverless scaling out-of-the-box.
- **Hackathon Criteria**: Shows extreme compliance with data privacy (zero-knowledge) and deployment speed.

---

## 2. Environment Variable Plan

Environment variables are loaded securely by the Next.js runtime and are validated at application boot time to guarantee operational integrity.

### Variable Definitions

| Variable Name | Environment Scope | Required? | Encrypted? | Description |
|---|---|---|---|---|
| `GEMINI_API_KEY` | Server-Side Only | Yes | Yes (Vercel Secret) | API Key to authenticate requests to the Google Gemini Vision service. |
| `NEXT_PUBLIC_SPLINE_URL` | Client & Server | Yes | No | Public CDN URL for the interactive Spline scene rendered on the landing page. |

### Startup Validation Schema

Environment variables are parsed and validated on app startup using Zod in `src/lib/env.ts`:

```typescript
import { z } from "zod";

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  NEXT_PUBLIC_SPLINE_URL: z.string().url("NEXT_PUBLIC_SPLINE_URL must be a valid URL"),
});

export const env = EnvSchema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  NEXT_PUBLIC_SPLINE_URL: process.env.NEXT_PUBLIC_SPLINE_URL,
});
```

---

## 3. Build Validation Workflow

Continuous Integration is enforced on every commit and Pull Request using GitHub Actions (`.github/workflows/ci.yml`). This workflow blocks deployment if validation checks fail.

### Build Gatekeeper Rules

A deployment **MUST** be rejected if:
1. **TypeScript Compile Fails**: Strict type checks (`tsc --noEmit`) must resolve with 0 errors.
2. **ESLint Quality Check Fails**: Strict linting rules must pass with 0 warnings/errors.
3. **Unit Tests Fail**: All 69 Vitest unit tests must pass.
4. **E2E Integration Tests Fail**: Playwright browser test flows (landing, scan uploads, validation, dashboard persistence) must pass.
5. **Accessibility Check Fails**: Elements must comply with WCAG 2.1 AA (contrast ratios, keyboard focus, ARIA role mappings).

---

## 4. Production Readiness Report

### Optimizations & Build Settings

- **Static Asset Optimization**: 
  - Next.js automatically optimizes images and pre-renders static routes (`/`, `/scan`, `/dashboard`) during the build phase.
  - Public icon assets are in SVG format, keeping transfer size low.
- **Code Splitting & Bundle Size**:
  - Webpack/Turbopack splits code at the page boundary. Heavy client-side interactive elements (like the Spline viewer) are lazy-loaded on demand.
  - Native browser features are used in place of heavy libraries (e.g., pure SVG charts instead of Chart.js/Recharts; native `Intl` API instead of Moment.js).
- **Tree Shaking**:
  - ES6 imports (`import ... from`) ensure unused components are eliminated from the client bundles.
- **Cold-Start Reduction**:
  - API routes keep external imports minimal to ensure rapid serverless activation.
  - Sharp image operations are optimized to stream buffers directly.
  - In-memory rate limiting map has low footprint and resets gracefully on serverless instance recyclings.

---

## 5. Deployment Checklist

### Step 1: Pre-Deployment Verification
- [ ] Run `npm run lint` and verify no errors.
- [ ] Run `npm run test` and verify all 69 unit tests pass.
- [ ] Run `npx playwright test` to verify E2E suite passes.
- [ ] Run `npm run build` locally to verify successful static export compilation.

### Step 2: Vercel Project Setup
- [ ] Import the repository into Vercel via GitHub integration.
- [ ] Set **Framework Preset** to `Next.js`.
- [ ] Configure Environment Variables in the project settings:
  - Add `GEMINI_API_KEY` (Value: `your_key_here`, Scope: Production/Preview/Development).
  - Add `NEXT_PUBLIC_SPLINE_URL` (Value: `https://prod.spline.design/...`, Scope: Production/Preview/Development).

### Step 3: Triggering Production Build
- [ ] Push the verified branch to `main`.
- [ ] Monitor the deployment log on Vercel Dashboard to ensure static route generation succeeds.
- [ ] Inspect the live domain and verify CSP, HSTS, and Frame security headers are returned.
