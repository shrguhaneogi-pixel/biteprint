import { describe, it, expect } from "vitest";
import { aggregateDailyTotals, computeTrends } from "@/services/analytics/store";
import type { ScanRecord } from "@/types";
import { carbonScorer } from "@/services/carbon/scorer";
import { recommendationEngine } from "@/services/recommendation/engine";

// ============================================================
// Helper to create a mock scan record
// ============================================================

function makeScanRecord(
  dateStr: string,
  co2eKg: number,
  id: string = Math.random().toString(36).slice(2)
): ScanRecord {
  const foods = [
    {
      name: "beef",
      confidence: 0.95,
      portionGrams: co2eKg / 0.06, // Reverse-calculate from beef CO2e rate
      rawLabel: "beef",
      datasetId: "beef-cattle",
    },
  ];

  const timestamp = new Date(dateStr).getTime();

  // Use a fixed mock carbon result with the desired CO2e value for simplicity
  const mockCarbonResult = {
    totalCo2eKg: co2eKg,
    totalWaterLiters: co2eKg * 100,
    grade: co2eKg > 5 ? ("F" as const) : co2eKg > 3 ? ("D" as const) : ("C" as const),
    impactLevel: "high" as const,
    primarySource: "Beef (cattle)",
    reductionPotentialPct: 67,
    breakdown: [],
    datasetVersion: "1.0.0",
  };

  return {
    id,
    timestamp,
    foods,
    carbonResult: mockCarbonResult,
    recommendations: [],
  };
}

// ============================================================
// aggregateDailyTotals
// ============================================================

describe("aggregateDailyTotals", () => {
  it("returns empty array for no records", () => {
    expect(aggregateDailyTotals([])).toEqual([]);
  });

  it("groups records by date correctly", () => {
    const records = [
      makeScanRecord("2026-06-01", 2.0, "a"),
      makeScanRecord("2026-06-01", 3.0, "b"),
      makeScanRecord("2026-06-02", 1.5, "c"),
    ];
    const totals = aggregateDailyTotals(records);
    expect(totals).toHaveLength(2);
    const june1 = totals.find((t) => t.date === "2026-06-01");
    expect(june1?.totalCo2eKg).toBeCloseTo(5.0, 2);
    expect(june1?.scanCount).toBe(2);
    expect(june1?.avgPerMealKg).toBeCloseTo(2.5, 2);
  });

  it("returns results sorted by date ascending", () => {
    const records = [
      makeScanRecord("2026-06-03", 1.0, "c"),
      makeScanRecord("2026-06-01", 2.0, "a"),
      makeScanRecord("2026-06-02", 1.5, "b"),
    ];
    const totals = aggregateDailyTotals(records);
    const dates = totals.map((t) => t.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("handles a single record", () => {
    const records = [makeScanRecord("2026-06-10", 4.2, "x")];
    const totals = aggregateDailyTotals(records);
    expect(totals).toHaveLength(1);
    expect(totals[0].totalCo2eKg).toBeCloseTo(4.2, 2);
    expect(totals[0].scanCount).toBe(1);
  });
});

// ============================================================
// computeTrends
// ============================================================

describe("computeTrends", () => {
  it("returns zero values for no records", () => {
    const trends = computeTrends([], []);
    expect(trends.periodCo2eKg).toBe(0);
    expect(trends.avgPerMealKg).toBe(0);
    expect(trends.bestDay).toBeNull();
    expect(trends.worstDay).toBeNull();
    expect(trends.scanCount).toBe(0);
  });

  it("identifies the best day (lowest CO₂e)", () => {
    const records = [
      makeScanRecord("2026-06-01", 6.0, "a"),
      makeScanRecord("2026-06-02", 1.0, "b"),
      makeScanRecord("2026-06-03", 4.0, "c"),
    ];
    const dailyTotals = aggregateDailyTotals(records);
    const trends = computeTrends(records, dailyTotals);
    expect(trends.bestDay).toBe("2026-06-02");
  });

  it("identifies the worst day (highest CO₂e)", () => {
    const records = [
      makeScanRecord("2026-06-01", 6.0, "a"),
      makeScanRecord("2026-06-02", 1.0, "b"),
      makeScanRecord("2026-06-03", 4.0, "c"),
    ];
    const dailyTotals = aggregateDailyTotals(records);
    const trends = computeTrends(records, dailyTotals);
    expect(trends.worstDay).toBe("2026-06-01");
  });

  it("calculates average per meal correctly", () => {
    const records = [
      makeScanRecord("2026-06-01", 2.0, "a"),
      makeScanRecord("2026-06-01", 4.0, "b"),
    ];
    const dailyTotals = aggregateDailyTotals(records);
    const trends = computeTrends(records, dailyTotals);
    expect(trends.avgPerMealKg).toBeCloseTo(3.0, 2);
    expect(trends.scanCount).toBe(2);
  });
});
