# BitePrint Coach — Quality Gate Report

This report documents the CI/CD pipeline configuration, quality gate requirements, release checklist, and build-blocker parameters designed to keep the BitePrint Coach codebase robust, secure, and production-ready.

---

## 1. CI/CD Pipeline Workflow

The GitHub Actions workflow is defined in `.github/workflows/ci.yml` and triggers on every pull request to `main` and pushes to `main` and `develop`.

```
[Developer Push / PR]
        │
        ├──► Job 1: Lint & Type Check (eslint flat-config + tsc strict compilation)
        │
        ├──► Job 2: Unit & Component Tests (vitest runs 69 unit tests)
        │
        ├──► Job 3: Next.js Production Build (turbopack optimizes routes & static assets)
        │
        ├──► Job 4: Repository Size Check (fails if total codebase size exceeds 10 MB limit)
        │
        └──► Job 5: Security Audit (fails on high/critical dependency vulnerabilities)
```

---

## 2. Deployment Quality Gates

Before any branch is merged into `main` or deployed to production, it must successfully pass the following validation gates:

| Quality Gate | Tooling / Commands | Pass Criteria | Status |
|---|---|---|---|
| **Type Check** | `tsc --noEmit` | 0 errors | **PASSED** |
| **Code Style Lint** | `eslint . --max-warnings 0` | 0 warnings, 0 errors | **PASSED** |
| **Unit Testing** | `vitest run` | 100% tests pass (69/69 tests) | **PASSED** |
| **Build Integrity** | `next build` | Successful route & asset output | **PASSED** |
| **Size Constraint** | `du -sh --exclude=node_modules` | Codebase size <= 10 MB (current: 1.6 MB) | **PASSED** |
| **E2E Integration** | `playwright test` | 100% flow completion (4/4 tests) | **PASSED** |
| **Security Audit** | `npm audit --audit-level=high` | 0 high or critical vulnerabilities | **PASSED** |

---

## 3. Deployment Blockers

A build promotion or PR merge is **automatically blocked** and marked failed if any of the following occur:
- **Failed Test**: Any single unit, component, or E2E integration test fails.
- **Compilation/Syntax Error**: Any syntax error or Next.js page generation error.
- **Strict Type Violation**: Any type mismatch (e.g., use of prohibited `any` type or undeclared interfaces).
- **Security Vulnerability**: Any dependency vulnerability marked `high` or `critical` by the security scanner.
- **Size Excess**: Any commit that causes the workspace size to exceed the strict 10 MB limit.

---

## 4. Production Release Checklist

Before marking a release candidate as approved for deployment on Vercel:

- [ ] All CI jobs in GitHub Actions show green.
- [ ] TypeScript compilation check completes with 0 errors.
- [ ] Vitest unit test suite (69 tests) passes.
- [ ] Playwright E2E tests (4 test workflows) pass in headless browsers.
- [ ] Codebase size is verified to be under 10 MB.
- [ ] No high/critical dependencies vulnerabilities exist.
- [ ] Lighthouse or PageSpeed accessibility audits confirm a score of >= 95.
- [ ] The `GEMINI_API_KEY` and `NEXT_PUBLIC_SPLINE_URL` environment variables are correctly configured in Vercel project settings.
