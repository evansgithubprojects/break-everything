import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

// Prune expired entries periodically to prevent memory leaks
let lastPrune = Date.now();
function pruneIfNeeded() {
  const now = Date.now();
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

interface RateLimitConfig {
  /** Unique name for this limiter's bucket */
  name: string;
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/**
 * Check rate limit for a request. Returns null if allowed,
 * or a 429 NextResponse if the limit is exceeded.
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  pruneIfNeeded();

  const store = getStore(config.name);
  const ip = getClientIp(request);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return null;
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
        },
      }
    );
  }

  return null;
}

// Pre-configured limiters for different endpoints
export const rateLimiters = {
  /** Login: 5 attempts per 15 minutes per IP */
  auth: (req: NextRequest) =>
    checkRateLimit(req, { name: "auth", maxRequests: 5, windowSeconds: 900 }),

  /** Tool request submissions: 5 per 10 minutes per IP */
  requestSubmit: (req: NextRequest) =>
    checkRateLimit(req, { name: "request-submit", maxRequests: 5, windowSeconds: 600 }),

  /** Public reads: 60 per minute per IP */
  publicRead: (req: NextRequest) =>
    checkRateLimit(req, { name: "public-read", maxRequests: 60, windowSeconds: 60 }),

  /** Admin writes: 30 per minute per IP */
  adminWrite: (req: NextRequest) =>
    checkRateLimit(req, { name: "admin-write", maxRequests: 30, windowSeconds: 60 }),
} as const;
