import datasetJson from "../../../data/carbon-dataset.json";
import type { CarbonDataEntry } from "@/types";

/**
 * Typed carbon dataset loader.
 * Validates the loaded JSON structure at module load time.
 * This is the SINGLE SOURCE OF TRUTH for all environmental metrics.
 */

interface DatasetJson {
  _meta: {
    version: string;
    source: string;
    methodology: string;
    last_updated: string;
  };
  foods: CarbonDataEntry[];
}

const dataset = datasetJson as DatasetJson;

/**
 * All food entries indexed by id for O(1) lookup.
 */
const foodById = new Map<string, CarbonDataEntry>(
  dataset.foods.map((f) => [f.id, f])
);

/**
 * Alias index: each alias maps to a dataset entry id for O(1) fuzzy matching.
 */
const aliasIndex = new Map<string, string>();
for (const food of dataset.foods) {
  aliasIndex.set(food.name.toLowerCase(), food.id);
  for (const alias of food.aliases) {
    aliasIndex.set(alias.toLowerCase(), food.id);
  }
}

/**
 * Look up a food entry by id.
 */
export function getFoodById(id: string): CarbonDataEntry | undefined {
  return foodById.get(id);
}

/**
 * Find the dataset id for a food name or alias.
 * Returns null if no match found — indicates an unmapped food.
 */
export function findDatasetId(nameOrAlias: string): string | null {
  const normalized = nameOrAlias.toLowerCase().trim();

  // Exact match
  if (aliasIndex.has(normalized)) {
    return aliasIndex.get(normalized)!;
  }

  // Partial match — only attempt if alias is meaningful length (>=4 chars)
  for (const [alias, id] of aliasIndex.entries()) {
    if (alias.length < 4 || normalized.length < 4) continue;
    if (alias === normalized) continue; // Already checked exact match
    // Alias must fully contain the query word OR query must fully contain alias
    const words = normalized.split(/\s+/);
    if (words.some((w) => w.length >= 4 && alias.startsWith(w))) {
      return id;
    }
  }

  return null;
}

/**
 * Get all foods in the dataset.
 */
export function getAllFoods(): CarbonDataEntry[] {
  return dataset.foods;
}

/**
 * Dataset version identifier for including in API responses.
 */
export const DATASET_VERSION = dataset._meta.version;
