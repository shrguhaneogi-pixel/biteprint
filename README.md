```
 ____  _ _       ____       _       _   
| __ )(_) |_ ___|  _ \ _ __(_)_ __ | |_ 
|  _ \| | __/ _ \ |_) | '__| | '_ \| __|
| |_) | | ||  __/  __/| |  | | | | | |_ 
|____/|_|\__\___|_|   |_|  |_|_| |_|\__|
```

> **Scan Your Meal. Understand Your Impact. Improve One Bite at a Time.**

[![PromptWars Virtual - Challenge 3](https://img.shields.io/badge/PromptWars%20Virtual-Challenge%203-orange?style=flat-square)](https://github.com/shrguhaneogi-pixel/biteprint)
[![Challenge Category - Carbon Awareness](https://img.shields.io/badge/Category-Carbon%20Awareness-green?style=flat-square)](https://github.com/shrguhaneogi-pixel/biteprint)
[![Vercel Deployment](https://img.shields.io/badge/vercel-deployed-success?style=flat-square&logo=vercel&color=000000)](https://biteprint.vercel.app/)
[![Build Status](https://img.shields.io/github/actions/workflow/status/shrguhaneogi-pixel/biteprint/ci.yml?branch=main&style=flat-square)](https://github.com/shrguhaneogi-pixel/biteprint/actions)
[![Repo Size Constraint](https://img.shields.io/badge/repo_size-%3C%2010MB-blue?style=flat-square&color=2ea44f)](https://github.com/shrguhaneogi-pixel/biteprint)
[![Architecture Paradigm](https://img.shields.io/badge/arch-event--driven-blueviolet?style=flat-square)](https://github.com/shrguhaneogi-pixel/biteprint)

---

## 🚀 The Problem it Solves

Daily food choices are among the single largest contributors to an individual's carbon footprint. However, understanding dietary greenhouse gas emissions is currently a tedious process, relying on manual weight logs and complex lookup tables.

**BitePrint Coach** is the frictionless, high-impact solution to this problem. Users simply snap a photo of their meal. The system transiently parses the image in-memory, maps the ingredients against a peer-reviewed carbon dataset, and serves a clear **Environmental Nutrition Facts** label with low-impact food swaps in under 3 seconds. It eliminates manual input barriers, converting carbon awareness into a simple daily habit.

---

## ✨ Key Features

*   📸 **Frictionless Image Scanning**: Ephemeral photo upload powered by server-side image processing.
*   ✅ **Food Validation Checklist**: Interactive UI allowing users to refine detected ingredients to prevent AI hallucinations before scoring.
*   🏷️ **Environmental Nutrition Facts Label**: High-fidelity UI breakdown rendering both Carbon Footprint (kg CO₂e) and Water Footprint (liters) metrics.
*   🔄 **Personalized Ingredient Swaps**: Automatically ranks and displays alternative foods (e.g., swapping Beef for Lentils) to maximize emissions reductions.
*   📊 **Local Carbon Analytics Dashboard**: Aggregates history logs and renders weekly/monthly emissions trends using lightweight, pure SVG sparklines.
*   🔒 **Zero-Knowledge Security**: Retains no user PII or raw image files on the server; data is stored strictly in the client's local IndexedDB.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies | Role / Implementation |
|---|---|---|
| **Frontend Framework** | **Next.js 16 (App Router)** & **React 19** | Dynamic SSR routes, code splitting, & lazy-loaded 3D elements. |
| **Styling** | **Tailwind CSS v4** | CSS-first token configuration and fluid OKLCH color palettes. |
| **Animations** | **Framer Motion v12+** & **Spline** | Interactive 3D home canvas and micro-interactions. |
| **DevOps & Hosting** | **Vercel** | Edge CDN routing and Serverless API runtime. |
| **CI / CD Pipeline** | **GitHub Actions** | Automated type-checking, linter validation, and test gates. |
| **Image Handler** | **Sharp** | Ephemeral, server-side magic-byte sniffing and metadata stripping. |
| **Core Database** | **IndexedDB** & **Local Storage** | Zero backend data retention; logs stored client-side only. |
| **DB Integration Stack**| **Neon Serverless Postgres** | Ultimate target database for global dashboard syncing. |

### 🔒 Security by Design
The server parses upload streams strictly inside transient RAM buffers. EXIF metadata is immediately stripped by Sharp to prevent telemetry leakage, and Zod enforces strict request structures. No temp files are written to disk.

### ⚡ Performance & Efficiency
The carbon scorer and swap engine execute as pure, deterministic functions referencing a bundled `< 100 KB` JSON dataset. Lightweight SVG-only charting keeps bundle transfers low, ensuring the application remains under **1.6 MB** total repository size.

---

## 🧪 Testing

BitePrint Coach implements a robust, double-gated testing stack (Vitest for unit isolation, Playwright for E2E integrations).

### Run Unit & Integration Suite
Vitest runs 69 unit tests verifying validation criteria, recommendation algorithms, carbon aggregation, and analytics metrics:
```bash
npm run test
```

### Run End-to-End Tests
Playwright simulates landing on the home page, uploading photos, submitting validated checklists, rendering environmental labels, and synchronizing with the history dashboard:
```bash
npx playwright test
```

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
