import type { RuntimeManifest } from "@/types";

/** Folder name under `public/runtime/<name>/index.html`. */
export const RUNTIME_NAME_MAX_LEN = 48;

const RUNTIME_NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

/**
 * Returns a normalized runtime folder name, or null if invalid.
 * Only lowercase letters, digits, and single hyphens between segments.
 */
export function normalizeRuntimeName(raw: unknown): string | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s || s.length > RUNTIME_NAME_MAX_LEN) return null;
  if (!RUNTIME_NAME_RE.test(s)) return null;
  if (s.includes("--")) return null;
  return s;
}

/** First-party path to the shell HTML for this runtime name. */
export function runtimeIndexHtmlPath(name: string): string {
  return `/runtime/${name}/index.html`;
}

/**
 * If `path` is under `/runtime/<segment>/...`, returns that segment when it is a valid runtime name.
 */
export function inferRuntimeNameFromEntryPath(path: unknown): string | null {
  const s = String(path ?? "").trim();
  const m = /^\/runtime\/([^/]+)\//.exec(s);
  if (!m?.[1]) return null;
  return normalizeRuntimeName(m[1]);
}

export function defaultRuntimeManifestForName(name: string): RuntimeManifest {
  return {
    version: 1,
    entry: runtimeIndexHtmlPath(name),
    executionMode: "iframe",
    permissions: {},
    allowedOrigins: [],
    storagePolicy: "session",
    capabilities: [],
  };
}
