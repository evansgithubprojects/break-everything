import type {
  RuntimeCapability,
  RuntimeExecutionMode,
  RuntimeManifest,
  RuntimeStoragePolicy,
} from "@/types";
import {
  coerceRuntimeEntryToRelative,
  RUNTIME_ENTRY_PATH_MAX_LEN,
  sanitizeRuntimeEntryPath,
} from "@/lib/first-party-inapp";

/** HTTP(S) URLs only — blocks javascript:, data:, etc. in stored link fields */
export function isAllowedHttpUrl(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!u.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

/** Safe positive integer IDs from dynamic route segments */
export function parsePositiveIntId(param: string): number | null {
  if (!/^\d+$/.test(param)) return null;
  const n = Number(param);
  if (!Number.isSafeInteger(n) || n < 1) return null;
  return n;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidToolSlug(slug: string): boolean {
  return typeof slug === "string" && slug.length >= 1 && slug.length <= 120 && SLUG_RE.test(slug);
}

export type ParsedToolKind = "download" | "web";
export type ParsedDeliveryMode = "redirect" | "browserRuntime" | "download";
export type ParsedSandboxLevel = "strict" | "standard" | "trusted";
export type ParsedDataHandling = "low" | "medium" | "high";

export function parseToolKind(value: unknown): ParsedToolKind | null {
  if (value === "web" || value === "download") {
    return value;
  }
  return null;
}

export function parseDeliveryMode(value: unknown): ParsedDeliveryMode | null {
  if (value === "redirect" || value === "browserRuntime" || value === "download") {
    return value;
  }
  return null;
}

export function parseSandboxLevel(value: unknown): ParsedSandboxLevel | null {
  if (value === "strict" || value === "standard" || value === "trusted") {
    return value;
  }
  return null;
}

export function parseDataHandling(value: unknown): ParsedDataHandling | null {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return null;
}

/** Categories preserve user casing while enforcing simple, deduped labels. */
export function normalizeCategoriesInput(
  value: unknown
): { ok: true; categories: string[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "categories must be an array of strings" };
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: "categories must be an array of strings" };
    }
    const c = item.trim();
    if (!c) continue;
    if (c.length > 40) {
      return { ok: false, error: "each category must be at most 40 characters" };
    }
    if (c.includes(",")) {
      return { ok: false, error: "categories must not contain commas" };
    }
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(c);
  }

  if (normalized.length === 0) {
    return { ok: false, error: "categories must contain at least one category" };
  }

  return { ok: true, categories: normalized };
}

/**
 * Trusted iframe allowlist entries: hostname-style labels only. Rejects bare TLDs like `com` or `uk`,
 * which would otherwise match every host under that public suffix via suffix rules.
 */
export function isValidTrustedDomainEntry(entry: string): boolean {
  const e = entry.trim().toLowerCase();
  if (!e || !/^[a-z0-9.-]+$/.test(e)) return false;
  if (e === "localhost") return true;
  return e.includes(".");
}

export function parseCsvDomains(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .filter(isValidTrustedDomainEntry);
}

/** Admin write: reject invalid tokens instead of silently dropping them (avoids accidental open embed). */
export function normalizeTrustedDomainsInput(
  value: unknown
): { ok: true; csv: string } | { ok: false; error: string } {
  if (value == null || String(value).trim() === "") {
    return { ok: true, csv: "" };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "trusted_domains must be a comma-separated string" };
  }
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { ok: true, csv: "" };
  }
  const normalized: string[] = [];
  for (const p of parts) {
    const lower = p.toLowerCase();
    if (!isValidTrustedDomainEntry(lower)) {
      return {
        ok: false,
        error:
          "Each trusted domain must look like a hostname (e.g. app.example.com or example.com), not a bare TLD; localhost is allowed",
      };
    }
    normalized.push(lower);
  }
  return { ok: true, csv: [...new Set(normalized)].join(",") };
}

