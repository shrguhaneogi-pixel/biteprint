"use client";

import { useState, useCallback } from "react";
import type { ScanResponse, ScanState } from "@/types";

interface ScannerState {
  status: ScanState;
  result: ScanResponse | null;
  error: string | null;
  detectedFoods: string[];
  visionConfidence: number;
  showValidation: boolean;
}

const INITIAL_STATE: ScannerState = {
  status: "idle",
  result: null,
  error: null,
  detectedFoods: [],
  visionConfidence: 0,
  showValidation: false,
};

/**
 * useScanner — manages the full scan state machine.
 *
 * Flow:
 *   idle → uploading → analyzing → (validation) → done
 *              ↓
 *            error
 */
export function useScanner() {
  const [state, setState] = useState<ScannerState>(INITIAL_STATE);

  const setStatus = useCallback((status: ScanState) => {
    setState((prev) => ({ ...prev, status }));
  }, []);

  const handleResult = useCallback((result: ScanResponse) => {
    setState((prev) => ({
      ...prev,
      result,
      status: "done",
      error: null,
    }));
  }, []);

  const handleError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      error,
      status: "error",
    }));
  }, []);

  const handleVisionResult = useCallback(
    (foods: string[], confidence: number) => {
      setState((prev) => ({
        ...prev,
        detectedFoods: foods,
        visionConfidence: confidence,
        showValidation: true,
      }));
    },
    []
  );

  const dismissValidation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showValidation: false,
      detectedFoods: [],
      status: "idle",
    }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    setStatus,
    handleResult,
    handleError,
    handleVisionResult,
    dismissValidation,
    reset,
  };
}
