import { NextRequest, NextResponse } from "next/server";

/**
 * Browser CSRF guard for state-changing endpoints.
 * Allows non-browser clients that don't send Origin/Referer.
 */
export function enforceSameOrigin(request: NextRequest): NextResponse | null {
  const expectedOrigin = request.nextUrl.origin;

  const origin = request.headers.get("origin");
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!origin) {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        if (new URL(referer).origin !== expectedOrigin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  return null;
}
