"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ScanState } from "@/types";

interface ImageUploaderProps {
  /** Called when a valid file is selected — caller owns the upload pipeline */
  onFileReady: (file: File) => void;
  onError: (error: string) => void;
  onStateChange?: (state: ScanState) => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function ImageUploader({ onFileReady, onError, onStateChange }: ImageUploaderProps) {
  const [state, setState] = useState<ScanState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const setStatus = useCallback(
    (s: ScanState) => {
      setState(s);
      onStateChange?.(s);
    },
    [onStateChange]
  );

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return "Please upload a JPEG, PNG, or WebP image.";
      }
      if (file.size > MAX_SIZE_BYTES) {
        return "Image must be under 5 MB.";
      }
      if (file.size === 0) {
        return "Image file is empty.";
      }
      return null;
    },
    []
  );

  const processFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        onError(validationError);
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Hand off to parent — parent owns the upload pipeline
      onFileReady(file);
    },
    [validateFile, onFileReady, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setPreview(null);
    setProgress(0);
  }, [setStatus]);

  const isProcessing = state === "uploading" || state === "analyzing";

  return (
    <div className="w-full space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Upload meal photo"
        id="meal-image-input"
        disabled={isProcessing}
      />

      {/* Drop zone */}
      <motion.div
        ref={dropZoneRef}
        role="button"
        tabIndex={0}
        aria-label="Drop meal photo here or press Enter to browse files"
        aria-describedby="upload-hint"
        aria-busy={isProcessing}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        animate={{
          borderColor: isDragging
            ? "var(--color-leaf-400)"
            : isProcessing
            ? "var(--color-leaf-600)"
            : "var(--color-carbon-700)",
          backgroundColor: isDragging
            ? "oklch(62% 0.19 145 / 0.08)"
            : "transparent",
        }}
        className={`
          relative overflow-hidden rounded-3xl border-2 border-dashed
          transition-colors duration-200 cursor-pointer
          min-h-[280px] flex flex-col items-center justify-center
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf-400 focus-visible:outline-offset-2
          ${isProcessing ? "pointer-events-none" : ""}
        `}
      >
        {/* Animated scan line during processing */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              className="scan-line absolute left-0 right-0 z-10"
              initial={{ top: "0%" }}
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Preview or placeholder */}
        {preview ? (
          <div className="relative w-full h-full min-h-[280px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Meal preview"
              className="w-full h-full object-cover rounded-3xl opacity-60"
              style={{ maxHeight: 320 }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {isProcessing ? (
                <div className="glass rounded-2xl px-6 py-4 text-center">
                  <p className="text-leaf-400 font-semibold text-lg">
                    {state === "uploading" ? "Uploading…" : "Analyzing meal…"}
                  </p>
                  <p className="text-carbon-400 text-sm mt-1">
                    Identifying food items
                  </p>
                </div>
              ) : state === "done" ? (
                <div className="glass rounded-2xl px-6 py-4 text-center border border-leaf-500/40">
                  <p className="text-leaf-400 font-semibold">✓ Analysis complete</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="text-carbon-400 text-sm mt-1 hover:text-leaf-400 underline"
                  >
                    Scan another meal
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-leaf-500/10 flex items-center justify-center border border-leaf-500/20">
              <svg
                className="w-8 h-8 text-leaf-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-carbon-100 font-semibold text-lg">
                {isDragging ? "Drop your meal photo" : "Scan your meal"}
              </p>
              <p
                id="upload-hint"
                className="text-carbon-400 text-sm mt-1"
              >
                Drag & drop or click to browse · JPEG, PNG, WebP · Max 5 MB
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Progress bar */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Analysis progress: ${progress}%`}
          >
            <div className="h-1.5 bg-carbon-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-leaf-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <p className="text-carbon-400 text-xs text-center mt-2">
              {state === "uploading" ? "Uploading image…" : "Identifying food items…"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
