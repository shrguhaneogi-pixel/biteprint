"use client";

import { motion } from "motion/react";
import type { Recommendation } from "@/types";

interface SwapCardProps {
  recommendation: Recommendation;
  index: number;
}

export function SwapCard({ recommendation, index }: SwapCardProps) {
  const { swap, coachingMessage, monthlyProjectionKg, rank } = recommendation;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="glass-strong rounded-2xl p-5 border border-carbon-700 hover:border-leaf-500/30 transition-colors duration-300"
      aria-labelledby={`swap-${rank}-heading`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Rank badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-6 h-6 rounded-full bg-leaf-500/20 border border-leaf-500/40 text-leaf-400 text-xs font-black flex items-center justify-center flex-shrink-0"
              aria-label={`Recommendation ${rank}`}
            >
              {rank}
            </span>
            <h3
              id={`swap-${rank}-heading`}
              className="text-carbon-400 text-xs font-medium uppercase tracking-wider"
            >
              Swap Recommendation
            </h3>
          </div>

          {/* Swap visualization */}
          <div className="flex items-center gap-3 mb-3">
            <div className="text-center">
              <p className="text-red-400 font-semibold text-sm capitalize">{swap.fromFood}</p>
              <p className="text-carbon-600 text-xs">current</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-carbon-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-leaf-400 font-semibold text-sm capitalize">{swap.toFood}</p>
              <p className="text-carbon-600 text-xs">better option</p>
            </div>
          </div>

          {/* Savings metrics */}
          <dl className="grid grid-cols-2 gap-2 mb-3">
            <div className="glass rounded-xl p-2.5 text-center">
              <dt className="text-carbon-500 text-xs">Per Meal Saving</dt>
              <dd className="text-leaf-400 font-black text-lg leading-tight">
                {swap.co2eSavedKg}
                <span className="text-xs font-normal text-carbon-500 ml-0.5">kg CO₂e</span>
              </dd>
            </div>
            <div className="glass rounded-xl p-2.5 text-center">
              <dt className="text-carbon-500 text-xs">Monthly Projection</dt>
              <dd className="text-leaf-400 font-black text-lg leading-tight">
                {monthlyProjectionKg}
                <span className="text-xs font-normal text-carbon-500 ml-0.5">kg/mo</span>
              </dd>
            </div>
          </dl>

          {/* Coaching message */}
          <p className="text-carbon-300 text-sm leading-relaxed">
            {coachingMessage}
          </p>
        </div>

        {/* Reduction percentage */}
        <div className="flex-shrink-0 text-right">
          <p
            className="text-3xl font-black text-leaf-400"
            aria-label={`${swap.reductionPct} percent reduction`}
          >
            -{swap.reductionPct}%
          </p>
          <p className="text-carbon-500 text-xs">reduction</p>
        </div>
      </div>
    </motion.article>
  );
}
