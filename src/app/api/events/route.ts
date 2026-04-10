import { NextRequest, NextResponse } from "next/server";
import {
  ANALYTICS_INGEST_ALLOWED_EVENTS,
  normalizeAnalyticsAction,
} from "@/server/analytics-ingest";
import { rateLimiters } from "@/server/rate-limit";
import { recordAnalyticsEvent } from "@/server/db";
import { jsonServerError } from "@/server/api-response";
import { InvalidJsonBodyError, parseJsonRequestBody } from "@/server/parse-json-body";
import { isValidToolSlug } from "@/server/validation";

export async function POST(request: NextRequest) {
  const blocked = rateLimiters.analyticsIngest(request);
  if (blocked) return blocked;

  try {
    const raw = await request.text();
    const parsed = parseJsonRequestBody(raw, request.headers.get("content-type"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const body = parsed as Record<string, unknown>;

    const event = String(body.event ?? "").trim();
    const slug = String(body.slug ?? "").trim();

    if (!event || !slug) {
      return NextResponse.json({ error: "Missing event or slug" }, { status: 400 });
    }
    if (!ANALYTICS_INGEST_ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    }
    if (!isValidToolSlug(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const action = normalizeAnalyticsAction(body.action);
    if (action === null) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[event]", {
        event,
        slug,
        action,
        ts: new Date().toISOString(),
      });
    }

    await recordAnalyticsEvent({ event, slug, action });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof InvalidJsonBodyError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return jsonServerError(err);
  }
}
