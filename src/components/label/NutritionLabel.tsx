"use client";

import { motion } from "motion/react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Badge } from "@/components/ui/Badge";
import type { CarbonResult, Recommendation } from "@/types";

// Phase 3 — Environmental Nutrition Label
// Styled after the US Nutrition Facts label format for instant familiarity.
// Semantic HTML: <table>, <dl>, <section> with proper headings and ARIA.

interface NutritionLabelProps {
  carbonResult: CarbonResult;
  recommendations: Recommendation[];
  coachMessage?: string;
}

function LabelRow({
  label,
  value,
  unit,
  highlight,
  bold,
}: {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between py-2 border-b border-carbon-800 ${
        highlight ? "text-leaf-400" : ""
      }`}
    >
      <dt className={`text-sm ${bold ? "font-bold text-carbon-100" : "text-carbon-300"}`}>
        {label}
      </dt>
      <dd className={`text-sm tabular-nums ${bold ? "font-black text-carbon-50" : "font-semibold text-carbon-100"}`}>
        {value}
        {unit && (
          <span className="text-carbon-500 font-normal ml-1 text-xs">{unit}</span>
        )}
      </dd>
    </div>
  );
}

export function NutritionLabel({
  carbonResult,
  recommendations,
  coachMessage,
}: NutritionLabelProps) {
  const { totalCo2eKg, totalWaterLiters, grade, impactLevel, primarySource, reductionPotentialPct, breakdown } =
    carbonResult;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      aria-labelledby="env-label-heading"
      className="label-panel p-0 overflow-hidden max-w-md w-full"
    >
      {/* Header */}
      <header className="bg-carbon-900 px-6 pt-6 pb-4 border-b-4 border-carbon-600">
        <h2
          id="env-label-heading"
          className="text-2xl font-black text-carbon-50 tracking-tight"
        >
          Environmental
          <br />
          Nutrition Facts
        </h2>
        <p className="text-carbon-400 text-xs mt-1">
          Powered by Poore &amp; Nemecek (2018) lifecycle data
        </p>
      </header>

      {/* Grade + primary metrics */}
      <div className="px-6 py-5 border-b-4 border-carbon-600 flex items-center gap-6">
        <ProgressRing grade={grade} size={100} />
        <dl className="flex-1 space-y-1">
          <LabelRow
            label="Carbon Footprint"
            value={totalCo2eKg}
            unit="kg CO₂e"
            bold
          />
          <LabelRow
            label="Water Footprint"
            value={totalWaterLiters.toLocaleString()}
            unit="L"
            bold
          />
        </dl>
      </div>

      {/* Detail metrics */}
      <dl className="px-6 py-4 border-b border-carbon-800">
        <LabelRow
          label="Impact Level"
          value={impactLevel.charAt(0).toUpperCase() + impactLevel.slice(1)}
          highlight={impactLevel === "low"}
        />
        <LabelRow
          label="Primary Emission Source"
          value={primarySource}
        />
        <LabelRow
          label="Reduction Potential"
          value={`${reductionPotentialPct}%`}
          highlight
        />
      </dl>

      {/* Breakdown table */}
      {breakdown.length > 0 && (
        <section className="px-6 py-4 border-b border-carbon-800">
          <h3 className="text-xs font-bold text-carbon-400 uppercase tracking-wider mb-3">
            Per Food Item
          </h3>
          <table className="w-full text-xs" aria-label="Carbon breakdown by food item">
            <thead>
              <tr className="text-carbon-500">
                <th scope="col" className="text-left font-medium pb-2">Food</th>
                <th scope="col" className="text-right font-medium pb-2">CO₂e</th>
                <th scope="col" className="text-right font-medium pb-2">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-carbon-900">
              {breakdown.map((item) => (
                <tr key={item.foodId} className="text-carbon-300">
                  <td className="py-1.5 text-carbon-200">{item.name}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {item.co2eKg} kg
                  </td>
                  <td className="py-1.5 text-right">
                    <Badge
                      impactLevel={item.impactLevel}
                      size="sm"
                    >
                      {item.impactLevel}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Swap recommendations */}
      {recommendations.length > 0 && (
        <section
          className="px-6 py-4 border-b border-carbon-800"
          aria-label="Food swap recommendations"
        >
          <h3 className="text-xs font-bold text-carbon-400 uppercase tracking-wider mb-3">
            Reduction Opportunities
          </h3>
          <ul className="space-y-3" role="list">
            {recommendations.map((rec) => (
              <li
                key={`${rec.swap.fromFoodId}-${rec.swap.toFoodId}`}
                className="glass rounded-xl p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-carbon-100 text-sm font-medium">
                      <span className="text-red-400">{rec.swap.fromFood}</span>
                      <span className="text-carbon-500 mx-2">→</span>
                      <span className="text-leaf-400">{rec.swap.toFood}</span>
                    </p>
                    <p className="text-carbon-400 text-xs mt-0.5">
                      Save {rec.swap.co2eSavedKg} kg CO₂e per meal
                    </p>
                  </div>
                  <span className="text-leaf-400 font-black text-sm flex-shrink-0">
                    -{rec.swap.reductionPct}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AI Coach message */}
      {coachMessage && (
        <section
          className="px-6 py-4 bg-leaf-500/5 border-t border-leaf-500/20"
          aria-label="Sustainability coaching message"
        >
          <div className="flex gap-3">
            <span className="text-2xl flex-shrink-0" aria-hidden="true">🌱</span>
            <p className="text-carbon-200 text-sm leading-relaxed italic">
              {coachMessage}
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-6 py-3 bg-carbon-900/50">
        <p className="text-carbon-600 text-[10px] leading-relaxed">
          * Values based on lifecycle assessment (LCA) data. Actual emissions vary by
          production method, region, and season. Source: Poore &amp; Nemecek (2018).
        </p>
      </footer>
    </motion.article>
  );
}
