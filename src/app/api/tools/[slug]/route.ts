import { NextRequest, NextResponse } from "next/server";
import { getToolBySlug, updateTool, deleteTool } from "@/server/db";
import { isAuthenticated } from "@/server/auth";
import { rateLimiters } from "@/server/rate-limit";
import { jsonServerError } from "@/server/api-response";
import { isAllowedHttpUrl, isValidToolSlug } from "@/server/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const blocked = rateLimiters.publicRead(request);
  if (blocked) return blocked;

  const { slug } = await params;
  const tool = await getToolBySlug(slug);
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
  if (!isValidToolSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const body = await request.json();

  if (
    !isAllowedHttpUrl(String(body.download_url)) ||
    !isAllowedHttpUrl(String(body.github_url))
  ) {
    return NextResponse.json(
      { error: "download_url and github_url must be valid http(s) URLs" },
      { status: 400 }
    );
  }

  try {
    await updateTool(slug, {
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
    return jsonServerError(err);
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
  if (!isValidToolSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  await deleteTool(slug);
  return NextResponse.json({ success: true });
}
