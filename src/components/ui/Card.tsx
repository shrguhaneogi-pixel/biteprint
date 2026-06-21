"use client";

import { motion } from "motion/react";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "bordered" | "glow";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

export function Card({
  variant = "glass",
  padding = "md",
  hover = false,
  children,
  className = "",
  ...props
}: CardProps) {
  const variants = {
    default: "bg-carbon-900 rounded-2xl",
    glass: "glass rounded-2xl",
    bordered: "glass-strong rounded-2xl border border-carbon-700",
    glow: "glass rounded-2xl border border-leaf-500/30 shadow-glow-leaf",
  };

  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const hoverClass = hover ? "hover:border-leaf-500/40 transition-colors duration-300" : "";

  const combinedClassName = `${variants[variant]} ${paddings[padding]} ${hoverClass} ${className}`;

  if (hover) {
    return (
      <motion.div
        className={combinedClassName}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
}
