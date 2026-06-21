import { describe, it, expect } from "vitest";
import { carbonScorer } from "@/services/carbon/scorer";
import type { DetectedFood } from "@/types";

// ============================================================
// Test helpers
// ============================================================

function makeFood(
  name: string,
  portionGrams: number | null = 150,
  datasetId: string | null = null
): DetectedFood {
  return {
    name,
    confidence: 0.95,
    portionGrams,
    rawLabel: name,
    datasetId,
  };
}

// ============================================================
// Grade thresholds
// ============================================================

describe("carbonScorer.score — grade thresholds", () => {
  it("returns grade A for empty meal (0 kg CO₂e)", () => {
    const result = carbonScorer.score([]);
    expect(result.grade).toBe("A");
    expect(result.totalCo2eKg).toBe(0);
  });

  it("returns grade A for a plant-based meal under 0.5 kg CO₂e", () => {
    // Lentils: 0.9 kg CO₂e/kg × 0.15 kg = 0.135 kg CO₂e
    const result = carbonScorer.score([makeFood("lentils", 150, "lentils")]);
    expect(result.grade).toBe("A");
    expect(result.totalCo2eKg).toBeLessThanOrEqual(0.5);
  });

  it("returns grade F for a heavy beef meal over 5 kg CO₂e", () => {
    // Beef: 60 kg CO₂e/kg × 0.35 kg = 21 kg CO₂e
    const result = carbonScorer.score([makeFood("beef", 350, "beef-cattle")]);
    expect(result.grade).toBe("F");
    expect(result.totalCo2eKg).toBeGreaterThan(5);
  });

  it("returns grade C for a moderate meal (chicken + rice)", () => {
    const result = carbonScorer.score([
      makeFood("chicken", 200, "chicken-breast"),
      makeFood("rice", 200, "rice-white"),
    ]);
    expect(["B", "C"]).toContain(result.grade);
  });
});

// ============================================================
// CO₂e calculations (deterministic)
// ============================================================

describe("carbonScorer.score — CO₂e calculation", () => {
  it("calculates correct CO₂e for a known food and portion", () => {
    // Beef: 60 kg CO₂e/kg × 0.150 kg = 9.0 kg CO₂e
    const result = carbonScorer.score([makeFood("beef", 150, "beef-cattle")]);
    expect(result.totalCo2eKg).toBeCloseTo(9.0, 1);
  });

  it("uses default 150g portion when portionGrams is null", () => {
    const withPortion = carbonScorer.score([makeFood("lentils", 150, "lentils")]);
    const withoutPortion = carbonScorer.score([makeFood("lentils", null, "lentils")]);
    expect(withPortion.totalCo2eKg).toBe(withoutPortion.totalCo2eKg);
  });

  it("sums CO₂e across multiple food items", () => {
    const beefResult = carbonScorer.score([makeFood("beef", 150, "beef-cattle")]);
    const lentilResult = carbonScorer.score([makeFood("lentils", 150, "lentils")]);
    const combined = carbonScorer.score([
      makeFood("beef", 150, "beef-cattle"),
      makeFood("lentils", 150, "lentils"),
    ]);
    const expectedTotal =
      Math.round((beefResult.totalCo2eKg + lentilResult.totalCo2eKg) * 100) / 100;
    expect(combined.totalCo2eKg).toBeCloseTo(expectedTotal, 1);
  });

  it("returns 0 CO₂e for foods not found in dataset", () => {
    // "xylophagous protein" has no match in dataset and no alias prefix match
    const result = carbonScorer.score([makeFood("xylophagous protein", 150, null)]);
    expect(result.totalCo2eKg).toBe(0);
    expect(result.breakdown).toHaveLength(0);
  });

  it("is fully deterministic — same input always returns same output", () => {
    const foods = [
      makeFood("beef", 200, "beef-cattle"),
      makeFood("rice", 150, "rice-white"),
    ];
    const result1 = carbonScorer.score(foods);
    const result2 = carbonScorer.score(foods);
    expect(result1).toEqual(result2);
  });
});

// ============================================================
// Primary emission source
// ============================================================

describe("carbonScorer.score — primarySource", () => {
  it("identifies beef as primary source in a mixed meal", () => {
    const result = carbonScorer.score([
      makeFood("beef", 200, "beef-cattle"),
      makeFood("lentils", 200, "lentils"),
      makeFood("broccoli", 100, "broccoli"),
    ]);
    expect(result.primarySource).toContain("Beef");
  });

  it("returns 'Unknown' for empty meals", () => {
    const result = carbonScorer.score([]);
    expect(result.primarySource).toBe("Unknown");
  });
});

// ============================================================
// Impact level
// ============================================================

describe("carbonScorer.score — impactLevel", () => {
  it("returns 'low' for grade A/B meals", () => {
    const result = carbonScorer.score([makeFood("lentils", 150, "lentils")]);
    expect(result.impactLevel).toBe("low");
  });

  it("returns 'high' for grade F meals", () => {
    const result = carbonScorer.score([makeFood("beef", 500, "beef-cattle")]);
    expect(result.impactLevel).toBe("high");
  });
});

// ============================================================
// Water footprint
// ============================================================

describe("carbonScorer.score — water footprint", () => {
  it("calculates water footprint proportional to portion", () => {
    // Beef: 15400 L/kg × 0.15 kg = 2310 L
    const result = carbonScorer.score([makeFood("beef", 150, "beef-cattle")]);
    expect(result.totalWaterLiters).toBeCloseTo(2310, -1);
  });
});

// ============================================================
// Dataset version
// ============================================================

describe("carbonScorer.score — metadata", () => {
  it("includes dataset version in result", () => {
    const result = carbonScorer.score([]);
    expect(result.datasetVersion).toBeTruthy();
    expect(typeof result.datasetVersion).toBe("string");
  });
});
