import { NextRequest, NextResponse } from "next/server";
import { getAllTools, createTool } from "@/server/db";
import { isAuthenticated } from "@/server/auth";
import { rateLimiters } from "@/server/rate-limit";
import { jsonServerError } from "@/server/api-response";
import {
  isAllowedEmbedUrl,
  isAllowedHttpUrl,
  isValidToolSlug,
  parseCsvDomains,
  parseDataHandling,
  parseDeliveryMode,
  parseSandboxLevel,
  parseToolKind,
} from "@/server/validation";

export async function GET(request: NextRequest) {
  const blocked = rateLimiters.publicRead(request);
  if (blocked) return blocked;

  const tools = await getAllTools();
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
  const required = ["name", "slug", "description", "short_description", "category", "github_url"];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
  }

  let toolKind: "download" | "web" = "download";
  if (body.tool_kind != null && String(body.tool_kind).trim() !== "") {
    const parsed = parseToolKind(body.tool_kind);
    if (!parsed) {
      return NextResponse.json(
        { error: "tool_kind must be \"download\" or \"web\"" },
        { status: 400 }
      );
    }
    toolKind = parsed;
  }

  const downloadUrl = String(body.download_url ?? "").trim();
  const webUrl = String(body.web_url ?? "").trim();
  const embedUrl = String(body.embed_url ?? "").trim();
  const runtimeEntrypoint = String(body.runtime_entrypoint ?? "").trim();
  const trustedDomains = parseCsvDomains(body.trusted_domains).join(",");

  let deliveryMode: "redirect" | "embedded" | "browserRuntime" | "download" = "download";
  if (body.delivery_mode != null && String(body.delivery_mode).trim() !== "") {
    const parsed = parseDeliveryMode(body.delivery_mode);
    if (!parsed) {
      return NextResponse.json(
        { error: "delivery_mode must be redirect, embedded, browserRuntime, or download" },
        { status: 400 }
      );
    }
    deliveryMode = parsed;
  }

  let sandboxLevel: "strict" | "standard" | "trusted" = "strict";
  if (body.sandbox_level != null && String(body.sandbox_level).trim() !== "") {
    const parsed = parseSandboxLevel(body.sandbox_level);
    if (!parsed) {
      return NextResponse.json(
        { error: "sandbox_level must be strict, standard, or trusted" },
        { status: 400 }
      );
    }
    sandboxLevel = parsed;
  }

  let dataHandling: "low" | "medium" | "high" = "medium";
  if (body.data_handling != null && String(body.data_handling).trim() !== "") {
    const parsed = parseDataHandling(body.data_handling);
    if (!parsed) {
      return NextResponse.json(
        { error: "data_handling must be low, medium, or high" },
        { status: 400 }
      );
    }
    dataHandling = parsed;
  }

  if (toolKind === "download" && !isAllowedHttpUrl(downloadUrl)) {
    return NextResponse.json(
      { error: "download_url must be a valid http(s) URL for download tools" },
      { status: 400 }
    );
  }
  if (toolKind === "web" && !isAllowedHttpUrl(webUrl)) {
    return NextResponse.json(
      { error: "web_url must be a valid http(s) URL for web apps" },
      { status: 400 }
    );
  }
  if (deliveryMode === "redirect" && !isAllowedHttpUrl(webUrl || downloadUrl)) {
    return NextResponse.json(
      { error: "redirect tools require a valid web_url or download_url" },
      { status: 400 }
    );
  }
  if (deliveryMode === "embedded") {
    if (!isAllowedEmbedUrl(embedUrl || webUrl, parseCsvDomains(trustedDomains))) {
      return NextResponse.json(
        { error: "embedded tools require an embed_url/web_url matching trusted_domains" },
        { status: 400 }
      );
    }
  }
  if (deliveryMode === "browserRuntime" && runtimeEntrypoint.length < 2) {
    return NextResponse.json(
      { error: "browserRuntime tools require runtime_entrypoint" },
      { status: 400 }
    );
  }

  if (!isValidToolSlug(String(body.slug))) {
    return NextResponse.json(
      { error: "Invalid slug: use lowercase letters, numbers, and hyphens only" },
      { status: 400 }
    );
  }

  if (!isAllowedHttpUrl(String(body.github_url))) {
    return NextResponse.json(
      { error: "github_url must be a valid http(s) URL" },
      { status: 400 }
    );
  }

  try {
    const result = await createTool({
      name: body.name,
      slug: body.slug,
      description: body.description,
      short_description: body.short_description,
      category: body.category,
      icon: body.icon || "🔧",
      tool_kind: toolKind,
      delivery_mode: deliveryMode,
      download_url: downloadUrl,
      web_url: webUrl,
      embed_allowed: body.embed_allowed ? 1 : 0,
      embed_url: embedUrl,
      runtime_supported: body.runtime_supported ? 1 : 0,
      runtime_entrypoint: runtimeEntrypoint,
      sandbox_level: sandboxLevel,
      trusted_domains: trustedDomains,
      vendor: String(body.vendor ?? "").trim(),
      privacy_summary: String(body.privacy_summary ?? "").trim(),
      data_handling: dataHandling,
      review_notes: String(body.review_notes ?? "").trim(),
      last_reviewed_at: body.last_reviewed_at || null,
      github_url: body.github_url,
      platform: body.platform || "windows",
    });
    return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) }, { status: 201 });
  } catch (err: unknown) {
    return jsonServerError(err);
  }
}
