import { NextRequest, NextResponse } from "next/server";
import { getToolBySlug, updateTool, deleteTool } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { rateLimiters } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const blocked = rateLimiters.publicRead(request);
  if (blocked) return blocked;

  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }
  return NextResponse.json({ tool });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const blocked = rateLimiters.adminWrite(request);
  if (blocked) return blocked;

  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await request.json();

  try {
    updateTool(slug, {
      name: body.name,
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
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const blocked = rateLimiters.adminWrite(request);
  if (blocked) return blocked;

  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  deleteTool(slug);
  return NextResponse.json({ success: true });
}
