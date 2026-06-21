import type { ScanRecord, TrendData } from "@/types";

/**
 * AnalyticsService interface.
 * Client-side persistence and trend aggregation — zero server-side storage.
 * Backed by IndexedDB via the `idb` library.
 */
export interface AnalyticsService {
  /**
   * Save a completed scan record to local storage.
   * @param record - The full scan result to persist
   */
  saveScan(record: ScanRecord): Promise<void>;

  /**
   * Retrieve scan history, newest first.
   * @param limit - Max number of records to return (default: 50)
   */
  getHistory(limit?: number): Promise<ScanRecord[]>;

  /**
   * Aggregate trend data for a time period.
   * @param period - 'week' (7 days) or 'month' (30 days)
   */
  getTrends(period: "week" | "month"): Promise<TrendData>;

  /**
   * Delete all scan history from local storage.
   * Satisfies GDPR right-to-erasure for client-side data.
   */
  clearHistory(): Promise<void>;
}
