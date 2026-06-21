/**
 * Utility functions for the BitePrint Coach client.
 */

/**
 * Generate a UUID v4 string on the client side.
 * Falls back to crypto.randomUUID() when available.
 */
export function randomUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Polyfill for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format a number as a compact string with fixed decimal places.
 */
export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
