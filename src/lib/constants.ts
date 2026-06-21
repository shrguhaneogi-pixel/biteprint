/**
 * App-wide constants.
 * Keep all magic values here — never scatter them across the codebase.
 */

export const APP_NAME = "BitePrint Coach";
export const APP_TAGLINE = "Scan Your Meal. Understand Your Impact.";
export const APP_DESCRIPTION =
  "AI-powered dietary carbon footprint awareness. Upload a meal photo and get an instant Environmental Nutrition Label.";

// API
export const SCAN_ENDPOINT = "/api/scan";
export const HEALTH_ENDPOINT = "/api/health";
export const MAX_UPLOAD_SIZE_MB = 5;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

// Carbon grading thresholds (meal total kg CO₂e)
export const GRADE_THRESHOLDS = {
  A: 0.5,
  B: 1.5,
  C: 3.0,
  D: 5.0,
  F: Infinity,
} as const;

// Grade display metadata
export const GRADE_META = {
  A: { label: "Excellent", color: "var(--color-grade-a)", description: "Predominantly plant-based" },
  B: { label: "Good", color: "var(--color-grade-b)", description: "Low-meat, mixed diet" },
  C: { label: "Moderate", color: "var(--color-grade-c)", description: "Mixed with moderate meat" },
  D: { label: "High Impact", color: "var(--color-grade-d)", description: "High meat content" },
  F: { label: "Very High", color: "var(--color-grade-f)", description: "Heavy beef or lamb" },
} as const;

// Impact level colors
export const IMPACT_COLORS = {
  low: "var(--color-impact-low)",
  moderate: "var(--color-impact-moderate)",
  high: "var(--color-impact-high)",
} as const;

// IndexedDB
export const DB_NAME = "biteprint";
export const DB_VERSION = 1;
export const SCAN_STORE = "scans";

// Analytics periods
export const TREND_PERIODS = ["week", "month"] as const;

// Monthly projection frequency (swaps per month if applied 3× per week)
export const MONTHLY_SWAP_FREQUENCY = 12;

// Spline — fallback if env var not set
export const SPLINE_FALLBACK_URL = "";
