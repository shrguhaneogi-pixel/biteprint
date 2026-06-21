"use client";

import { Badge } from "@/components/ui/Badge";
import type { ScanRecord } from "@/types";
import { GRADE_META } from "@/lib/constants";

interface MealHistoryProps {
  scans: ScanRecord[];
  onSelect?: (scan: ScanRecord) => void;
}

export function MealHistory({ scans, onSelect }: MealHistoryProps) {
  if (scans.length === 0) {
    return (
      <div
        className="text-center py-12 text-carbon-500"
        role="status"
        aria-label="No meal history"
      >
        <p className="text-3xl mb-3" aria-hidden="true">🍽️</p>
        <p className="font-medium text-carbon-400">No meals scanned yet</p>
        <p className="text-sm mt-1">Your scan history will appear here</p>
      </div>
    );
  }

  return (
    <section aria-label="Meal scan history">
      <ul className="space-y-3" role="list">
        {scans.map((scan) => {
          const meta = GRADE_META[scan.carbonResult.grade];
          const date = new Date(scan.timestamp);
          const formattedDate = date.toLocaleDateString("en", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          const formattedTime = date.toLocaleTimeString("en", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const topFoods = scan.foods.slice(0, 3).map((f) => f.name);

          return (
            <li key={scan.id}>
              <article
                onClick={() => onSelect?.(scan)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && onSelect) {
                    e.preventDefault();
                    onSelect(scan);
                  }
                }}
                tabIndex={onSelect ? 0 : undefined}
                role={onSelect ? "button" : "article"}
                aria-label={`Meal on ${formattedDate}: ${scan.carbonResult.totalCo2eKg} kg CO₂e, grade ${scan.carbonResult.grade}`}
                className={`glass rounded-xl p-4 flex items-center gap-4 ${
                  onSelect
                    ? "cursor-pointer hover:border-leaf-500/30 border border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf-400 focus-visible:outline-offset-2"
                    : ""
                }`}
              >
                {/* Grade indicator */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0 border"
                  style={{ color: meta.color, borderColor: `${meta.color}40`, backgroundColor: `${meta.color}10` }}
                  aria-hidden="true"
                >
                  {scan.carbonResult.grade}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-carbon-100 text-sm font-medium truncate">
                    {topFoods.join(", ")}
                    {scan.foods.length > 3 && (
                      <span className="text-carbon-500">
                        {" "}+{scan.foods.length - 3} more
                      </span>
                    )}
                  </p>
                  <p className="text-carbon-500 text-xs mt-0.5">
                    {formattedDate} · {formattedTime}
                  </p>
                </div>

                {/* CO₂e value */}
                <div className="text-right flex-shrink-0">
                  <p className="text-carbon-100 font-bold tabular-nums text-sm">
                    {scan.carbonResult.totalCo2eKg}
                    <span className="text-carbon-500 font-normal text-xs ml-0.5">kg</span>
                  </p>
                  <Badge impactLevel={scan.carbonResult.impactLevel} size="sm">
                    {scan.carbonResult.impactLevel}
                  </Badge>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
