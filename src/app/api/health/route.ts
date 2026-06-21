import { NextResponse } from "next/server";

/**
 * Health check endpoint.
 * Used by CI, uptime monitoring, and load balancers.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "biteprint-api",
    },
    { status: 200 }
  );
}
