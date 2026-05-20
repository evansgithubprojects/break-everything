import { NextRequest, NextResponse } from "next/server";
import type { Tool } from "@/types";
import { getToolBySlug, updateTool, deleteTool } from "@/server/db";
import { isAuthenticated } from "@/server/auth";
import { rateLimiters } from "@/server/rate-limit";
import { jsonServerError } from "@/server/api-response";
import { readJsonObjectBody } from "@/server/parse-json-body";
import { enforceSameOrigin } from "@/server/same-origin";
import { toPublicTool } from "@/server/tool-public";
import { validateFirstPartyInApp } from "@/server/first-party-tool-validation";
import { parseToolRuntimeWrite } from "@/server/api-tool-runtime";
import {
  isAllowedHttpUrl,
  isValidToolSlug,
  normalizeCategoriesInput,
  parseDataHandling,
  parseDeliveryMode,
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
    const parsedKind = parseToolKind(body.tool_kind);
    if (!parsedKind) {
      return NextResponse.json(
        { error: "tool_kind must be \"download\" or \"web\"" },
        { status: 400 }
      );
    }
    toolKind = parsedKind;
  }

  const downloadUrl = String(body.download_url ?? "").trim();
  const webUrl = String(body.web_url ?? "").trim();
  const appStoreUrl = String(body.app_store_url ?? "").trim();
  const playStoreUrl = String(body.play_store_url ?? "").trim();

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
  const categoriesResult = normalizeCategoriesInput(body.categories);
  if (!categoriesResult.ok) {
    return NextResponse.json({ error: categoriesResult.error }, { status: 400 });
  }

  let deliveryMode: "redirect" | "browserRuntime" | "download" = "download";
  if (body.delivery_mode != null && String(body.delivery_mode).trim() !== "") {
    const parsedDm = parseDeliveryMode(body.delivery_mode);
    if (!parsedDm) {
      return NextResponse.json(
        { error: "delivery_mode must be redirect, browserRuntime, or download" },
        { status: 400 }
      );
    }
    deliveryMode = parsedDm;
  }

  const rt = parseToolRuntimeWrite(body, deliveryMode);
  if (!rt.ok) {
    return NextResponse.json({ error: rt.error }, { status: 400 });
  }
  const {
    runtime_supported: runtimeSupported,
    runtime_name: runtimeName,
    runtime_entrypoint: runtimeEntrypoint,
    runtime_manifest: runtimeManifest,
    sandbox_level: sandboxLevel,
    trusted_domains: trustedDomains,
  } = rt.value;

  let dataHandling: "low" | "medium" | "high" = "medium";
  if (body.data_handling != null && String(body.data_handling).trim() !== "") {
    const parsedDh = parseDataHandling(body.data_handling);
    if (!parsedDh) {
      return NextResponse.json(
        { error: "data_handling must be low, medium, or high" },
        { status: 400 }
      );
    }
    dataHandling = parsedDh;
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
  if (toolKind === "web" && webUrl && !isAllowedHttpUrl(webUrl)) {
    return NextResponse.json(
      { error: "web_url must be a valid http(s) URL when provided" },
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

  const firstPartyErr = validateFirstPartyInApp({
    delivery_mode: deliveryMode,
    runtime_supported: runtimeSupported === 1,
    runtime_name: runtimeName,
  });
  if (firstPartyErr) {
    return NextResponse.json({ error: firstPartyErr }, { status: 400 });
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
  const reviewNotes = runtimeSupported ? "" : String(body.review_notes ?? "").trim();
  const effectiveLastReviewedAt = runtimeSupported ? null : lastReviewedAt;

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
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: runtimeSupported,
      runtime_name: runtimeName,
      runtime_entrypoint: runtimeEntrypoint,
      runtime_manifest: runtimeManifest,
      sandbox_level: sandboxLevel,
      trusted_domains: trustedDomains,
      vendor: String(body.vendor ?? "").trim(),
      privacy_summary: String(body.privacy_summary ?? "").trim(),
      data_handling: dataHandling,
      review_notes: reviewNotes,
      last_reviewed_at: effectiveLastReviewedAt,
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
