import type { CarbonService } from "./index";
import type {
  CarbonResult,
  DetectedFood,
  FoodImpact,
  Grade,
  ImpactLevel,
} from "@/types";
import { getFoodById, findDatasetId, DATASET_VERSION } from "./dataset";

// ============================================================
// Grading thresholds (total meal CO₂e in kg)
// ============================================================
const GRADE_THRESHOLDS: Array<{ max: number; grade: Grade }> = [
  { max: 0.5, grade: "A" },
  { max: 1.5, grade: "B" },
  { max: 3.0, grade: "C" },
  { max: 5.0, grade: "D" },
  { max: Infinity, grade: "F" },
];

const DEFAULT_PORTION_KG = 0.15; // 150g — conservative default portion

/**
 * Derive a letter grade from total meal CO₂e.
 */
function deriveGrade(totalCo2eKg: number): Grade {
  return (
    GRADE_THRESHOLDS.find((t) => totalCo2eKg <= t.max)?.grade ?? "F"
  );
}

/**
 * Derive an overall impact level from grade.
 */
function deriveImpactLevel(grade: Grade): ImpactLevel {
  if (grade === "A" || grade === "B") return "low";
  if (grade === "C") return "moderate";
  return "high";
}

/**
 * Calculate the maximum reduction potential if all high/moderate impact
 * foods were swapped for their best alternative.
 */
function calcReductionPotential(
  breakdown: FoodImpact[],
  totalCo2eKg: number
): number {
  if (totalCo2eKg === 0) return 0;

  let savedCo2e = 0;
  for (const item of breakdown) {
    if (item.impactLevel === "low") continue;

    const entry = getFoodById(item.foodId);
    if (!entry || entry.swaps.length === 0) continue;

    // Find best swap (lowest CO2e)
    let bestSwapCo2e = item.co2eKg;
    for (const swapId of entry.swaps) {
      const swapEntry = getFoodById(swapId);
      if (!swapEntry) continue;
      const swapCo2e = swapEntry.co2e_per_kg * item.portionKg;
      if (swapCo2e < bestSwapCo2e) {
        bestSwapCo2e = swapCo2e;
      }
    }
    savedCo2e += item.co2eKg - bestSwapCo2e;
  }

  return Math.round((savedCo2e / totalCo2eKg) * 100);
}

/**
 * Carbon scorer — pure function implementation of CarbonService.
 * Same input always produces same output. No side effects.
 */
export const carbonScorer: CarbonService = {
  score(foods: DetectedFood[]): CarbonResult {
    const breakdown: FoodImpact[] = [];
    let totalCo2eKg = 0;
    let totalWaterLiters = 0;

    for (const food of foods) {
      // Resolve dataset entry: use pre-matched id, or re-match by name
      const datasetId = food.datasetId ?? findDatasetId(food.name);
      const entry = datasetId ? getFoodById(datasetId) : undefined;

      const portionKg =
        food.portionGrams != null
          ? food.portionGrams / 1000
          : DEFAULT_PORTION_KG;

      if (entry) {
        const co2eKg = entry.co2e_per_kg * portionKg;
        const waterLiters = entry.water_liters_per_kg * portionKg;

        totalCo2eKg += co2eKg;
        totalWaterLiters += waterLiters;

        breakdown.push({
          foodId: entry.id,
          name: entry.name,
          co2eKg,
          waterLiters,
          portionKg,
          impactLevel: entry.impact_level,
          source: entry.source,
        });
      }
      // Unknown foods contribute 0 (conservative) — we never guess CO2e values
    }

    // Round to 2 decimal places for display stability
    totalCo2eKg = Math.round(totalCo2eKg * 100) / 100;
    totalWaterLiters = Math.round(totalWaterLiters);

    const grade = deriveGrade(totalCo2eKg);
    const impactLevel = deriveImpactLevel(grade);

    // Find primary emission source (highest individual CO2e contributor)
    const primarySource =
      breakdown.length > 0
        ? breakdown.reduce((a, b) => (a.co2eKg > b.co2eKg ? a : b)).name
        : "Unknown";

    const reductionPotentialPct = calcReductionPotential(breakdown, totalCo2eKg);

    return {
      totalCo2eKg,
      totalWaterLiters,
      grade,
      impactLevel,
      primarySource,
      reductionPotentialPct,
      breakdown,
      datasetVersion: DATASET_VERSION,
    };
  },
};
