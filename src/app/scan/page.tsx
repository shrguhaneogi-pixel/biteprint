"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "@/components/layout/Navbar";
import { ImageUploader } from "@/components/scanner/ImageUploader";
import { FoodValidation } from "@/components/scanner/FoodValidation";
import { NutritionLabel } from "@/components/label/NutritionLabel";
import { SwapCard } from "@/components/label/SwapCard";
import { Button } from "@/components/ui/Button";
import { useScanHistory } from "@/hooks/useScanHistory";
import type { ScanResponse } from "@/types";

type ScanPhase =
  | { tag: "idle" }
  | { tag: "uploaded"; foods: string[]; confidence: number; imageFormData: FormData }
  | { tag: "analyzing" }
  | { tag: "done"; result: ScanResponse; coachMessage?: string }
  | { tag: "error"; message: string };

export default function ScanPage() {
  const [phase, setPhase] = useState<ScanPhase>({ tag: "idle" });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { save } = useScanHistory();

  // Step 1: Image uploaded → call vision API → show validation
  const handleImageReady = useCallback(async (file: File) => {
    setUploadedFile(file);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/vision", { method: "POST", body: formData });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setPhase({ tag: "error", message: err.error ?? "Vision API failed" });
        return;
      }
      const data = (await res.json()) as { foods: string[]; confidence: number };
      setPhase({
        tag: "uploaded",
        foods: data.foods,
        confidence: data.confidence,
        imageFormData: formData,
      });
    } catch {
      setPhase({ tag: "error", message: "Could not connect to analysis service." });
    }
  }, []);

  // Step 2: User validates food list → run full scan pipeline
  const handleValidated = useCallback(
    async (validatedFoods: string[]) => {
      if (!uploadedFile) return;
      setPhase({ tag: "analyzing" });

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ foods: validatedFoods }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          setPhase({ tag: "error", message: err.error ?? "Analysis failed" });
          return;
        }
        const result = (await res.json()) as ScanResponse;

        // Save to history
        await save({
          id: result.scanId,
          timestamp: result.meta.timestamp,
          foods: result.foods,
          carbonResult: result.carbonResult,
          recommendations: result.recommendations,
        });

        // Get AI coach message
        let coachMessage: string | undefined;
        try {
          const coachRes = await fetch("/api/coach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              carbonResult: result.carbonResult,
              recommendations: result.recommendations,
            }),
          });
          if (coachRes.ok) {
            const coachData = (await coachRes.json()) as { message: string };
            coachMessage = coachData.message;
          }
        } catch {
          // Coach is non-critical — continue without it
        }

        setPhase({ tag: "done", result, coachMessage });
      } catch {
        setPhase({ tag: "error", message: "Analysis failed. Please try again." });
      }
    },
    [uploadedFile, save]
  );

  const reset = useCallback(() => {
    setPhase({ tag: "idle" });
    setUploadedFile(null);
  }, []);

  return (
    <>
      <Navbar />
      <main
        className="max-w-2xl mx-auto px-4 py-10 min-h-[calc(100dvh-3.5rem)]"
        id="main-content"
      >
        <h1 className="text-2xl font-black text-carbon-50 mb-2">
          Scan Your Meal
        </h1>
        <p className="text-carbon-400 text-sm mb-8">
          Upload a photo to get your instant Environmental Nutrition Label.
        </p>

        <AnimatePresence mode="wait">
          {/* Phase: idle — show uploader */}
          {phase.tag === "idle" && (
            <motion.div
              key="uploader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ImageUploader
                onFileReady={handleImageReady}
                onError={(msg) => setPhase({ tag: "error", message: msg })}
              />
            </motion.div>
          )}

          {/* Phase: uploaded — show validation checklist */}
          {phase.tag === "uploaded" && (
            <motion.div
              key="validation"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
            >
              <FoodValidation
                detectedFoods={phase.foods}
                confidence={phase.confidence}
                onValidated={handleValidated}
                onCancel={reset}
              />
            </motion.div>
          )}

          {/* Phase: analyzing */}
          {phase.tag === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-6"
              role="status"
              aria-label="Calculating environmental impact"
            >
              <div className="w-16 h-16 rounded-2xl bg-leaf-500/10 border border-leaf-500/20 flex items-center justify-center">
                <svg
                  className="animate-spin w-8 h-8 text-leaf-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-carbon-100 font-semibold">Calculating impact…</p>
                <p className="text-carbon-500 text-sm mt-1">Running carbon analysis</p>
              </div>
            </motion.div>
          )}

          {/* Phase: done — show results */}
          {phase.tag === "done" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <NutritionLabel
                carbonResult={phase.result.carbonResult}
                recommendations={phase.result.recommendations}
                coachMessage={phase.coachMessage}
              />

              {phase.result.recommendations.length > 0 && (
                <section aria-label="Detailed swap recommendations">
                  <h2 className="text-lg font-bold text-carbon-100 mb-4">
                    Your Top Swaps
                  </h2>
                  <div className="space-y-4">
                    {phase.result.recommendations.map((rec, i) => (
                      <SwapCard key={rec.rank} recommendation={rec} index={i} />
                    ))}
                  </div>
                </section>
              )}

              <Button variant="secondary" onClick={reset} className="w-full">
                Scan Another Meal
              </Button>
            </motion.div>
          )}

          {/* Phase: error */}
          {phase.tag === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="glass-strong rounded-2xl p-8 text-center border border-red-500/20"
            >
              <p className="text-3xl mb-4" aria-hidden="true">⚠️</p>
              <p className="text-red-400 font-semibold mb-2">Something went wrong</p>
              <p className="text-carbon-400 text-sm mb-6">{phase.message}</p>
              <Button variant="secondary" onClick={reset}>
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
