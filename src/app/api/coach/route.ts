import { NextRequest, NextResponse } from "next/server";
import { generateCoachMessage } from "@/services/coach/index";
import type { CarbonResult, Recommendation } from "@/types";
import { z } from "zod";

const CoachRequestSchema = z.object({
  carbonResult: z.object({
    totalCo2eKg: z.number(),
    totalWaterLiters: z.number(),
    grade: z.enum(["A", "B", "C", "D", "F"]),
    impactLevel: z.enum(["low", "moderate", "high"]),
    primarySource: z.string(),
    reductionPotentialPct: z.number(),
    breakdown: z.array(z.object({
      foodId: z.string(),
      name: z.string(),
      co2eKg: z.number(),
      waterLiters: z.number(),
      portionKg: z.number(),
      impactLevel: z.enum(["low", "moderate", "high"]),
      source: z.string(),
    })),
    datasetVersion: z.string(),
  }),
  recommendations: z.array(z.object({
    rank: z.number(),
    swap: z.object({
      fromFoodId: z.string(),
      fromFood: z.string(),
      toFoodId: z.string(),
      toFood: z.string(),
      co2eSavedKg: z.number(),
      waterSavedLiters: z.number(),
      reductionPct: z.number(),
    }),
    coachingMessage: z.string(),
    monthlyProjectionKg: z.number(),
  })),
  trendSummary: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CoachRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { carbonResult, recommendations, trendSummary } = parsed.data;
  const apiKey = process.env.GEMINI_API_KEY;

  const response = await generateCoachMessage(
    carbonResult as CarbonResult,
    recommendations as Recommendation[],
    trendSummary,
    apiKey
  );

  return NextResponse.json(response, { status: 200 });
}
