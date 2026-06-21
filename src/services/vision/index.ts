import type { VisionResult } from "@/types";

/**
 * VisionService interface.
 * All vision adapters must implement this contract.
 * This allows swapping providers without touching business logic.
 */
export interface VisionService {
  /**
   * Analyze an image buffer and return detected food items.
   * @param buffer - Raw image bytes (JPEG, PNG, or WebP)
   * @param mimeType - MIME type of the image
   * @returns Structured vision result with detected foods
   */
  analyzeImage(buffer: Buffer, mimeType: string): Promise<VisionResult>;
}

/**
 * Builds a structured prompt for vision model food detection.
 * Shared across all adapters to ensure consistent output format.
 */
export function buildFoodDetectionPrompt(): string {
  return `You are a food recognition system. Analyze this meal image and identify all visible food items.

Return a JSON object with exactly this structure:
{
  "foods": [
    {
      "name": "lowercase common name of food item",
      "confidence": 0.0 to 1.0,
      "portionGrams": estimated portion in grams as a number, or null if unknown,
      "rawLabel": "exact label you would naturally use to describe this item"
    }
  ]
}

Rules:
- Only include items you can see in the image with confidence > 0.5
- Use simple, common English names (e.g. "beef patty" not "Angus beef medallion")
- Estimate portions conservatively based on typical serving sizes
- Do not invent foods not visible in the image
- Return valid JSON only, no markdown, no explanation`;
}
