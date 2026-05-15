import type { Tool } from "@/types";

/** Runtime entries must live under this path prefix only. Must match server `sanitizeRuntimeEntryPath` max length. */
export const RUNTIME_ENTRY_PATH_MAX_LEN = 300;

/** Runtime entries must live under this path prefix only. */
export const FIRST_PARTY_RUNTIME_PATH_PREFIX = "/runtime";

export function isAllowedRuntimeEntryPath(pathname: string): boolean {
  const p = pathname.trim();
  if (!p.startsWith("/")) return false;
  return p === FIRST_PARTY_RUNTIME_PATH_PREFIX || p.startsWith(`${FIRST_PARTY_RUNTIME_PATH_PREFIX}/`);
}

/**
 * Normalizes `/runtime...` paths: rejects URLs, traversal (incl. percent-encoded slashes), `\`, and NUL.
 * Optionally allows `?` / `#` suffix after a valid path (decoded path only; suffix not decoded).
 */
export function sanitizeRuntimeEntryPath(raw: string): string | null {
  const s = raw.trim();
  if (!s || s.length > RUNTIME_ENTRY_PATH_MAX_LEN) return null;
  if (/\s/.test(s)) return null;
  if (s.includes("://") || s.startsWith("//")) return null;

  const cut = Math.min(
    s.includes("?") ? s.indexOf("?") : s.length,
    s.includes("#") ? s.indexOf("#") : s.length
  );
  const pathPartEncoded = s.slice(0, cut);
  const rest = s.slice(cut);

  if (!pathPartEncoded.startsWith("/")) return null;

  let pathDecoded: string;
  try {
    pathDecoded = decodeURIComponent(pathPartEncoded);
  } catch {
    return null;
  }

  if (!pathDecoded.startsWith("/") || pathDecoded.includes("\\") || pathDecoded.includes("\0")) {
    return null;
  }

  const segs = pathDecoded.split("/").filter(Boolean);
  for (const seg of segs) {
    if (seg === "." || seg === "..") return null;
  }

  const canonicalPath = `/${segs.join("/")}`;

  if (!isAllowedRuntimeEntryPath(canonicalPath)) return null;

  return canonicalPath + rest;
}

/**
 * Prefer {@link sanitizeRuntimeEntryPath}; if absent, coerce same-origin http(s) URL to pathname + optional search/hash.
 */
export function coerceRuntimeEntryToRelative(raw: string, baseOrigin?: string): string | null {
  const direct = sanitizeRuntimeEntryPath(raw);
  if (direct) return direct;
  const b = String(baseOrigin ?? "").trim();
  if (!b) return null;
  try {
    const u = new URL(raw.trim());
    const expected = new URL(b).origin.toLowerCase();
    if (u.origin.toLowerCase() !== expected) return null;
    const rebuilt = `${u.pathname}${u.search}${u.hash}`;
    return sanitizeRuntimeEntryPath(rebuilt.startsWith("/") ? rebuilt : `/${rebuilt}`);
  } catch {
    return null;
  }
}

export function isValidRuntimeEntryPath(raw: string): boolean {
  return sanitizeRuntimeEntryPath(raw) !== null;
}

/** Resolve iframe/module URL for a sanitized entry (typically `/runtime/…`). */
export function resolveRuntimeEntryAppUrl(entry: string, origin: string): string {
  const o = origin.trim().endsWith("/") ? origin.trim().slice(0, -1) : origin.trim();
  try {
    return new URL(entry, `${o}/`).href;
  } catch {
    return entry;
  }
}

/**
 * Canonical site origin for client-side checks (browser tab or build-time public URL).
 */
export function getPublicSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.FIRST_PARTY_ORIGIN ?? "";
  if (!raw.trim()) return "http://localhost:3000";
  try {
    return new URL(raw.trim()).origin;
  } catch {
    return "http://localhost:3000";
  }
}

import { normalizeRuntimeName, runtimeIndexHtmlPath } from "@/lib/runtime-name";

export function getEffectiveRuntimeEntryStrings(
  tool: Pick<Tool, "runtime_name" | "runtime_entrypoint" | "runtime_manifest">
): string[] {
  const name = normalizeRuntimeName(tool.runtime_name);
  if (name) return [runtimeIndexHtmlPath(name)];
  const out: string[] = [];
  const legacy = String(tool.runtime_entrypoint ?? "").trim();
  if (legacy) out.push(legacy);
  const entry = tool.runtime_manifest?.entry;
  if (typeof entry === "string" && entry.trim()) out.push(entry.trim());
  return out;
}

export function toolSupportsInAppRuntime(
  tool: Pick<Tool, "runtime_supported" | "runtime_name" | "runtime_entrypoint" | "runtime_manifest">
): boolean {
  if (!Number(tool.runtime_supported)) return false;
  const entries = getEffectiveRuntimeEntryStrings(tool);
  if (entries.length === 0) return false;
  return entries.every((e) => isValidRuntimeEntryPath(e));
}
