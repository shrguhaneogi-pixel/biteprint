"use client";

import { useMemo } from "react";
import type { DailyTotal } from "@/types";

interface CarbonChartProps {
  dailyTotals: DailyTotal[];
  period: "week" | "month";
}

const WIDTH = 400;
const HEIGHT = 120;
const PADDING = { top: 16, right: 16, bottom: 32, left: 48 };
const chartWidth = WIDTH - PADDING.left - PADDING.right;
const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;

// Pure SVG sparkline chart — no chart library, zero extra dependencies.
export function CarbonChart({ dailyTotals, period }: CarbonChartProps) {

  const data = useMemo(() => {
    if (dailyTotals.length === 0) return null;

    const maxCo2e = Math.max(...dailyTotals.map((d) => d.totalCo2eKg), 0.1);
    const minCo2e = 0;

    const points = dailyTotals.map((d, i) => {
      const x = PADDING.left + (i / Math.max(dailyTotals.length - 1, 1)) * chartWidth;
      const y =
        PADDING.top +
        chartHeight -
        ((d.totalCo2eKg - minCo2e) / (maxCo2e - minCo2e)) * chartHeight;
      return { x, y, d };
    });

    const linePath =
      points.length > 1
        ? points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ")
        : "";

    const areaPath =
      points.length > 1
        ? `${linePath} L ${points[points.length - 1].x} ${HEIGHT - PADDING.bottom} L ${points[0].x} ${HEIGHT - PADDING.bottom} Z`
        : "";

    return { points, linePath, areaPath, maxCo2e };
  }, [dailyTotals]);

  if (dailyTotals.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-[120px] text-carbon-600 text-sm"
        role="img"
        aria-label="No carbon trend data available yet"
      >
        No data yet · Scan a meal to begin tracking
      </div>
    );
  }

  const totalInPeriod = dailyTotals.reduce((sum, d) => sum + d.totalCo2eKg, 0);
  const avgPerDay = totalInPeriod / dailyTotals.length;

  return (
    <figure aria-label={`Carbon footprint trend over the past ${period}`}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${period === "week" ? "7-day" : "30-day"} carbon footprint chart. Average: ${avgPerDay.toFixed(2)} kg CO₂e per day.`}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-leaf-500)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-leaf-500)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PADDING.top + frac * chartHeight;
          const val = ((1 - frac) * (data?.maxCo2e ?? 0)).toFixed(1);
          return (
            <g key={frac}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y}
                y2={y}
                stroke="var(--color-carbon-800)"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="var(--color-carbon-600)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {data && (
          <path
            d={data.areaPath}
            fill="url(#areaGradient)"
            aria-hidden="true"
          />
        )}

        {/* Line */}
        {data && (
          <path
            d={data.linePath}
            fill="none"
            stroke="var(--color-leaf-500)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          />
        )}

        {/* Data points */}
        {data?.points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill="var(--color-leaf-500)"
              stroke="var(--color-carbon-950)"
              strokeWidth={2}
              aria-label={`${point.d.date}: ${point.d.totalCo2eKg} kg CO₂e`}
            />
          </g>
        ))}

        {/* X-axis date labels — show first, middle, last */}
        {data?.points
          .filter((_, i, arr) =>
            i === 0 || i === Math.floor(arr.length / 2) || i === arr.length - 1
          )
          .map((point) => (
            <text
              key={point.d.date}
              x={point.x}
              y={HEIGHT - PADDING.bottom + 18}
              textAnchor="middle"
              fontSize={9}
              fill="var(--color-carbon-600)"
            >
              {new Date(point.d.date).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
              })}
            </text>
          ))}
      </svg>
      <figcaption className="sr-only">
        {period === "week" ? "7" : "30"}-day carbon footprint trend.
        Total: {totalInPeriod.toFixed(2)} kg CO₂e.
        Average: {avgPerDay.toFixed(2)} kg CO₂e per day.
      </figcaption>
    </figure>
  );
}
