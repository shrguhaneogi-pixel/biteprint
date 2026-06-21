import type { CarbonResult, DetectedFood } from "@/types";

/**
 * CarbonService interface.
 * All implementations must be pure functions — same input always produces same output.
 * No network calls, no external state — uses bundled carbon-dataset.json exclusively.
 */
export interface CarbonService {
  /**
   * Score detected foods against the carbon dataset.
   * @param foods - Array of detected food items from the vision layer
   * @returns Complete carbon impact analysis
   */
  score(foods: DetectedFood[]): CarbonResult;
}
