import type { CarbonResult, Recommendation } from "@/types";

// ============================================================
// Phase 4 — AI Coach Service
// Uses Gemini to generate contextual coaching messages.
//
// ANTI-HALLUCINATION GUARDRAILS:
// - The model is given all numerical values in the prompt
// - It is explicitly forbidden from inventing carbon/water/environmental numbers
// - It may only explain, encourage, and reference provided values
// - All responses are post-processed to detect numeric leakage
// ============================================================

export interface CoachResponse {
  message: string;
  safetyChecked: boolean;
}

/**
 * Detect if the AI response contains numbers not present in the prompt context.
 * This guards against hallucinated environmental statistics.
 */
function detectHallucinatedNumbers(
  response: string,
  allowedNumbers: number[]
): boolean {
  // Extract all numbers from the response (ignore decimals that are subsets)
  const responseNumbers = Array.from(
    response.matchAll(/\b\d+(?:\.\d+)?\b/g)
  ).map((m) => parseFloat(m[0]));

  for (const num of responseNumbers) {
    // Allow numbers that are within 5% of any allowed value (rounding tolerance)
    const isAllowed = allowedNumbers.some(
      (allowed) => Math.abs(num - allowed) <= Math.max(0.05, allowed * 0.05)
    );
    // Allow small integers (ranks, percentages up to 100, years)
    const isSafeSmall = num <= 100 && Number.isInteger(num);
    if (!isAllowed && !isSafeSmall) {
      return true; // Hallucinated number found
    }
  }
  return false;
}

/**
 * Build the constrained prompt for Gemini AI Coach.
 * All numbers are injected — the model must NOT generate new numerical claims.
 */
function buildCoachPrompt(
  carbonResult: CarbonResult,
  recommendations: Recommendation[],
  trendSummary?: string
): string {
  const foodList = carbonResult.breakdown
    .map((f) => `- ${f.name}: ${f.co2eKg} kg CO₂e, ${Math.round(f.waterLiters)} L water`)
    .join("\n");

  const swapList = recommendations
    .map(
      (r) =>
        `- Swap ${r.swap.fromFood} for ${r.swap.toFood}: saves ${r.swap.co2eSavedKg} kg CO₂e (${r.swap.reductionPct}% reduction)`
    )
    .join("\n");

  return `You are BitePrint Coach, a friendly sustainability advisor. Your job is to help users understand their meal's environmental impact and take one small step to reduce it.

MEAL ANALYSIS (do not modify these numbers):
Total Carbon Footprint: ${carbonResult.totalCo2eKg} kg CO₂e
Total Water Footprint: ${carbonResult.totalWaterLiters} L
Impact Grade: ${carbonResult.grade}
Primary Emission Source: ${carbonResult.primarySource}
Reduction Potential: ${carbonResult.reductionPotentialPct}%

Foods detected:
${foodList || "- No matched foods"}

Top swap recommendations:
${swapList || "- No swaps needed (excellent choice!)"}

${trendSummary ? `User trend context: ${trendSummary}` : ""}

STRICT RULES — you MUST follow these exactly:
1. Do NOT invent any carbon values, water values, or percentages not listed above
2. Do NOT reference any environmental statistics beyond what is provided
3. Keep your response to 2-3 short, encouraging sentences
4. Reference at most ONE specific number from the data above
5. Focus on one actionable next step
6. Be warm and non-judgmental

Write a brief coaching message for this meal:`;
}

/**
 * AI Coach — calls Gemini with strict anti-hallucination guardrails.
 * Falls back to a deterministic template message if AI is unavailable or unsafe.
 */
export async function generateCoachMessage(
  carbonResult: CarbonResult,
  recommendations: Recommendation[],
  trendSummary?: string,
  apiKey?: string
): Promise<CoachResponse> {
  // Collect all numbers from trusted data — these are the only ones allowed
  const allowedNumbers: number[] = [
    carbonResult.totalCo2eKg,
    carbonResult.totalWaterLiters,
    carbonResult.reductionPotentialPct,
    ...carbonResult.breakdown.flatMap((f) => [f.co2eKg, f.waterLiters, f.portionKg * 1000]),
    ...recommendations.flatMap((r) => [
      r.swap.co2eSavedKg,
      r.swap.reductionPct,
      r.monthlyProjectionKg,
    ]),
  ];

  // If no API key, use deterministic fallback
  if (!apiKey) {
    return {
      message: buildFallbackMessage(carbonResult, recommendations),
      safetyChecked: true,
    };
  }

  const prompt = buildCoachPrompt(carbonResult, recommendations, trendSummary);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 200,
            stopSequences: ["\n\n"],
          },
        }),
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!response.ok) throw new Error(`Gemini ${response.status}`);

    const data = (await response.json()) as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    const rawMessage = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    // Anti-hallucination safety check
    if (!rawMessage || detectHallucinatedNumbers(rawMessage, allowedNumbers)) {
      console.warn("AI Coach: safety check failed — falling back to template");
      return {
        message: buildFallbackMessage(carbonResult, recommendations),
        safetyChecked: false,
      };
    }

    return { message: rawMessage, safetyChecked: true };
  } catch (error) {
    console.error("AI Coach error:", error);
    return {
      message: buildFallbackMessage(carbonResult, recommendations),
      safetyChecked: true,
    };
  }
}

/**
 * Deterministic fallback coach message — no AI, no hallucination risk.
 * Generated from template strings using provided data only.
 */
function buildFallbackMessage(
  carbonResult: CarbonResult,
  recommendations: Recommendation[]
): string {
  const grade = carbonResult.grade;
  const co2e = carbonResult.totalCo2eKg;

  if (grade === "A") {
    return `Excellent choice! Your meal generates just ${co2e} kg CO₂e — one of the lowest-impact options possible. Keep up the great work!`;
  }

  if (grade === "B") {
    return `Great meal! At ${co2e} kg CO₂e, your choices are well below average. Small swaps can take you even lower.`;
  }

  const topSwap = recommendations[0];
  if (topSwap) {
    return `Your meal contributes ${co2e} kg CO₂e. Your highest-impact change: swap ${topSwap.swap.fromFood} for ${topSwap.swap.toFood} to save ${topSwap.swap.co2eSavedKg} kg CO₂e (${topSwap.swap.reductionPct}% reduction).`;
  }

  return `Your meal contributes ${co2e} kg CO₂e. Every meal is a chance to make a more sustainable choice.`;
}
