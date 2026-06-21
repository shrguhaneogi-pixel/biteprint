# BitePrint Coach — Architecture Reference

## Overview

BitePrint Coach follows a **four-layer, event-driven service architecture**. Each layer is:

- Defined by a typed TypeScript interface
- Independently instantiable and testable in isolation
- Free of circular dependencies
- Stateless where possible (analytics layer is the sole exception)

Processing occurs **only when a user submits a scan request**. There is no continuous monitoring, background polling, or always-on computation.

---

## System Flow

```
User uploads meal photo
         │
         ▼
┌─────────────────────┐
│   API Route Handler │  POST /api/scan
│   (Next.js RSC)     │  Validates → Pipes → Returns JSON
└────────┬────────────┘
         │ Buffer (never persisted)
         ▼
┌─────────────────────┐
│   Vision Layer      │  Identifies food items from image
└────────┬────────────┘
         │ DetectedFood[]
         ▼
┌─────────────────────┐
│   Carbon Layer      │  Maps foods → environmental metrics
└────────┬────────────┘
         │ CarbonResult
         ▼
┌─────────────────────┐
│   Recommendation    │  Generates actionable food swaps
│   Layer             │
└────────┬────────────┘
         │ Recommendation[]
         ▼
┌─────────────────────┐
│   API Response      │  ScanResult JSON → Client
└────────┬────────────┘
         │ (client-side only)
         ▼
┌─────────────────────┐
│   Analytics Layer   │  Stores ScanRecord → IndexedDB
└─────────────────────┘
```

---

## Layer 1 — Vision Layer

**Location:** `src/services/vision/`  
**Purpose:** Transform an image buffer into a structured list of detected food items.

### Interface

```typescript
// src/services/vision/types.ts

export interface DetectedFood {
  name: string;           // Canonical name e.g. "beef patty"
  confidence: number;     // 0.0 – 1.0
  portionGrams: number;   // Estimated grams, null if unknown
  rawLabel: string;       // Original label from vision model
}

export interface VisionResult {
  foods: DetectedFood[];
  modelVersion: string;
  processingMs: number;
}
```

### Interface Contract

```typescript
// src/services/vision/index.ts

export interface VisionService {
  analyzeImage(buffer: Buffer, mimeType: string): Promise<VisionResult>;
}
```

### Adapters

| Adapter | File | Notes |
|---|---|---|
| Gemini Vision | `gemini.ts` | Default. Uses `gemini-2.0-flash` with structured JSON prompt |

### Testability

Mock adapter provided for unit/integration tests:
```typescript
// tests/mocks/vision.ts
export const mockVisionService: VisionService = {
  analyzeImage: async () => ({
    foods: [{ name: 'beef patty', confidence: 0.95, portionGrams: 150, rawLabel: 'beef burger' }],
    modelVersion: 'mock-1.0',
    processingMs: 0,
  }),
};
```

---

## Layer 2 — Carbon Layer

**Location:** `src/services/carbon/`  
**Purpose:** Map detected foods to deterministic environmental impact metrics using the bundled carbon dataset.

> **Critical constraint:** Every CO₂e value, water footprint figure, and impact grade MUST originate from `data/carbon-dataset.json`. No values may be hardcoded or speculated.

### Dataset Schema

```typescript
// data/carbon-dataset.json (each entry)
{
  "id": "beef-cattle",
  "name": "Beef (cattle)",
  "aliases": ["beef", "beef patty", "ground beef", "steak", "burger"],
  "co2e_per_kg": 60.0,          // kg CO₂e per kg food (Poore & Nemecek)
  "water_liters_per_kg": 15400, // litres per kg (Water Footprint Network)
  "category": "beef",
  "impact_level": "high",
  "swaps": ["lentils", "black-beans", "chickpeas"],
  "source": "Poore & Nemecek (2018). Reducing food's environmental impacts. Science."
}
```

### Interface Contract

```typescript
// src/services/carbon/index.ts

export interface CarbonService {
  score(foods: DetectedFood[]): CarbonResult;
}
```

### Output Types

```typescript
// src/services/carbon/types.ts

export type ImpactLevel = 'low' | 'moderate' | 'high';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface FoodImpact {
  foodId: string;
  name: string;
  co2eKg: number;
  waterLiters: number;
  portionKg: number;
  impactLevel: ImpactLevel;
}

export interface CarbonResult {
  totalCo2eKg: number;
  totalWaterLiters: number;
  grade: Grade;
  impactLevel: ImpactLevel;
  primarySource: string;          // Highest-emission food name
  reductionPotentialPct: number;  // Best possible % reduction via swaps
  breakdown: FoodImpact[];
}
```

### Grading Scale

| Grade | Total CO₂e (meal) | Rationale |
|---|---|---|
| A | < 0.5 kg | Predominantly plant-based |
| B | 0.5 – 1.5 kg | Low-meat, mixed |
| C | 1.5 – 3.0 kg | Moderate meat |
| D | 3.0 – 5.0 kg | High meat content |
| F | > 5.0 kg | Heavy beef / lamb |

### Testability

`CarbonService.score()` is a **pure function** with no side effects. Tests provide `DetectedFood[]` arrays and assert exact `CarbonResult` values against the known dataset.

---

## Layer 3 — Recommendation Layer

**Location:** `src/services/recommendation/`  
**Purpose:** Generate ranked, actionable food swap recommendations derived solely from `carbon-dataset.json` swap references.

