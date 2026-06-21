"use client";

import type { TrendData } from "@/types";

interface WeeklyInsightsProps {
  trends: TrendData;
  period: "week" | "month";
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

function StatCard({ label, value, sub, highlight }: StatCardProps) {
  return (
    <div className="glass rounded-xl p-4 text-center">
      <p className="text-carbon-500 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p
        className={`text-2xl font-black mt-1 tabular-nums ${
          highlight ? "text-leaf-400" : "text-carbon-100"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-carbon-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export function WeeklyInsights({ trends, period }: WeeklyInsightsProps) {
  const periodLabel = period === "week" ? "7-Day" : "30-Day";
  const { periodCo2eKg, avgPerMealKg, bestDay, worstDay, scanCount } = trends;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <section aria-label={`${periodLabel} sustainability insights`}>
      <h3 className="text-xs font-bold text-carbon-400 uppercase tracking-wider mb-4">
        {periodLabel} Summary
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard
          label={`${periodLabel} Total`}
          value={`${periodCo2eKg}`}
          sub="kg CO₂e"
        />
        <StatCard
          label="Avg Per Meal"
          value={`${avgPerMealKg}`}
          sub="kg CO₂e"
        />
        <StatCard
          label="Meals Scanned"
          value={`${scanCount}`}
          sub="total"
        />
        {bestDay && (
          <StatCard
            label="Best Day"
            value={formatDate(bestDay)}
            highlight
          />
        )}
      </div>

      {worstDay && (
        <div className="glass rounded-xl p-4">
          <p className="text-carbon-500 text-xs font-medium uppercase tracking-wider mb-1">
            Highest Impact Day
          </p>
          <p className="text-carbon-200 text-sm">
            {formatDate(worstDay)} — consider this your biggest opportunity
          </p>
        </div>
      )}

      {scanCount === 0 && (
        <p className="text-carbon-500 text-sm text-center py-4">
          Scan meals to see your {period}ly insights here.
        </p>
      )}
    </section>
  );
}
