/**
 * Shared TypeScript types for BitePrint Coach.
 * This file contains cross-cutting types used by multiple modules.
 * Service-specific types live in their respective service/types.ts files.
 */

// ============================================================
// API Response Types
// ============================================================

export interface ApiError {
  error: string;
  code: string;
  retryAfterMs?: number;
}

export type ApiResult<T> = { success: true; data: T } | { success: false; error: ApiError };

// ============================================================
// Scan Pipeline Types
// ============================================================

export interface ScanRequest {
  image: File;
}

export interface ScanResponse {
  scanId: string;
  foods: DetectedFood[];
  carbonResult: CarbonResult;
  recommendations: Recommendation[];
  meta: ScanMeta;
}

export interface ScanMeta {
  processingMs: number;
  visionModel: string;
  datasetVersion: string;
  timestamp: number;
}

// ============================================================
// Vision Layer Types
// ============================================================

export interface DetectedFood {
  name: string;
  confidence: number;
  portionGrams: number | null;
  rawLabel: string;
  datasetId: string | null; // Matched carbon-dataset.json id, null if unmatched
}

export interface VisionResult {
  foods: DetectedFood[];
  modelVersion: string;
  processingMs: number;
}

// ============================================================
// Carbon Layer Types
// ============================================================

export type ImpactLevel = "low" | "moderate" | "high";
export type Grade = "A" | "B" | "C" | "D" | "F";

export interface FoodImpact {
  foodId: string;
  name: string;
  co2eKg: number;
  waterLiters: number;
  portionKg: number;
  impactLevel: ImpactLevel;
  source: string;
}

export interface CarbonResult {
  totalCo2eKg: number;
  totalWaterLiters: number;
  grade: Grade;
  impactLevel: ImpactLevel;
  primarySource: string;
  reductionPotentialPct: number;
  breakdown: FoodImpact[];
  datasetVersion: string;
}

// ============================================================
// Recommendation Layer Types
// ============================================================

export interface FoodSwap {
  fromFoodId: string;
  fromFood: string;
  toFoodId: string;
  toFood: string;
  co2eSavedKg: number;
  waterSavedLiters: number;
  reductionPct: number;
}

export interface Recommendation {
  rank: number;
  swap: FoodSwap;
  coachingMessage: string;
  monthlyProjectionKg: number; // Savings if swap applied 3×/week for 4 weeks
}

// ============================================================
// Analytics Layer Types
// ============================================================

export interface ScanRecord {
  id: string; // UUID v4
  timestamp: number; // Unix ms
  foods: DetectedFood[];
  carbonResult: CarbonResult;
  recommendations: Recommendation[];
}

export interface DailyTotal {
  date: string; // ISO 8601 "YYYY-MM-DD"
  totalCo2eKg: number;
  scanCount: number;
  avgPerMealKg: number;
}

export interface TrendData {
  dailyTotals: DailyTotal[];
  periodCo2eKg: number;
  avgPerMealKg: number;
  bestDay: string | null;
  worstDay: string | null;
  scanCount: number;
}

// ============================================================
// Carbon Dataset Schema (mirrors data/carbon-dataset.json)
// ============================================================

export interface CarbonDataEntry {
  id: string;
  name: string;
  aliases: string[];
  co2e_per_kg: number;
  water_liters_per_kg: number;
  category: FoodCategory;
  impact_level: ImpactLevel;
  swaps: string[]; // IDs of lower-impact alternatives
  source: string;
}

export type FoodCategory =
  | "beef"
  | "lamb"
  | "pork"
  | "poultry"
  | "fish"
  | "seafood"
  | "dairy"
  | "eggs"
  | "grains"
  | "legumes"
  | "vegetables"
  | "fruits"
  | "beverages"
  | "oils"
  | "other";

// ============================================================
// UI Component Types
// ============================================================

export type ScanState = "idle" | "uploading" | "analyzing" | "done" | "error";

export interface ScannerState {
  status: ScanState;
  progress: number; // 0–100
  result: ScanResponse | null;
  error: string | null;
}
