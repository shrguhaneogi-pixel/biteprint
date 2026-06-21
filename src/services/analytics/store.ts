import { openDB, type IDBPDatabase } from "idb";
import type { AnalyticsService } from "./index";
import type { DailyTotal, ScanRecord, TrendData } from "@/types";

const DB_NAME = "biteprint";
const DB_VERSION = 1;
const STORE_NAME = "scans";

/**
 * Open (or create) the IndexedDB database.
 * Handles schema creation on first run.
 */
async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    },
  });
}

/**
 * Aggregate ScanRecord[] into daily totals for trend charts.
 * Pure function — no side effects.
 */
export function aggregateDailyTotals(records: ScanRecord[]): DailyTotal[] {
  const byDate = new Map<string, { totalCo2e: number; count: number }>();

  for (const record of records) {
    const date = new Date(record.timestamp).toISOString().slice(0, 10);
    const existing = byDate.get(date) ?? { totalCo2e: 0, count: 0 };
    byDate.set(date, {
      totalCo2e: existing.totalCo2e + record.carbonResult.totalCo2eKg,
      count: existing.count + 1,
    });
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { totalCo2e, count }]) => ({
      date,
      totalCo2eKg: Math.round(totalCo2e * 100) / 100,
      scanCount: count,
      avgPerMealKg: Math.round((totalCo2e / count) * 100) / 100,
    }));
}

/**
 * Compute trend summary from daily totals.
 * Pure function — no side effects.
 */
export function computeTrends(
  records: ScanRecord[],
  dailyTotals: DailyTotal[]
): Omit<TrendData, "dailyTotals"> {
  const periodCo2eKg =
    Math.round(
      dailyTotals.reduce((sum, d) => sum + d.totalCo2eKg, 0) * 100
    ) / 100;

  const scanCount = records.length;
  const avgPerMealKg =
    scanCount > 0
      ? Math.round((periodCo2eKg / scanCount) * 100) / 100
      : 0;

  const bestDay =
    dailyTotals.length > 0
      ? dailyTotals.reduce((a, b) =>
          a.totalCo2eKg < b.totalCo2eKg ? a : b
        ).date
      : null;

  const worstDay =
    dailyTotals.length > 0
      ? dailyTotals.reduce((a, b) =>
          a.totalCo2eKg > b.totalCo2eKg ? a : b
        ).date
      : null;

  return { periodCo2eKg, avgPerMealKg, bestDay, worstDay, scanCount };
}

/**
 * Analytics service implementation backed by IndexedDB.
 * All data is stored client-side — no server communication.
 */
export const analyticsService: AnalyticsService = {
  async saveScan(record: ScanRecord): Promise<void> {
    const db = await getDb();
    await db.put(STORE_NAME, record);
  },

  async getHistory(limit = 50): Promise<ScanRecord[]> {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.store.index("timestamp");

    // Iterate cursor in reverse (newest first)
    const records: ScanRecord[] = [];
    let cursor = await index.openCursor(null, "prev");
    while (cursor && records.length < limit) {
      records.push(cursor.value as ScanRecord);
      cursor = await cursor.continue();
    }

    return records;
  },

  async getTrends(period: "week" | "month"): Promise<TrendData> {
    const db = await getDb();
    const periodDays = period === "week" ? 7 : 30;
    const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;

    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.store.index("timestamp");

    // Fetch only records within the period using IDBKeyRange
    const range = IDBKeyRange.lowerBound(cutoff);
    const records = (await index.getAll(range)) as ScanRecord[];

    const dailyTotals = aggregateDailyTotals(records);
    const summary = computeTrends(records, dailyTotals);

    return { dailyTotals, ...summary };
  },

  async clearHistory(): Promise<void> {
    const db = await getDb();
    await db.clear(STORE_NAME);
  },
};
