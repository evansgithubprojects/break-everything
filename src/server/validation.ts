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
export type ParsedDeliveryMode = "redirect" | "embedded" | "browserRuntime" | "download";
export type ParsedSandboxLevel = "strict" | "standard" | "trusted";
export type ParsedDataHandling = "low" | "medium" | "high";

export function parseToolKind(value: unknown): ParsedToolKind | null {
  if (value === "web" || value === "download") {
    return value;
  }
  return null;
}

export function parseDeliveryMode(value: unknown): ParsedDeliveryMode | null {
  if (
    value === "redirect" ||
    value === "embedded" ||
    value === "browserRuntime" ||
    value === "download"
  ) {
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

export function parseCsvDomains(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .filter((entry) => /^[a-z0-9.-]+$/.test(entry));
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
