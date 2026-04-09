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
