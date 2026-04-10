import { NextRequest, NextResponse } from "next/server";
import { rateLimiters } from "@/server/rate-limit";

export async function POST(request: NextRequest) {
  const blocked = rateLimiters.publicRead(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const event = String(body.event ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    if (!event || !slug) {
      return NextResponse.json({ error: "Missing event or slug" }, { status: 400 });
    }

    console.info("[event]", {
      event,
      slug,
      action: String(body.action ?? ""),
      ts: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
