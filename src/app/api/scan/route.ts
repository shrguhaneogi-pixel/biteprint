import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { validateImageBuffer } from "@/lib/validation/image";
import { GeminiVisionService } from "@/services/vision/gemini";
import { carbonScorer } from "@/services/carbon/scorer";
import { recommendationEngine } from "@/services/recommendation/engine";
import type { DetectedFood, ScanResponse } from "@/types";

// ============================================================
// Rate Limiting (in-memory sliding window)
// Resets on server restart — acceptable for MVP
// ============================================================

const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX_REQUESTS = 10;

const ipWindows = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const window = ipWindows.get(ip);

  if (!window || now > window.resetAt) {
    ipWindows.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true };
  }

  if (window.count >= RATE_MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: window.resetAt - now };
  }

  window.count++;
  return { allowed: true };
}

// ============================================================
// Helpers
// ============================================================

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function errorResponse(
  message: string,
  code: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

import { findDatasetId } from "@/services/carbon/dataset";

// ============================================================
// Route Handler
// ============================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const pipelineStart = Date.now();

  // 1. Rate limiting
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return errorResponse(
      "Rate limit exceeded. Please wait before scanning again.",
      "RATE_LIMITED",
      429,
      { retryAfterMs: rateCheck.retryAfterMs }
    );
  }

  // 2. Route request based on content type
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let body: { foods?: string[] };
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", "INVALID_BODY", 400);
    }

    const { foods } = body;
    if (!foods || !Array.isArray(foods)) {
      return errorResponse("Missing or invalid 'foods' list in request body", "INVALID_INPUT", 400);
    }

    // Convert validated food names into DetectedFood[] objects
    const detectedFoods: DetectedFood[] = foods.map((name) => {
      const datasetId = findDatasetId(name);
      return {
        name: name.trim(),
        confidence: 1.0,
        portionGrams: null, // default portion is applied by the scorer
        rawLabel: name,
        datasetId,
      };
    });

    // Run scoring & recommendation
    const carbonResult = carbonScorer.score(detectedFoods);
    const recommendations = recommendationEngine.recommend(carbonResult);

    const scanResponse: ScanResponse = {
      scanId: randomUUID(),
      foods: detectedFoods,
      carbonResult,
      recommendations,
      meta: {
        processingMs: Date.now() - pipelineStart,
        visionModel: "validated-checklist",
        datasetVersion: carbonResult.datasetVersion,
        timestamp: Date.now(),
      },
    };

    return NextResponse.json(scanResponse, { status: 200 });
  }

  // 3. Fallback to multipart image processing
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Invalid request body", "INVALID_BODY", 400);
  }

  const imageFile = formData.get("image");
  if (!(imageFile instanceof File)) {
    return errorResponse(
      "Missing or invalid 'image' field in form data",
      "MISSING_IMAGE",
      400
    );
  }

  // 3. Convert File to Buffer (in-memory only — never touches disk)
  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 4. Server-side image validation (magic bytes + Sharp)
  const imageValidation = await validateImageBuffer(buffer);
  if (!imageValidation.valid) {
    return errorResponse(imageValidation.reason, "INVALID_IMAGE", 400);
  }

  // 5. Vision API — identify foods
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return errorResponse(
      "Server configuration error",
      "CONFIG_ERROR",
      503
    );
  }

  const visionService = new GeminiVisionService(apiKey);
  let visionResult;

  try {
    visionResult = await visionService.analyzeImage(buffer, imageValidation.mimeType);
  } catch (error) {
    console.error("Vision API error:", error);
    return errorResponse(
      "Food analysis service temporarily unavailable",
      "VISION_ERROR",
      503
    );
  }

  // Buffer is now eligible for GC — we hold no reference to it after this point

  // 6. Carbon scoring (pure function — no async)
  const carbonResult = carbonScorer.score(visionResult.foods);

  // 7. Recommendation engine (pure function — no async)
  const recommendations = recommendationEngine.recommend(carbonResult);

  // 8. Compose response
  const scanResponse: ScanResponse = {
    scanId: randomUUID(),
    foods: visionResult.foods,
    carbonResult,
    recommendations,
    meta: {
      processingMs: Date.now() - pipelineStart,
      visionModel: visionResult.modelVersion,
      datasetVersion: carbonResult.datasetVersion,
      timestamp: Date.now(),
    },
  };

  return NextResponse.json(scanResponse, { status: 200 });
}

// Reject all other HTTP methods
export async function GET(): Promise<NextResponse> {
  return errorResponse("Method not allowed. Use POST to submit a meal scan.", "METHOD_NOT_ALLOWED", 405);
}