export function isAllowedEmbedUrl(url: string, allowlist: string[]): boolean {
  if (!isAllowedHttpUrl(url)) return false;
  if (allowlist.length === 0) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return allowlist.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

const RUNTIME_ORIGIN_MAX = 20;
const RUNTIME_CAPABILITY_SET = new Set<RuntimeCapability>([
  "fileOpen",
  "fileSave",
  "share",
  "copyToClipboard",
  "openExternal",
]);
export type RuntimeManifestPreset = "localOnly" | "networkedUtility" | "trustedEmbeddedApp";
const RUNTIME_PRESET_SET = new Set<RuntimeManifestPreset>([
  "localOnly",
  "networkedUtility",
  "trustedEmbeddedApp",
]);

function parseRuntimeExecutionMode(value: unknown): RuntimeExecutionMode | null {
  if (value === "iframe" || value === "module") return value;
  return null;
}

function parseRuntimeStoragePolicy(value: unknown): RuntimeStoragePolicy | null {
  if (value === "memory" || value === "session" || value === "persistent") return value;
  return null;
}

function isValidRuntimeOrigin(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return !!u.hostname && !u.pathname.replace("/", "") && !u.search && !u.hash;
  } catch {
    return false;
  }
}

function normalizeRuntimeEntry(raw: unknown): string | null {
  const entry = String(raw ?? "").trim();
  if (
    !entry ||
    entry.length > RUNTIME_ENTRY_PATH_MAX_LEN ||
    /\s/.test(entry)
  ) {
    return null;
  }
  return sanitizeRuntimeEntryPath(entry);
}

/** Persistable relative `/runtime…` entry; coerces legacy same-origin URLs from admin writes. */
export function coerceStoredRuntimeEntry(raw: unknown, origin: string): string {
  return coerceRuntimeEntryToRelative(String(raw ?? "").trim(), origin) ?? "";
}

/** If manifest entry is present, rewrite same-origin URL into a sanitized path before `parseRuntimeManifestInput`. */
export function coerceRuntimeManifestPayloadForParse(value: unknown, origin: string): unknown {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return value;
  const o = value as Record<string, unknown>;
  const trimmed = String(o.entry ?? "").trim();
  if (!trimmed) return value;
  const coerced = coerceRuntimeEntryToRelative(trimmed, origin);
  if (!coerced) return value;
  return { ...o, entry: coerced };
}

/**
 * Parses and validates an optional runtime manifest payload.
 * Used for forward-compatible API contracts before full DB persistence rollout.
 */
