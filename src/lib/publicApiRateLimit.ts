import type { NextRequest } from "next/server";

// Simple in-memory per-IP rate limiter for the public /api/public/* endpoints.
// Not distributed (resets per server instance), but stops a single source
// from hammering the API-key-guessing or order-id-enumeration surface.
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, { count: number; windowStart: number }>();

export function publicApiRateLimit(req: NextRequest): string | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const entry = hits.get(ip);
  if (entry && now - entry.windowStart < WINDOW_MS) {
    if (entry.count >= MAX_PER_WINDOW) {
      return "Too many requests. Please slow down.";
    }
    entry.count += 1;
  } else {
    hits.set(ip, { count: 1, windowStart: now });
  }
  return null;
}
