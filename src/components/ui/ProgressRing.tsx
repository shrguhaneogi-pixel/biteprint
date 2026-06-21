"use client";

import { motion } from "motion/react";
import type { Grade } from "@/types";
import { GRADE_META } from "@/lib/constants";

interface ProgressRingProps {
  grade: Grade;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
}

const GRADE_ARC: Record<Grade, number> = {
  A: 0.95,
  B: 0.78,
  C: 0.58,
  D: 0.38,
  F: 0.18,
};

export function ProgressRing({
  grade,
  size = 120,
  strokeWidth = 8,
  animated = true,
}: ProgressRingProps) {
  const meta = GRADE_META[grade];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillFraction = GRADE_ARC[grade];
  const dashOffset = circumference * (1 - fillFraction);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Impact grade: ${grade} — ${meta.label}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-carbon-800"
        />
        {/* Animated progress arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={meta.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset: dashOffset }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      {/* Grade label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-black leading-none"
          style={{ color: meta.color }}
        >
          {grade}
        </span>
        <span className="text-[10px] text-carbon-400 font-medium mt-0.5">
          {meta.label}
        </span>
      </div>
    </div>
  );
}
