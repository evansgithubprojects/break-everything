import { NextRequest, NextResponse } from "next/server";
import { getAllTools, createTool } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { rateLimiters } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const blocked = rateLimiters.publicRead(request);
  if (blocked) return blocked;

  const tools = getAllTools();
  return NextResponse.json({ tools });
}

export async function POST(request: NextRequest) {
  const blocked = rateLimiters.adminWrite(request);
  if (blocked) return blocked;

  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const required = ["name", "slug", "description", "short_description", "category", "download_url", "github_url"];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
  }

  try {
    const result = createTool({
      name: body.name,
      slug: body.slug,
      description: body.description,
      short_description: body.short_description,
      category: body.category,
      icon: body.icon || "🔧",
      download_url: body.download_url,
      github_url: body.github_url,
      platform: body.platform || "windows",
      sha256_hash: body.sha256_hash || null,
      safety_score: body.safety_score ?? 100,
      last_scan_date: body.last_scan_date || null,
    });
    return NextResponse.json({ success: true, id: result.lastInsertRowid }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
