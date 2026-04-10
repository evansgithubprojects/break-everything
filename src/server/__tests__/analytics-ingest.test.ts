import { normalizeAnalyticsAction, ANALYTICS_INGEST_ALLOWED_EVENTS } from "@/server/analytics-ingest";

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
  it("includes tool_action_click for client ingest", () => {
    expect(ANALYTICS_INGEST_ALLOWED_EVENTS.has("tool_action_click")).toBe(true);
  });
});
