import type { RecommendationService } from "./index";
import type { CarbonResult, FoodImpact, FoodSwap, Recommendation } from "@/types";
import { getFoodById } from "@/services/carbon/dataset";

const MAX_RECOMMENDATIONS = 3;
// Assumed weekly frequency for monthly projection (3 times / week × 4 weeks)
const MONTHLY_FREQUENCY = 12;

/**
 * Build a coaching message for a food swap recommendation.
 * Uses template strings — no AI calls, fully deterministic.
 */
function buildCoachingMessage(swap: FoodSwap): string {
  const pct = Math.round(swap.reductionPct);
  const kg = swap.co2eSavedKg.toFixed(2);

  if (pct >= 70) {
    return (
      `Swapping ${swap.fromFood} for ${swap.toFood} is one of the highest-impact changes you can make — ` +
      `saving ${kg} kg CO₂e (${pct}% reduction) per serving.`
    );
  }
  if (pct >= 40) {
    return (
      `Replacing ${swap.fromFood} with ${swap.toFood} saves ${kg} kg CO₂e per meal — ` +
      `a ${pct}% reduction with minimal change to your diet.`
    );
  }
  return (
    `Choosing ${swap.toFood} instead of ${swap.fromFood} reduces your footprint by ${pct}% ` +
    `(${kg} kg CO₂e per serving).`
  );
}

/**
 * Find the best available swap for a food item.
 * Returns the swap with highest CO2e reduction, or null if no swaps exist.
 */
function findBestSwap(item: FoodImpact): FoodSwap | null {
  const entry = getFoodById(item.foodId);
  if (!entry || entry.swaps.length === 0) return null;

  let bestSwap: FoodSwap | null = null;
  let bestReductionPct = 0;

  for (const swapId of entry.swaps) {
    const swapEntry = getFoodById(swapId);
    if (!swapEntry) continue;

    const swapCo2e = swapEntry.co2e_per_kg * item.portionKg;
    const swapWater = swapEntry.water_liters_per_kg * item.portionKg;
    const co2eSaved = item.co2eKg - swapCo2e;

    if (co2eSaved <= 0) continue; // Skip if swap is actually worse

    const reductionPct = (co2eSaved / item.co2eKg) * 100;

    if (reductionPct > bestReductionPct) {
      bestReductionPct = reductionPct;
      bestSwap = {
        fromFoodId: item.foodId,
        fromFood: item.name,
        toFoodId: swapEntry.id,
        toFood: swapEntry.name,
        co2eSavedKg: Math.round(co2eSaved * 100) / 100,
        waterSavedLiters: Math.round(item.waterLiters - swapWater),
        reductionPct: Math.round(reductionPct * 10) / 10,
      };
    }
  }

  return bestSwap;
}

/**
 * Recommendation engine — pure rule-based implementation of RecommendationService.
 * No AI calls. All recommendations derived from carbon-dataset.json swap references.
 */
export const recommendationEngine: RecommendationService = {
  recommend(result: CarbonResult): Recommendation[] {
    // Only consider high and moderate impact foods for swap recommendations
    const candidates = result.breakdown.filter(
      (item) => item.impactLevel !== "low"
    );

    // Generate swaps, deduplicate by fromFoodId
    const swaps: FoodSwap[] = [];
    const seen = new Set<string>();

    for (const candidate of candidates) {
      if (seen.has(candidate.foodId)) continue;
      seen.add(candidate.foodId);

      const swap = findBestSwap(candidate);
      if (swap) swaps.push(swap);
    }

    // Sort by reduction percentage, highest first
    swaps.sort((a, b) => b.reductionPct - a.reductionPct);

    // Take top N and build recommendations
    return swaps.slice(0, MAX_RECOMMENDATIONS).map((swap, index) => ({
      rank: index + 1,
      swap,
      coachingMessage: buildCoachingMessage(swap),
      monthlyProjectionKg:
        Math.round(swap.co2eSavedKg * MONTHLY_FREQUENCY * 100) / 100,
    }));
  },
};
