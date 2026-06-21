import type { VisionService } from "@/services/vision/index";
import type { DetectedFood, VisionResult } from "@/types";

/**
 * Mock vision service for unit and component tests.
 * Returns a fixed, deterministic result without making API calls.
 * Accepts a foods override to control detection output per test.
 */
export function createMockVisionService(
  foods: DetectedFood[] = [
    {
      name: "beef patty",
      confidence: 0.95,
      portionGrams: 150,
      rawLabel: "beef burger",
      datasetId: "beef-cattle",
    },
    {
      name: "french fries",
      confidence: 0.9,
      portionGrams: 120,
      rawLabel: "fries",
      datasetId: "potato",
    },
  ]
): VisionService {
  return {
    analyzeImage: async (_buffer: Buffer, _mimeType: string): Promise<VisionResult> => ({
      foods,
      modelVersion: "mock-1.0",
      processingMs: 0,
    }),
  };
}

/**
 * Mock that simulates a Vision API error.
 */
export const failingVisionService: VisionService = {
  analyzeImage: async () => {
    throw new Error("Mock vision API error");
  },
};

/**
 * Mock that returns no detected foods (e.g., blurry/empty image).
 */
export const emptyVisionService: VisionService = {
  analyzeImage: async (): Promise<VisionResult> => ({
    foods: [],
    modelVersion: "mock-1.0",
    processingMs: 0,
  }),
};
