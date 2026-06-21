import type { Recommendation, CarbonResult } from "@/types";

/**
 * RecommendationService interface.
 * Pure rule-based engine — no AI calls, no network requests.
 * All recommendations are derived from carbon-dataset.json swap references.
 */
export interface RecommendationService {
  /**
   * Generate ranked food swap recommendations from a carbon result.
   * @param result - Carbon scoring result from the carbon layer
   * @returns Top 3 ranked recommendations, sorted by reduction potential
   */
  recommend(result: CarbonResult): Recommendation[];
}
