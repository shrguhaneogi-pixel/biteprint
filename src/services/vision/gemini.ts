import type { VisionService } from "./index";
import type { DetectedFood, VisionResult } from "@/types";
import { buildFoodDetectionPrompt } from "./index";
import { findDatasetId } from "@/services/carbon/dataset";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-2.0-flash";

interface GeminiCandidate {
  content: {
    parts: Array<{ text: string }>;
  };
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
  modelVersion: string;
}

interface RawFoodItem {
  name: unknown;
  confidence: unknown;
  portionGrams: unknown;
  rawLabel: unknown;
}

/**
 * Gemini Vision adapter for food detection.
 * Uses gemini-2.0-flash with structured JSON output.
 * Image buffer is sent as base64 inline data — never stored.
 */
export class GeminiVisionService implements VisionService {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("GeminiVisionService: apiKey is required");
    }
    this.apiKey = apiKey;
  }

  async analyzeImage(buffer: Buffer, mimeType: string): Promise<VisionResult> {
    const startMs = Date.now();
    const base64Image = buffer.toString("base64");
    const prompt = buildFoodDetectionPrompt();

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1, // Low temperature for deterministic food identification
        maxOutputTokens: 1024,
      },
    };

    const url = `${GEMINI_API_BASE}/models/${MODEL}:generateContent?key=${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15_000), // 15s timeout
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error("Vision API request timed out after 15 seconds");
      }
      throw new Error(`Vision API network error: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Gemini API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    const parsed = this.parseVisionOutput(text);
    const processingMs = Date.now() - startMs;

    return {
      foods: parsed,
      modelVersion: data.modelVersion ?? MODEL,
      processingMs,
    };
  }

  private parseVisionOutput(raw: string): DetectedFood[] {
    let parsed: { foods?: RawFoodItem[] };
    try {
      parsed = JSON.parse(raw) as { foods?: RawFoodItem[] };
    } catch {
      // Model returned malformed JSON — return empty result rather than crash
      return [];
    }

    if (!Array.isArray(parsed.foods)) {
      return [];
    }

    return parsed.foods
      .filter((item): item is RawFoodItem => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof item.name === "string" &&
          typeof item.confidence === "number"
        );
      })
      .filter((item) => (item.confidence as number) >= 0.5)
      .map((item) => {
        const name = (item.name as string).toLowerCase().trim();
        return {
          name,
          confidence: Math.min(1, Math.max(0, item.confidence as number)),
          portionGrams:
            typeof item.portionGrams === "number" && item.portionGrams > 0
              ? item.portionGrams
              : null,
          rawLabel: typeof item.rawLabel === "string" ? item.rawLabel : name,
          datasetId: findDatasetId(name),
        };
      });
  }
}
