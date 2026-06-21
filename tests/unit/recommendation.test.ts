import { describe, it, expect } from "vitest";
import { recommendationEngine } from "@/services/recommendation/engine";
import { carbonScorer } from "@/services/carbon/scorer";
import type { DetectedFood } from "@/types";

function makeFood(
  name: string,
  portionGrams: number,
  datasetId: string
): DetectedFood {
  return { name, confidence: 0.95, portionGrams, rawLabel: name, datasetId };
}

describe("recommendationEngine.recommend", () => {
  it("returns empty array for an all-low-impact meal", () => {
    const carbonResult = carbonScorer.score([
      makeFood("lentils", 200, "lentils"),
      makeFood("broccoli", 100, "broccoli"),
    ]);
    const recs = recommendationEngine.recommend(carbonResult);
    expect(recs).toHaveLength(0);
  });

  it("returns at most 3 recommendations", () => {
    const carbonResult = carbonScorer.score([
      makeFood("beef", 300, "beef-cattle"),
      makeFood("cheese", 100, "cheese-cheddar"),
      makeFood("salmon", 200, "salmon-farmed"),
      makeFood("prawns", 150, "prawns-farmed"),
      makeFood("lamb", 200, "lamb-mutton"),
    ]);
    const recs = recommendationEngine.recommend(carbonResult);
    expect(recs.length).toBeLessThanOrEqual(3);
  });

  it("ranks recommendations by reduction percentage (highest first)", () => {
    const carbonResult = carbonScorer.score([
      makeFood("beef", 200, "beef-cattle"),
      makeFood("cheese", 100, "cheese-cheddar"),
    ]);
    const recs = recommendationEngine.recommend(carbonResult);
    for (let i = 0; i < recs.length - 1; i++) {
      expect(recs[i].swap.reductionPct).toBeGreaterThanOrEqual(
        recs[i + 1].swap.reductionPct
      );
    }
  });

  it("only recommends swaps with positive CO₂e savings", () => {
    const carbonResult = carbonScorer.score([
      makeFood("beef", 200, "beef-cattle"),
    ]);
    const recs = recommendationEngine.recommend(carbonResult);
    for (const rec of recs) {
      expect(rec.swap.co2eSavedKg).toBeGreaterThan(0);
      expect(rec.swap.reductionPct).toBeGreaterThan(0);
    }
  });

  it("assigns sequential ranks starting at 1", () => {
    const carbonResult = carbonScorer.score([
      makeFood("beef", 200, "beef-cattle"),
      makeFood("cheese", 100, "cheese-cheddar"),
    ]);
    const recs = recommendationEngine.recommend(carbonResult);
    recs.forEach((rec, i) => {
      expect(rec.rank).toBe(i + 1);
    });
  });

  it("includes a coaching message for each recommendation", () => {
    const carbonResult = carbonScorer.score([makeFood("beef", 300, "beef-cattle")]);
    const recs = recommendationEngine.recommend(carbonResult);
    for (const rec of recs) {
      expect(rec.coachingMessage.length).toBeGreaterThan(10);
      expect(rec.coachingMessage).toContain(rec.swap.toFood);
    }
  });

  it("calculates monthly projection correctly (savings × 12)", () => {
    const carbonResult = carbonScorer.score([makeFood("beef", 200, "beef-cattle")]);
    const recs = recommendationEngine.recommend(carbonResult);
    if (recs.length > 0) {
      const rec = recs[0];
      const expected = Math.round(rec.swap.co2eSavedKg * 12 * 100) / 100;
      expect(rec.monthlyProjectionKg).toBeCloseTo(expected, 2);
    }
  });

  it("is deterministic — same input always returns same output", () => {
    const carbonResult = carbonScorer.score([makeFood("beef", 200, "beef-cattle")]);
    const recs1 = recommendationEngine.recommend(carbonResult);
    const recs2 = recommendationEngine.recommend(carbonResult);
    expect(recs1).toEqual(recs2);
  });

  it("does not produce duplicate from-food recommendations", () => {
    const carbonResult = carbonScorer.score([
      makeFood("beef", 200, "beef-cattle"),
    ]);
    const recs = recommendationEngine.recommend(carbonResult);
    const fromIds = recs.map((r) => r.swap.fromFoodId);
    const unique = new Set(fromIds);
    expect(fromIds.length).toBe(unique.size);
  });
});
