import { NextRequest, NextResponse } from "next/server";
import { validateImageBuffer } from "@/lib/validation/image";
import { GeminiVisionService } from "@/services/vision/gemini";

// ============================================================
// Phase 3 — Vision API
// Returns ONLY { foods: string[], confidence: number }
// Explicitly prohibits: calories, nutrition, weight, portions, environmental calculations
// ============================================================

function errorResponse(message: string, code: string, status: number): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

const RATE_WINDOW_MS = 60_000;
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return errorResponse("Rate limit exceeded", "RATE_LIMITED", 429);
  }

  // Parse multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Invalid request body", "INVALID_BODY", 400);
  }

  const imageFile = formData.get("image");
  if (!(imageFile instanceof File)) {
    return errorResponse("Missing 'image' field", "MISSING_IMAGE", 400);
  }

  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Validate image
  const validation = await validateImageBuffer(buffer);
  if (!validation.valid) {
    return errorResponse(validation.reason, "INVALID_IMAGE", 400);
  }

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse("Server configuration error", "CONFIG_ERROR", 503);
  }

  // Call vision service
  const visionService = new GeminiVisionService(apiKey);
  let visionResult;
  try {
    visionResult = await visionService.analyzeImage(buffer, validation.mimeType);
  } catch (error) {
    console.error("Vision API error:", error);
    return errorResponse("Food recognition service unavailable", "VISION_ERROR", 503);
  }

  // Phase 3 contract: return ONLY food names and aggregate confidence
  // No portions, no nutrition, no environmental calculations
  const foods = visionResult.foods.map((f) => f.name);
  const avgConfidence =
    visionResult.foods.length > 0
      ? Math.round(
          (visionResult.foods.reduce((sum, f) => sum + f.confidence, 0) /
            visionResult.foods.length) *
            100
        ) / 100
      : 0;

  return NextResponse.json(
    {
      foods,
      confidence: avgConfidence,
    },
    { status: 200 }
  );
}

export async function GET(): Promise<NextResponse> {
  return errorResponse(
    "Method not allowed. POST an image file.",
    "METHOD_NOT_ALLOWED",
    405
  );
}
