import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
};

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col">
      {/* Hero Section */}
      <section
        className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center relative overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-leaf-500/5 blur-3xl" />
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-leaf-700/5 blur-2xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-leaf-500/30 text-leaf-400 text-sm font-medium">
            <span aria-hidden="true">🌱</span>
            AI-Powered Dietary Carbon Awareness
          </div>

          {/* Heading */}
          <h1
            id="hero-heading"
            className="text-5xl md:text-7xl font-black text-carbon-50 leading-[1.05] tracking-tight"
          >
            Scan Your Meal.{" "}
            <span className="text-gradient-leaf">Understand</span>{" "}
            Your Impact.
          </h1>

          {/* Subheading */}
          <p className="text-xl text-carbon-400 max-w-xl mx-auto leading-relaxed">
            One photo reveals your meal&apos;s full environmental story —
            carbon footprint, water usage, and your single highest-impact
            change.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/scan"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-leaf-500 text-carbon-950 font-black text-base hover:bg-leaf-400 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf-400 focus-visible:outline-offset-2 shadow-glow-leaf"
              aria-label="Start scanning your meal now"
            >
              <span aria-hidden="true">📷</span>
              Scan Your Meal
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl glass border border-carbon-700 text-carbon-100 font-semibold text-base hover:border-leaf-500/40 hover:text-leaf-400 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf-400 focus-visible:outline-offset-2"
              aria-label="View your carbon trend dashboard"
            >
              <span aria-hidden="true">📊</span>
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        className="px-4 pb-24 max-w-5xl mx-auto w-full"
        aria-labelledby="how-it-works-heading"
      >
        <h2
          id="how-it-works-heading"
          className="text-center text-carbon-400 text-sm font-bold uppercase tracking-widest mb-12"
        >
          How It Works
        </h2>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8" role="list">
          {[
            {
              step: "1",
              emoji: "📷",
              title: "Capture",
              description:
                "Take or upload a photo of any meal — homemade, restaurant, or cafeteria.",
            },
            {
              step: "2",
              emoji: "🔬",
              title: "Analyze",
              description:
                "AI identifies food items. You review and confirm before any calculation begins.",
            },
            {
              step: "3",
              emoji: "📋",
              title: "Environmental Label",
              description:
                "Receive a full Environmental Nutrition Label with carbon footprint, water usage, and personalized swap recommendations.",
            },
          ].map(({ step, emoji, title, description }) => (
            <li key={step}>
              <article className="glass rounded-2xl p-6 h-full">
                <header className="flex items-center gap-3 mb-4">
                  <span
                    className="w-8 h-8 rounded-full bg-leaf-500/20 border border-leaf-500/30 text-leaf-400 text-sm font-black flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {step}
                  </span>
                  <span className="text-2xl" aria-hidden="true">{emoji}</span>
                  <h3 className="font-bold text-carbon-100">{title}</h3>
                </header>
                <p className="text-carbon-400 text-sm leading-relaxed">
                  {description}
                </p>
              </article>
            </li>
          ))}
        </ol>
      </section>

      {/* Footer */}
      <footer className="border-t border-carbon-800 py-8 px-4 text-center">
        <p className="text-carbon-600 text-sm">
          Environmental data sourced from Poore &amp; Nemecek (2018) lifecycle assessment research.
        </p>
        <nav aria-label="Footer navigation" className="mt-4">
          <ul className="flex justify-center gap-6" role="list">
            <li>
              <Link href="/scan" className="text-carbon-500 hover:text-leaf-400 text-sm transition-colors">
                Scan Meal
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="text-carbon-500 hover:text-leaf-400 text-sm transition-colors">
                Dashboard
              </Link>
            </li>
          </ul>
        </nav>
      </footer>
    </main>
  );
}