### Interface Contract

```typescript
// src/services/recommendation/index.ts

export interface RecommendationService {
  recommend(result: CarbonResult): Recommendation[];
}
```

### Output Types

```typescript
// src/services/recommendation/types.ts

export interface FoodSwap {
  fromFood: string;
  toFood: string;
  co2eSavedKg: number;
  waterSavedLiters: number;
  reductionPct: number;
}

export interface Recommendation {
  rank: number;
  swap: FoodSwap;
  coachingMessage: string;  // Human-readable, contextual advice
  monthlyProjectionKg: number; // If applied 3×/week for 4 weeks
}
```

### Engine Logic

1. For each food in `CarbonResult.breakdown` where `impactLevel !== 'low'`:
   - Look up `swaps[]` in carbon dataset
   - Calculate `reductionPct` = `(from.co2e - to.co2e) / from.co2e * 100`
2. Sort by `reductionPct` descending
3. Return top 3 recommendations
4. Generate coaching message from template strings (no AI call — deterministic)

### Testability

Pure function. Tests cover: no high-impact foods (empty result), all identical swaps, maximum reduction path.

---

## Layer 4 — Analytics Layer

**Location:** `src/services/analytics/`  
**Purpose:** Persist scan records client-side and aggregate trend data for the dashboard.

### Interface Contract

```typescript
// src/services/analytics/index.ts

export interface AnalyticsService {
  saveScan(record: ScanRecord): Promise<void>;
  getHistory(limit?: number): Promise<ScanRecord[]>;
  getTrends(period: 'week' | 'month'): Promise<TrendData>;
  clearHistory(): Promise<void>;
}
```

### Storage Model

```typescript
// src/services/analytics/types.ts

export interface ScanRecord {
  id: string;                  // UUID v4
  timestamp: number;           // Unix ms
  foods: DetectedFood[];
  carbonResult: CarbonResult;
  recommendations: Recommendation[];
}

export interface DailyTotal {
  date: string;                // ISO 8601 date
  totalCo2eKg: number;
  scanCount: number;
}

export interface TrendData {
  dailyTotals: DailyTotal[];
  periodCo2eKg: number;
  avgPerMealKg: number;
  bestDay: string;
  worstDay: string;
}
```

### Storage Backend

- **Client-side**: `IndexedDB` via `idb` wrapper library
- **Database name**: `biteprint`
- **Object store**: `scans` (keyPath: `id`, index on `timestamp`)
- **No server-side persistence in MVP**

### Testability

`getTrends()` is a pure aggregation over a `ScanRecord[]` array. The `idb` adapter is injected as a dependency for mocking in tests.

---

## API Route Contract

### `POST /api/scan`

**Request:**
```
Content-Type: multipart/form-data
Body: { image: File }
```

**Response (200):**
```typescript
interface ScanResponse {
  scanId: string;
  foods: DetectedFood[];
  carbonResult: CarbonResult;
  recommendations: Recommendation[];
  meta: {
    processingMs: number;
    visionModel: string;
    datasetVersion: string;
  };
}
```

**Error responses:**
| Code | Condition |
|---|---|
| 400 | Invalid/missing image, wrong MIME type, oversized |
| 429 | Rate limit exceeded (10 req/min per IP) |
| 500 | Vision API failure (retried once) |
| 503 | Vision API unavailable |

### `GET /api/health`

Returns `{ status: 'ok', timestamp: string }`. Used by CI and uptime monitoring.

---

## Security Controls (Summary)

Full details in `docs/SECURITY.md`.

| Control | Implementation |
|---|---|
| Input validation | Zod schemas on all API inputs |
| Image validation | Sharp: MIME sniff, magic bytes, max 5 MB, max 4096×4096 |
| Image disposal | Buffer never stored; GC'd after route handler completes |
| Rate limiting | 10 req/min per IP, in-memory sliding window |
| Security headers | `next.config.ts` — CSP, HSTS, X-Frame-Options |
| Secrets | `.env.local` only, validated at startup via Zod |

---

## Non-Functional Targets

| Metric | Target |
|---|---|
| Scan round-trip latency | < 3 seconds (p95) |
| Repo size | ≤ 10 MB (enforced in CI) |
| Test coverage (services) | ≥ 90% line coverage |
| Accessibility | WCAG 2.1 AA |
| Core Web Vitals (LCP) | < 2.5 s |
| TypeScript strict | `true` — no `any` allowed |

---

## Dependency Graph

```
page.tsx (scan)
  └── ImageUploader
        └── useScanner hook
              └── POST /api/scan
                    ├── lib/validation/image.ts  (Sharp)
                    ├── services/vision/gemini.ts
                    ├── services/carbon/scorer.ts
                    │     └── data/carbon-dataset.json ◄── SINGLE SOURCE OF TRUTH
                    └── services/recommendation/engine.ts
                          └── data/carbon-dataset.json ◄── SINGLE SOURCE OF TRUTH

results/[id]/page.tsx
  ├── NutritionLabel   (reads ScanResult from query params / session)
  ├── ImpactGrade
  └── SwapCard[]

dashboard/page.tsx
  ├── CarbonChart      (reads from AnalyticsService → IndexedDB)
  ├── MealHistory
  └── WeeklyInsights
```

---

*Document version: 1.0.0 — 2026-06-21*  
*Maintained by: BitePrint Coach engineering*
