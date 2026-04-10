import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/server/auth";
import { getAnalyticsSummary } from "@/server/db";
import { rateLimiters } from "@/server/rate-limit";
import { jsonServerError } from "@/server/api-response";
import { isValidToolSlug } from "@/server/validation";

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;

function parseDays(raw: string | null): number {
  if (raw == null || raw === "") return DEFAULT_DAYS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DAYS;
  return Math.min(n, MAX_DAYS);
}

export async function GET(request: NextRequest) {
  const blocked = rateLimiters.publicRead(request);
  if (blocked) return blocked;

  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const days = parseDays(request.nextUrl.searchParams.get("days"));
    const slugRaw = request.nextUrl.searchParams.get("slug")?.trim() ?? "";
    let slugFilter: string | undefined;
    if (slugRaw) {
      if (!isValidToolSlug(slugRaw)) {
        return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
      }
      slugFilter = slugRaw;
    }

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const summary = await getAnalyticsSummary(since, slugFilter ? { slug: slugFilter } : undefined);
    return NextResponse.json({ days, slug: slugFilter ?? null, summary });
  } catch (err) {
    return jsonServerError(err);
  }
}
