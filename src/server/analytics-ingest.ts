/**
 * Rules for public POST `/api/events` (client ingest). Keep in sync with `src/analytics/client.ts`.
 */

export const ANALYTICS_INGEST_ALLOWED_EVENTS = new Set([
  "tool_action_click",
  "runtime_start",
  "runtime_ready",
  "runtime_error",
  "runtime_action",
]);

const ACTION_MAX_LEN = 64;
const ACTION_RE = /^[a-zA-Z0-9_-]+$/;
const UTM_MAX_LEN = 120;
const UTM_VALUE_RE = /^[a-zA-Z0-9_.~:+-]+$/;

export interface AnalyticsUtmContext {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
}

/** Returns normalized action string, `""` if omitted, or `null` if invalid. */
export function normalizeAnalyticsAction(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.length > ACTION_MAX_LEN) return null;
  if (!ACTION_RE.test(s)) return null;
  return s;
}

function normalizeUtmValue(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.length > UTM_MAX_LEN) return null;
  if (!UTM_VALUE_RE.test(s)) return null;
  return s;
}

/**
 * Normalizes optional UTM payload fields.
 * Returns empty strings for missing fields and null when any value is invalid.
 */
export function normalizeAnalyticsUtmContext(
  input: Partial<AnalyticsUtmContext> | Record<string, unknown>
): AnalyticsUtmContext | null {
  const utm_source = normalizeUtmValue(input.utm_source);
  const utm_medium = normalizeUtmValue(input.utm_medium);
  const utm_campaign = normalizeUtmValue(input.utm_campaign);
  const utm_term = normalizeUtmValue(input.utm_term);
  const utm_content = normalizeUtmValue(input.utm_content);
  if (
    utm_source === null ||
    utm_medium === null ||
    utm_campaign === null ||
    utm_term === null ||
    utm_content === null
  ) {
    return null;
  }
  return { utm_source, utm_medium, utm_campaign, utm_term, utm_content };
}
