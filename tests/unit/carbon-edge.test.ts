import { describe, it, expect } from "vitest";
import { parsePortion } from "@/app/api/carbon/route";
import { carbonScorer } from "@/services/carbon/scorer";
import { findDatasetId } from "@/services/carbon/dataset";
import type { DetectedFood } from "@/types";

// ============================================================
// parsePortion — unit parsing
// ============================================================

describe("parsePortion — unit conversions", () => {
  it("parses plain grams: '200g'", () => {
    expect(parsePortion("200g")).toBe(200);
  });

  it("parses grams with space: '150 g'", () => {
    expect(parsePortion("150 g")).toBe(150);
  });

  it("parses kilograms: '0.5kg'", () => {
    expect(parsePortion("0.5kg")).toBe(500);
  });

  it("parses ounces: '6oz'", () => {
    expect(parsePortion("6oz")).toBeCloseTo(170.1, 0);
  });

  it("parses cups: '1 cup'", () => {
    expect(parsePortion("1 cup")).toBe(240);
  });

  it("parses named sizes: 'medium'", () => {
    expect(parsePortion("medium")).toBe(150);
  });

  it("parses named sizes: 'small'", () => {
    expect(parsePortion("small")).toBe(80);
  });

  it("parses named sizes: 'large'", () => {
    expect(parsePortion("large")).toBe(250);
  });

  it("parses 'serving'", () => {
    expect(parsePortion("serving")).toBe(150);
  });

  it("returns default 150g for unrecognized string", () => {
    expect(parsePortion("a handful maybe")).toBe(150);
  });

  it("returns default 150g for empty-equivalent string", () => {
    expect(parsePortion("   ")).toBe(150);
  });

  it("caps at 5000g for unreasonably large portions", () => {
    expect(parsePortion("99999g")).toBe(5000);
    expect(parsePortion("99999")).toBe(5000);
  });

  it("handles decimal quantities: '1.5 cups'", () => {
    expect(parsePortion("1.5 cups")).toBe(360);
  });

  it("parses bowl: '1 bowl'", () => {
    expect(parsePortion("1 bowl")).toBe(300);
  });
});

// ============================================================
// Carbon Scoring Service — edge cases
// ============================================================

function makeFood(
  name: string,
  portionGrams: number | null,
  datasetId: string | null
): DetectedFood {
  return { name, confidence: 0.9, portionGrams, rawLabel: name, datasetId };
}

describe("carbonScorer.score — edge cases", () => {
  it("handles zero-portion foods gracefully (uses default 150g)", () => {
    const result = carbonScorer.score([makeFood("beef", null, "beef-cattle")]);
    expect(result.totalCo2eKg).toBeGreaterThan(0);
  });

  it("handles all-unknown foods (returns zeroed result)", () => {
    const result = carbonScorer.score([
      makeFood("quantum foam stew", 100, null),
      makeFood("plasma soup", 100, null),
    ]);
    expect(result.totalCo2eKg).toBe(0);
    expect(result.totalWaterLiters).toBe(0);
    expect(result.grade).toBe("A");
    expect(result.breakdown).toHaveLength(0);
  });

  it("handles very large portion (1kg beef) without crashing", () => {
    const result = carbonScorer.score([makeFood("beef", 1000, "beef-cattle")]);
    expect(result.totalCo2eKg).toBeCloseTo(60.0, 1);
    expect(result.grade).toBe("F");
  });

  it("handles tiny portion (1g beef) correctly", () => {
    const result = carbonScorer.score([makeFood("beef", 1, "beef-cattle")]);
    expect(result.totalCo2eKg).toBeCloseTo(0.06, 3);
    expect(result.grade).toBe("A");
  });

  it("handles a meal with 20+ foods without performance issues", () => {
    const foods = Array.from({ length: 20 }, (_, i) =>
      makeFood("lentils", 50, "lentils")
    );
    const start = Date.now();
    const result = carbonScorer.score(foods);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100); // Must complete in under 100ms
    expect(result.breakdown).toHaveLength(20);
  });

  it("produces breakdown entry for each matched food", () => {
    const result = carbonScorer.score([
      makeFood("beef", 150, "beef-cattle"),
      makeFood("potato", 200, "potato"),
      makeFood("broccoli", 100, "broccoli"),
    ]);
    expect(result.breakdown).toHaveLength(3);
  });

  it("breakdown CO₂e per item sums to total (within rounding)", () => {
    const result = carbonScorer.score([
      makeFood("beef", 150, "beef-cattle"),
      makeFood("rice", 200, "rice-white"),
      makeFood("lentils", 100, "lentils"),
    ]);
    const sumFromBreakdown =
      Math.round(
        result.breakdown.reduce((sum, item) => sum + item.co2eKg, 0) * 100
      ) / 100;
    expect(result.totalCo2eKg).toBeCloseTo(sumFromBreakdown, 1);
  });
});

// ============================================================
// findDatasetId — invalid input handling
// ============================================================

describe("findDatasetId — input validation", () => {
  it("returns null for empty string", () => {
    expect(findDatasetId("")).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(findDatasetId("   ")).toBeNull();
  });

  it("returns null for numeric string", () => {
    expect(findDatasetId("12345")).toBeNull();
  });

  it("returns null for special characters only", () => {
    expect(findDatasetId("!!!@@@###")).toBeNull();
  });

  it("matches case-insensitively", () => {
    expect(findDatasetId("BEEF")).toBe(findDatasetId("beef"));
  });

  it("matches 'beef' to beef-cattle", () => {
    expect(findDatasetId("beef")).toBe("beef-cattle");
  });

  it("matches 'lentils' correctly", () => {
    expect(findDatasetId("lentils")).toBe("lentils");
  });

  it("matches 'oat milk' correctly", () => {
    expect(findDatasetId("oat milk")).toBe("oat-milk");
  });

  it("returns null for completely unrelated gibberish", () => {
    expect(findDatasetId("zyxwvutsrqponmlk")).toBeNull();
  });
});
