import { NextRequest, NextResponse } from "next/server";
import type { Tool } from "@/types";
import { getToolBySlug, updateTool, deleteTool } from "@/server/db";
import { isAuthenticated } from "@/server/auth";
import { rateLimiters } from "@/server/rate-limit";
import { jsonServerError } from "@/server/api-response";
import { readJsonObjectBody } from "@/server/parse-json-body";
import { enforceSameOrigin } from "@/server/same-origin";
import { toPublicTool } from "@/server/tool-public";
import {
  isAllowedEmbedUrl,
  isAllowedHttpUrl,
  isValidToolSlug,
  normalizeCategoriesInput,
  normalizeTrustedDomainsInput,
  parseCsvDomains,
  parseDataHandling,
  parseDeliveryMode,
  parseSandboxLevel,
  parseToolKind,
} from "@/server/validation";

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
  return NextResponse.json({ tool: toPublicTool(tool as unknown as Tool) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const blocked = rateLimiters.adminWrite(request);
  if (blocked) return blocked;

  const sameOriginBlocked = enforceSameOrigin(request);
  if (sameOriginBlocked) return sameOriginBlocked;

  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  if (!isValidToolSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

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
  const appStoreUrl = String(body.app_store_url ?? "").trim();
  const playStoreUrl = String(body.play_store_url ?? "").trim();
  const embedUrl = String(body.embed_url ?? "").trim();
  const runtimeEntrypoint = String(body.runtime_entrypoint ?? "").trim();

  if (appStoreUrl && !isAllowedHttpUrl(appStoreUrl)) {
    return NextResponse.json(
      { error: "app_store_url must be a valid http(s) URL" },
      { status: 400 }
    );
  }
  if (playStoreUrl && !isAllowedHttpUrl(playStoreUrl)) {
    return NextResponse.json(
      { error: "play_store_url must be a valid http(s) URL" },
      { status: 400 }
    );
  }

  const hasAnyStore = isAllowedHttpUrl(appStoreUrl) || isAllowedHttpUrl(playStoreUrl);
  const trustedResult = normalizeTrustedDomainsInput(body.trusted_domains);
  if (!trustedResult.ok) {
    return NextResponse.json({ error: trustedResult.error }, { status: 400 });
  }
  const trustedDomains = trustedResult.csv;
  const categoriesResult = normalizeCategoriesInput(body.categories);
  if (!categoriesResult.ok) {
    return NextResponse.json({ error: categoriesResult.error }, { status: 400 });
  }

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

  if (toolKind === "download" && !isAllowedHttpUrl(downloadUrl) && !hasAnyStore) {
    return NextResponse.json(
      {
        error:
          "For release/install tools: set download_url and/or at least one of app_store_url, play_store_url",
      },
      { status: 400 }
    );
  }
  if (toolKind === "web" && !isAllowedHttpUrl(webUrl)) {
    return NextResponse.json(
      { error: "web_url must be a valid http(s) URL for web apps" },
      { status: 400 }
    );
  }
  if (deliveryMode === "redirect" && !isAllowedHttpUrl(webUrl || downloadUrl) && !hasAnyStore) {
    return NextResponse.json(
      {
        error:
          "redirect tools require a valid web_url, download_url, or App Store / Play link",
      },
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

  const githubUrl = String(body.github_url ?? "").trim();
  if (githubUrl && !isAllowedHttpUrl(githubUrl)) {
    return NextResponse.json(
      { error: "github_url must be a valid http(s) URL" },
      { status: 400 }
    );
  }

  const lastReviewedRaw = body.last_reviewed_at;
  const lastReviewedAt =
    lastReviewedRaw == null || String(lastReviewedRaw).trim() === ""
      ? null
      : String(lastReviewedRaw);

  try {
    await updateTool(slug, {
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
      short_description: String(body.short_description ?? ""),
      categories: categoriesResult.categories,
      icon: String(body.icon ?? "").trim() || "🔧",
      tool_kind: toolKind,
      delivery_mode: deliveryMode,
      download_url: downloadUrl,
      web_url: webUrl,
      app_store_url: appStoreUrl,
      play_store_url: playStoreUrl,
      embed_allowed: Boolean(body.embed_allowed) ? 1 : 0,
      embed_url: embedUrl,
      runtime_supported: Boolean(body.runtime_supported) ? 1 : 0,
      runtime_entrypoint: runtimeEntrypoint,
      sandbox_level: sandboxLevel,
      trusted_domains: trustedDomains,
      vendor: String(body.vendor ?? "").trim(),
      privacy_summary: String(body.privacy_summary ?? "").trim(),
      data_handling: dataHandling,
      review_notes: String(body.review_notes ?? "").trim(),
      last_reviewed_at: lastReviewedAt,
      github_url: githubUrl,
      platform: String(body.platform ?? "").trim() || "windows",
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

  const sameOriginBlocked = enforceSameOrigin(request);
  if (sameOriginBlocked) return sameOriginBlocked;

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
