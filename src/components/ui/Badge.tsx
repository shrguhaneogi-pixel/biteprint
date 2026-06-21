import type { HTMLAttributes } from "react";
import type { ImpactLevel } from "@/types";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "leaf" | "impact" | "grade" | "carbon";
  impactLevel?: ImpactLevel;
  size?: "sm" | "md";
}

const IMPACT_CLASSES: Record<ImpactLevel, string> = {
  low: "bg-leaf-500/20 text-leaf-400 border-leaf-500/30",
  moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function Badge({
  variant = "leaf",
  impactLevel,
  size = "md",
  children,
  className = "",
  ...props
}: BadgeProps) {
  const base = "inline-flex items-center gap-1 rounded-full border font-medium";
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
  };

  let variantClass = "bg-leaf-500/20 text-leaf-400 border-leaf-500/30";
  if (impactLevel) {
    variantClass = IMPACT_CLASSES[impactLevel];
  } else if (variant === "carbon") {
    variantClass = "bg-carbon-700/60 text-carbon-300 border-carbon-600/40";
  }

  return (
    <span
      className={`${base} ${sizes[size]} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
