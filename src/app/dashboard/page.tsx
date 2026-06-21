"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { CarbonChart } from "@/components/dashboard/CarbonChart";
import { MealHistory } from "@/components/dashboard/MealHistory";
import { WeeklyInsights } from "@/components/dashboard/WeeklyInsights";
import { Button } from "@/components/ui/Button";
import { useScanHistory } from "@/hooks/useScanHistory";
import { aggregateDailyTotals, computeTrends } from "@/services/analytics/store";
import type { ScanRecord, TrendData } from "@/types";
import Link from "next/link";

type Period = "week" | "month";

export default function DashboardPage() {
  const { getAll, clearAll } = useScanHistory();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [period, setPeriod] = useState<Period>("week");
  const [trends, setTrends] = useState<TrendData>({
    dailyTotals: [],
    periodCo2eKg: 0,
    avgPerMealKg: 0,
    bestDay: null,
    worstDay: null,
    scanCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      setLoading(true);
      try {
        const all = await getAll(200);
        if (!active) return;
        setScans(all);

        const periodDays = period === "week" ? 7 : 30;
        const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
        const inPeriod = all.filter((s) => s.timestamp >= cutoff);
        const dailyTotals = aggregateDailyTotals(inPeriod);
        const summary = computeTrends(inPeriod, dailyTotals);
        setTrends({ dailyTotals, ...summary });
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchData();
    return () => {
      active = false;
    };
  }, [getAll, period, refreshKey]);

  const handleClearHistory = useCallback(async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearAll();
    setConfirmClear(false);
    setRefreshKey((k) => k + 1);
  }, [confirmClear, clearAll]);

  return (
    <>
      <Navbar />
      <main
        className="max-w-5xl mx-auto px-4 py-10"
        id="main-content"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-carbon-50">Dashboard</h1>
            <p className="text-carbon-400 text-sm mt-1">
              Your dietary carbon footprint over time
            </p>
          </div>
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-leaf-500 text-carbon-950 font-bold text-sm hover:bg-leaf-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf-400 focus-visible:outline-offset-2"
          >
            <span aria-hidden="true">+</span>
            New Scan
          </Link>
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center py-32"
            role="status"
            aria-label="Loading dashboard data"
          >
            <div className="text-carbon-500 text-sm">Loading your data…</div>
          </div>
        ) : scans.length === 0 ? (
          /* Empty state */
          <div className="text-center py-32">
            <p className="text-5xl mb-6" aria-hidden="true">🌱</p>
            <h2 className="text-xl font-bold text-carbon-200 mb-2">
              Your dashboard is waiting
            </h2>
            <p className="text-carbon-500 text-sm mb-8">
              Scan your first meal to start tracking your dietary carbon footprint.
            </p>
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-leaf-500 text-carbon-950 font-bold hover:bg-leaf-400 transition-colors"
            >
              📷 Scan First Meal
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column — Chart + Insights */}
            <div className="lg:col-span-2 space-y-6">
              {/* Period toggle */}
              <div
                className="glass rounded-2xl p-6"
                role="group"
                aria-label="Select time period"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-carbon-100 font-bold">Carbon Trend</h2>
                  <div className="flex gap-1 bg-carbon-900 rounded-xl p-1" role="tablist">
                    {(["week", "month"] as Period[]).map((p) => (
                      <button
                        key={p}
                        role="tab"
                        aria-selected={period === p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf-400 focus-visible:outline-offset-2 ${
                          period === p
                            ? "bg-leaf-500/20 text-leaf-400"
                            : "text-carbon-500 hover:text-carbon-300"
                        }`}
                      >
                        {p === "week" ? "7 Days" : "30 Days"}
                      </button>
                    ))}
                  </div>
                </div>

                <CarbonChart dailyTotals={trends.dailyTotals} period={period} />
              </div>

              {/* Insights */}
              <div className="glass rounded-2xl p-6">
                <WeeklyInsights trends={trends} period={period} />
              </div>
            </div>

            {/* Right column — History */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-carbon-100 font-bold">Recent Meals</h2>
                  <span className="text-carbon-500 text-xs">
                    {scans.length} total
                  </span>
                </div>
                <MealHistory scans={scans.slice(0, 10)} />
              </div>

              {/* Clear history */}
              <div className="glass rounded-2xl p-4 border border-carbon-800">
                <p className="text-carbon-500 text-xs mb-3">
                  All data is stored locally in your browser.
                </p>
                {confirmClear ? (
                  <div className="space-y-2">
                    <p className="text-red-400 text-xs font-medium">
                      This will delete all scan history. Are you sure?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleClearHistory}
                        className="flex-1"
                      >
                        Confirm Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmClear(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearHistory}
                    className="text-carbon-600 hover:text-red-400 w-full"
                    aria-label="Clear all scan history from local storage"
                  >
                    Clear History
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
