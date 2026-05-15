export type AnalyticsUtmContext = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
};

export const UTM_CONTEXT_STORAGE_KEY = "be:utm-context:v1";

const EMPTY_CONTEXT: AnalyticsUtmContext = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStringField(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function hasAnyUtmValue(value: AnalyticsUtmContext): boolean {
  return Boolean(
    value.utm_source ||
      value.utm_medium ||
      value.utm_campaign ||
      value.utm_term ||
      value.utm_content
  );
}

export function readUtmContext(): AnalyticsUtmContext {
  if (!canUseStorage()) return EMPTY_CONTEXT;
  try {
    const raw = window.localStorage.getItem(UTM_CONTEXT_STORAGE_KEY);
    if (!raw) return EMPTY_CONTEXT;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      utm_source: readStringField(parsed.utm_source),
      utm_medium: readStringField(parsed.utm_medium),
      utm_campaign: readStringField(parsed.utm_campaign),
      utm_term: readStringField(parsed.utm_term),
      utm_content: readStringField(parsed.utm_content),
    };
  } catch {
    return EMPTY_CONTEXT;
  }
}

export function captureUtmContextFromUrl(): void {
  if (!canUseStorage()) return;
  const params = new URLSearchParams(window.location.search);
  const next: AnalyticsUtmContext = {
    utm_source: readStringField(params.get("utm_source")),
    utm_medium: readStringField(params.get("utm_medium")),
    utm_campaign: readStringField(params.get("utm_campaign")),
    utm_term: readStringField(params.get("utm_term")),
    utm_content: readStringField(params.get("utm_content")),
  };
  if (!hasAnyUtmValue(next)) return;
  window.localStorage.setItem(UTM_CONTEXT_STORAGE_KEY, JSON.stringify(next));
}
