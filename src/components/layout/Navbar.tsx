"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { APP_NAME } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/scan", label: "Scan Meal", icon: "📷" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-carbon-800/60">
      <nav
        className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf-400 focus-visible:outline-offset-2 rounded-lg"
          aria-label={`${APP_NAME} — Home`}
        >
          <span className="text-xl" aria-hidden="true">🌿</span>
          <span className="font-black text-carbon-50 text-sm">
            {APP_NAME}
          </span>
        </Link>

        {/* Nav links */}
        <ul className="flex items-center gap-1" role="list">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive = pathname === href || pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`
                    relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf-400 focus-visible:outline-offset-2
                    ${isActive
                      ? "text-leaf-400"
                      : "text-carbon-400 hover:text-carbon-100"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span aria-hidden="true">{icon}</span>
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-leaf-500/10 rounded-lg border border-leaf-500/20"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      aria-hidden="true"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