export function parseRuntimeManifestInput(
  value: unknown
): { ok: true; manifest: RuntimeManifest | null } | { ok: false; error: string } {
  if (value == null || String(value).trim() === "") {
    return { ok: true, manifest: null };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "runtime_manifest must be an object" };
  }

  const body = value as Record<string, unknown>;
  const entry = normalizeRuntimeEntry(body.entry);
  if (!entry) {
    return {
      ok: false,
      error: "runtime_manifest.entry must be a relative path under /runtime (no scheme or hostname)",
    };
  }

  const executionMode = parseRuntimeExecutionMode(body.executionMode ?? "iframe");
  if (!executionMode) {
    return { ok: false, error: "runtime_manifest.executionMode must be iframe or module" };
  }

  const storagePolicy = parseRuntimeStoragePolicy(body.storagePolicy ?? "session");
  if (!storagePolicy) {
    return { ok: false, error: "runtime_manifest.storagePolicy must be memory, session, or persistent" };
  }

  const versionRaw = Number(body.version ?? 1);
  if (!Number.isSafeInteger(versionRaw) || versionRaw < 1 || versionRaw > 100) {
    return { ok: false, error: "runtime_manifest.version must be an integer between 1 and 100" };
  }

  const permissionsRaw = body.permissions;
  const permissions: RuntimeManifest["permissions"] = {};
  if (permissionsRaw != null) {
    if (typeof permissionsRaw !== "object" || Array.isArray(permissionsRaw)) {
      return { ok: false, error: "runtime_manifest.permissions must be an object" };
    }
    for (const [k, v] of Object.entries(permissionsRaw as Record<string, unknown>)) {
      if (!["network", "storage", "clipboard", "downloads", "popups"].includes(k)) {
        return { ok: false, error: `runtime_manifest.permissions.${k} is not supported` };
      }
      if (typeof v !== "boolean") {
        return { ok: false, error: `runtime_manifest.permissions.${k} must be boolean` };
      }
      (permissions as Record<string, boolean>)[k] = v;
    }
  }

  const allowedOriginsRaw = body.allowedOrigins;
  const allowedOrigins: string[] = [];
  if (allowedOriginsRaw != null) {
    if (!Array.isArray(allowedOriginsRaw)) {
      return { ok: false, error: "runtime_manifest.allowedOrigins must be an array" };
    }
    if (allowedOriginsRaw.length > RUNTIME_ORIGIN_MAX) {
      return { ok: false, error: `runtime_manifest.allowedOrigins supports up to ${RUNTIME_ORIGIN_MAX} entries` };
    }
    const seen = new Set<string>();
    for (const item of allowedOriginsRaw) {
      if (typeof item !== "string" || !isValidRuntimeOrigin(item.trim())) {
        return { ok: false, error: "runtime_manifest.allowedOrigins must contain valid http(s) origins" };
      }
      const normalized = item.trim().toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      allowedOrigins.push(normalized);
    }
  }

  const capabilitiesRaw = body.capabilities;
  const capabilities: RuntimeCapability[] = [];
  if (capabilitiesRaw != null) {
    if (!Array.isArray(capabilitiesRaw)) {
      return { ok: false, error: "runtime_manifest.capabilities must be an array" };
    }
    const seen = new Set<RuntimeCapability>();
    for (const item of capabilitiesRaw) {
      if (typeof item !== "string" || !RUNTIME_CAPABILITY_SET.has(item as RuntimeCapability)) {
        return { ok: false, error: "runtime_manifest.capabilities contains unsupported capability" };
      }
      const c = item as RuntimeCapability;
      if (seen.has(c)) continue;
      seen.add(c);
      capabilities.push(c);
    }
  }

  return {
    ok: true,
    manifest: {
      version: versionRaw,
      entry,
      executionMode,
      permissions,
      allowedOrigins,
      storagePolicy,
      capabilities,
    },
  };
}

export function parseRuntimeManifestPreset(value: unknown): RuntimeManifestPreset | null {
  if (typeof value !== "string") return null;
  const v = value.trim() as RuntimeManifestPreset;
  return RUNTIME_PRESET_SET.has(v) ? v : null;
}

function allowlistToOrigins(csv: string): string[] {
  return parseCsvDomains(csv).map((host) => `https://${host}`);
}

export function buildRuntimeManifestFromPreset(
  preset: RuntimeManifestPreset,
  options: {
    entry: string;
    trustedDomainsCsv?: string;
  }
): RuntimeManifest {
  const entry = options.entry.trim();
  const allowedOrigins = options.trustedDomainsCsv
    ? allowlistToOrigins(options.trustedDomainsCsv)
    : [];

  if (preset === "localOnly") {
    return {
      version: 1,
      entry,
      executionMode: "module",
      permissions: { network: false, storage: true, clipboard: false, downloads: false, popups: false },
      allowedOrigins: [],
      storagePolicy: "session",
      capabilities: ["fileOpen", "fileSave"],
    };
  }
  if (preset === "networkedUtility") {
    return {
      version: 1,
      entry,
      executionMode: "module",
      permissions: { network: true, storage: true, clipboard: true, downloads: true, popups: false },
      allowedOrigins,
      storagePolicy: "session",
      capabilities: ["fileOpen", "fileSave", "copyToClipboard", "share"],
    };
  }
  return {
    version: 1,
    entry,
    executionMode: "iframe",
    permissions: { network: true, storage: true, clipboard: true, downloads: true, popups: true },
    allowedOrigins,
    storagePolicy: "persistent",
    capabilities: ["openExternal", "share", "copyToClipboard"],
  };
}
