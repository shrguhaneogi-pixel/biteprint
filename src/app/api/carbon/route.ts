import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findDatasetId, getFoodById } from "@/services/carbon/dataset";
import type { Grade, ImpactLevel } from "@/types";

// ============================================================
// Phase 2 — Carbon Scoring API
// Accepts { food: string, portion: string }
// Returns { carbon: number, water: number, grade: string }
// All values originate exclusively from the local carbon dataset.
// ============================================================

const CarbonRequestSchema = z.object({
  food: z
    .string({ required_error: "food is required" })
    .min(1, "food must not be empty")
    .max(200, "food name exceeds maximum length")
    .transform((s) => s.trim().toLowerCase()),
  portion: z
    .string({ required_error: "portion is required" })
    .min(1, "portion must not be empty")
    .max(50, "portion description exceeds maximum length")
    .transform((s) => s.trim()),
});

// ============================================================
// Portion parser — converts human text to grams
// Supports: "150g", "200 g", "1 cup", "1 serving", "medium", etc.
// ============================================================

const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  pound: 453.6,
  pounds: 453.6,
  cup: 240,
  cups: 240,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  serving: 150,
  servings: 150,
  small: 80,
  medium: 150,
  large: 250,
  piece: 150,
  pieces: 150,
  slice: 80,
  slices: 80,
  bowl: 300,
  plate: 350,
  handful: 30,
};

const DEFAULT_PORTION_GRAMS = 150;

/**
 * Parse a human-readable portion string to grams.
 * Returns default (150g) if unparseable — never throws.
 */
export function parsePortion(portion: string): number {
  const lower = portion.toLowerCase().trim();

  // Direct numeric: "200", "150"
  const numOnly = Number(lower);
  if (!isNaN(numOnly) && numOnly > 0) {
    return Math.min(numOnly, 5000); // cap at 5kg
  }

  // "<number> <unit>" e.g. "200 g", "1.5 cups"
  const match = lower.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (match) {
    const quantity = parseFloat(match[1]);
    const unit = match[2];
    const gramsPerUnit = UNIT_TO_GRAMS[unit];
    if (gramsPerUnit && quantity > 0) {
      return Math.min(quantity * gramsPerUnit, 5000);
    }
  }

  // Named sizes: "medium", "large", "small"
  for (const [key, grams] of Object.entries(UNIT_TO_GRAMS)) {
    if (lower === key) return grams;
  }

  return DEFAULT_PORTION_GRAMS;
}

// ============================================================
// Grade derivation (mirrors carbonScorer thresholds)
// ============================================================

const GRADE_THRESHOLDS: Array<{ max: number; grade: Grade }> = [
  { max: 0.5, grade: "A" },
  { max: 1.5, grade: "B" },
  { max: 3.0, grade: "C" },
  { max: 5.0, grade: "D" },
  { max: Infinity, grade: "F" },
];

function deriveGrade(co2eKg: number): Grade {
  return GRADE_THRESHOLDS.find((t) => co2eKg <= t.max)?.grade ?? "F";
}

function deriveImpactLevel(grade: Grade): ImpactLevel {
  if (grade === "A" || grade === "B") return "low";
  if (grade === "C") return "moderate";
  return "high";
}

// ============================================================
// Route Handler
// ============================================================

function errorResponse(message: string, code: string, status: number): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", "INVALID_BODY", 400);
  }

  // 2. Validate + sanitize input
  const parsed = CarbonRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const messages = Object.entries(fieldErrors)
      .map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`)
      .join("; ");
    return errorResponse(`Validation failed: ${messages}`, "VALIDATION_ERROR", 400);
  }

  const { food, portion } = parsed.data;

  // 3. Look up food in carbon dataset
  const datasetId = findDatasetId(food);
  if (!datasetId) {
    return errorResponse(
      `Food "${food}" is not in the carbon dataset. Try a more common name.`,
      "FOOD_NOT_FOUND",
      404
    );
  }

  const entry = getFoodById(datasetId);
  if (!entry) {
    // Should not happen if findDatasetId is correct, but guard defensively
    return errorResponse("Internal dataset lookup error", "DATASET_ERROR", 500);
  }

  // 4. Calculate carbon & water from dataset values (deterministic)
  const portionKg = parsePortion(portion) / 1000;
  const carbonKg = Math.round(entry.co2e_per_kg * portionKg * 1000) / 1000;
  const waterLiters = Math.round(entry.water_liters_per_kg * portionKg);
  const grade = deriveGrade(carbonKg);
  const impactLevel = deriveImpactLevel(grade);

  return NextResponse.json(
    {
      food: entry.name,
      portion: `${Math.round(portionKg * 1000)}g`,
      carbon: carbonKg,
      water: waterLiters,
      grade,
      impactLevel,
      source: entry.source,
      datasetVersion: "1.0.0",
    },
    { status: 200 }
  );
}

export async function GET(): Promise<NextResponse> {
  return errorResponse(
    "Method not allowed. POST { food: string, portion: string }",
    "METHOD_NOT_ALLOWED",
    405
  );
}
