import {
  ANALYTICS_INGEST_ALLOWED_EVENTS,
  normalizeAnalyticsAction,
  normalizeAnalyticsUtmContext,
} from "@/server/analytics-ingest";

describe("normalizeAnalyticsAction", () => {
  it("returns empty string when omitted or whitespace", () => {
    expect(normalizeAnalyticsAction(undefined)).toBe("");
    expect(normalizeAnalyticsAction(null)).toBe("");
    expect(normalizeAnalyticsAction("   ")).toBe("");
  });

  it("accepts alphanumeric, underscore, hyphen", () => {
    expect(normalizeAnalyticsAction("download")).toBe("download");
    expect(normalizeAnalyticsAction("  redirect  ")).toBe("redirect");
    expect(normalizeAnalyticsAction("open_in_new_tab")).toBe("open_in_new_tab");
    expect(normalizeAnalyticsAction("a-z_09")).toBe("a-z_09");
  });

  it("rejects disallowed characters", () => {
    expect(normalizeAnalyticsAction("a;b")).toBeNull();
    expect(normalizeAnalyticsAction("a b")).toBeNull();
    expect(normalizeAnalyticsAction("a/b")).toBeNull();
  });

  it("rejects actions longer than 64 characters", () => {
    expect(normalizeAnalyticsAction("a".repeat(64))).toBe("a".repeat(64));
    expect(normalizeAnalyticsAction("a".repeat(65))).toBeNull();
  });
});

describe("ANALYTICS_INGEST_ALLOWED_EVENTS", () => {
  it("includes tool and runtime ingest events", () => {
    expect(ANALYTICS_INGEST_ALLOWED_EVENTS.has("tool_action_click")).toBe(true);
    expect(ANALYTICS_INGEST_ALLOWED_EVENTS.has("runtime_start")).toBe(true);
    expect(ANALYTICS_INGEST_ALLOWED_EVENTS.has("runtime_ready")).toBe(true);
    expect(ANALYTICS_INGEST_ALLOWED_EVENTS.has("runtime_error")).toBe(true);
    expect(ANALYTICS_INGEST_ALLOWED_EVENTS.has("runtime_action")).toBe(true);
  });
});

describe("normalizeAnalyticsUtmContext", () => {
  it("normalizes missing fields to empty strings", () => {
    expect(normalizeAnalyticsUtmContext({})).toEqual({
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
    });
  });

  it("trims valid utm fields", () => {
    expect(
      normalizeAnalyticsUtmContext({
        utm_source: " newsletter ",
        utm_campaign: " spring_launch ",
      })
    ).toEqual({
      utm_source: "newsletter",
      utm_medium: "",
      utm_campaign: "spring_launch",
      utm_term: "",
      utm_content: "",
    });
  });

  it("rejects invalid utm fields", () => {
    expect(normalizeAnalyticsUtmContext({ utm_source: "x".repeat(121) })).toBeNull();
    expect(normalizeAnalyticsUtmContext({ utm_source: "ok", utm_medium: "bad\nvalue" })).toBeNull();
  });
});
