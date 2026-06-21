import { z } from "zod";

// ============================================================
// API Input Schemas
// ============================================================

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

/**
 * Validates a File object before it reaches the image processor.
 * This is a lightweight pre-check; Sharp does the authoritative validation.
 */
export const ImageFileSchema = z
  .instanceof(File)
  .refine(
    (f) => f.size > 0,
    "Image file is empty"
  )
  .refine(
    (f) => f.size <= MAX_FILE_SIZE_BYTES,
    `Image exceeds maximum size of 5 MB`
  )
  .refine(
    (f) => (ACCEPTED_MIME_TYPES as readonly string[]).includes(f.type),
    `Unsupported file type. Accepted formats: JPEG, PNG, WebP`
  );

/**
 * Scan API request schema.
 */
export const ScanRequestSchema = z.object({
  image: ImageFileSchema,
});

// ============================================================
// API Response Schemas (for outbound validation)
// ============================================================

export const ImpactLevelSchema = z.enum(["low", "moderate", "high"]);
export const GradeSchema = z.enum(["A", "B", "C", "D", "F"]);

export const DetectedFoodSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
  portionGrams: z.number().positive().nullable(),
  rawLabel: z.string(),
  datasetId: z.string().nullable(),
});

export const FoodImpactSchema = z.object({
  foodId: z.string(),
  name: z.string(),
  co2eKg: z.number().nonnegative(),
  waterLiters: z.number().nonnegative(),
  portionKg: z.number().positive(),
  impactLevel: ImpactLevelSchema,
  source: z.string(),
});

export const CarbonResultSchema = z.object({
  totalCo2eKg: z.number().nonnegative(),
  totalWaterLiters: z.number().nonnegative(),
  grade: GradeSchema,
  impactLevel: ImpactLevelSchema,
  primarySource: z.string(),
  reductionPotentialPct: z.number().min(0).max(100),
  breakdown: z.array(FoodImpactSchema),
  datasetVersion: z.string(),
});

export const FoodSwapSchema = z.object({
  fromFoodId: z.string(),
  fromFood: z.string(),
  toFoodId: z.string(),
  toFood: z.string(),
  co2eSavedKg: z.number().nonnegative(),
  waterSavedLiters: z.number(),
  reductionPct: z.number().min(0).max(100),
});

export const RecommendationSchema = z.object({
  rank: z.number().int().positive(),
  swap: FoodSwapSchema,
  coachingMessage: z.string().min(1),
  monthlyProjectionKg: z.number().nonnegative(),
});

export const ScanResponseSchema = z.object({
  scanId: z.string().uuid(),
  foods: z.array(DetectedFoodSchema),
  carbonResult: CarbonResultSchema,
  recommendations: z.array(RecommendationSchema),
  meta: z.object({
    processingMs: z.number().nonnegative(),
    visionModel: z.string(),
    datasetVersion: z.string(),
    timestamp: z.number(),
  }),
});
