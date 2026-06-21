import { z } from "zod";

/**
 * Environment variable schema.
 * Validated at server startup — fails fast if any required variable is missing.
 * Only server-side secrets are here; NEXT_PUBLIC_* vars are validated separately.
 */
const ServerEnvSchema = z.object({
  GEMINI_API_KEY: z
    .string()
    .min(1, "GEMINI_API_KEY is required")
    .regex(/^[A-Za-z0-9_-]+$/, "GEMINI_API_KEY contains invalid characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_SPLINE_URL: z
    .string()
    .url("NEXT_PUBLIC_SPLINE_URL must be a valid URL")
    .startsWith("https://", "NEXT_PUBLIC_SPLINE_URL must use HTTPS")
    .optional(),
});

/**
 * Validated server-side environment.
 * Import this instead of accessing process.env directly.
 */
function validateServerEnv() {
  const result = ServerEnvSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `  ${field}: ${msgs?.join(", ")}`)
      .join("\n");
    throw new Error(`❌ Invalid environment variables:\n${messages}\n\nSee .env.example for reference.`);
  }
  return result.data;
}

function validateClientEnv() {
  const result = ClientEnvSchema.safeParse({
    NEXT_PUBLIC_SPLINE_URL: process.env.NEXT_PUBLIC_SPLINE_URL,
  });
  if (!result.success) {
    console.warn("⚠️  NEXT_PUBLIC_SPLINE_URL is missing or invalid — Spline hero will be disabled.");
  }
  return result.data;
}

export const env = {
  server: validateServerEnv(),
  client: validateClientEnv(),
};
