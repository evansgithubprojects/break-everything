import path from "path";
import fs from "fs";

const TEST_DB_DIR = path.join(process.cwd(), "data", "test");
const TEST_DB_PATH = path.join(TEST_DB_DIR, "test.db");

function safeUnlink(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EBUSY") throw error;
  }
}

// Point the DB module to our test database before importing
process.env.TEST_DB_PATH = TEST_DB_PATH;
process.env.ADMIN_PASSWORD = "test-admin-password";

import {
  initDb,
  _closeDb,
  getAllTools,
  getToolBySlug,
  getToolsByCategory,
  createTool,
  updateTool,
  deleteTool,
  verifyAdminPassword,
  getCategories,
  getToolCount,
  getBuiltByUsToolCount,
  getReviewedToolCount,
  getSourceLinkedToolStats,
  getTotalDownloads,
  recordAnalyticsEvent,
  getAnalyticsSummary,
} from "@/server/db";
import type { Tool } from "@/types";

beforeAll(async () => {
  if (!fs.existsSync(TEST_DB_DIR)) {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  }
  // Ensure clean state — delete any leftover test DB
  safeUnlink(TEST_DB_PATH);
  // WAL mode creates these companion files
  for (const ext of ["-wal", "-shm"]) {
    const f = TEST_DB_PATH + ext;
    safeUnlink(f);
  }
  // Initialize the DB (triggers schema + seed)
  await initDb();
});

afterAll(async () => {
  await _closeDb();
  safeUnlink(TEST_DB_PATH);
  for (const ext of ["-wal", "-shm"]) {
    const f = TEST_DB_PATH + ext;
    safeUnlink(f);
  }
});

// --- Tools CRUD ---

describe("Tools CRUD", () => {
  it("seeds 3 default tools on init", async () => {
    const tools = (await getAllTools()) as Tool[];
    expect(tools.length).toBe(3);
  });

  it("getAllTools returns tools sorted by downloads descending", async () => {
    const tools = (await getAllTools()) as Tool[];
    for (let i = 1; i < tools.length; i++) {
      expect(tools[i - 1].downloads).toBeGreaterThanOrEqual(tools[i].downloads);
    }
  });

  it("getToolBySlug returns the correct tool", async () => {
    const tool = (await getToolBySlug("pdf-forge")) as Tool;
    expect(tool).toBeDefined();
    expect(tool.name).toBe("PDF Forge");
    expect(tool.categories).toEqual(["pdf"]);
  });

  it("getToolBySlug returns undefined for non-existent slug", async () => {
    const tool = await getToolBySlug("non-existent");
    expect(tool).toBeUndefined();
  });

  it("getToolsByCategory filters correctly", async () => {
    const pdfTools = (await getToolsByCategory("pdf")) as Tool[];
    expect(pdfTools.length).toBe(1);
    expect(pdfTools[0].slug).toBe("pdf-forge");
  });

  it("getToolsByCategory matches membership in multi-category arrays", async () => {
    await createTool({
      name: "Multi Category Tool",
      slug: "multi-category-tool",
      description: "Belongs to two categories",
      short_description: "multi",
      categories: ["testing", "utility"],
      icon: "🧩",
      tool_kind: "download",
      delivery_mode: "download",
      download_url: "https://example.com/multi",
      web_url: "",
      app_store_url: "",
      play_store_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "",
      vendor: "",
      privacy_summary: "",
      data_handling: "medium",
      review_notes: "",
      last_reviewed_at: null,
      github_url: "",
      platform: "windows",
    });

    const utilityTools = (await getToolsByCategory("utility")) as Tool[];
    expect(utilityTools.map((t) => t.slug)).toContain("multi-category-tool");

    await deleteTool("multi-category-tool");
  });

  it("getCategories returns all unique categories", async () => {
    const cats = await getCategories();
    expect(cats).toContain("pdf");
    expect(cats).toContain("converter");
    expect(cats).toContain("utility");
    expect(cats.length).toBe(3);
  });

  it("getCategories flattens and dedupes categories from all tools", async () => {
    await createTool({
      name: "Deduped Categories Tool",
      slug: "deduped-categories-tool",
      description: "Tests category flattening and dedupe",
      short_description: "dedupe",
      categories: ["utility", "productivity", "utility"],
      icon: "🧰",
      tool_kind: "download",
      delivery_mode: "download",
      download_url: "https://example.com/dedupe",
      web_url: "",
      app_store_url: "",
      play_store_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "",
      vendor: "",
      privacy_summary: "",
      data_handling: "medium",
      review_notes: "",
      last_reviewed_at: null,
      github_url: "",
      platform: "windows",
    });

    const cats = await getCategories();
    expect(cats).toContain("productivity");

    await deleteTool("deduped-categories-tool");
  });

  it("getToolCount returns correct count", async () => {
    expect(await getToolCount()).toBe(3);
  });

  it("getTotalDownloads sums all downloads", async () => {
    const total = await getTotalDownloads();
    expect(total).toBe(12450 + 8320 + 5640);
  });

  it("getReviewedToolCount returns count of non-runtime tools with review dates", async () => {
    expect(await getReviewedToolCount()).toBe(3);

    await createTool({
      name: "RuntimeReviewed",
      slug: "runtime-reviewed",
      description: "Runtime tool with stale imported review metadata",
      short_description: "Runtime",
      categories: ["runtime"],
      icon: "🧪",
      tool_kind: "web",
      delivery_mode: "browserRuntime",
      download_url: "",
      web_url: "https://example.com/runtime",
      app_store_url: "",
      play_store_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 1,
      runtime_entrypoint: "https://example.com/runtime",
      sandbox_level: "strict",
      trusted_domains: "example.com",
      vendor: "",
      privacy_summary: "",
      data_handling: "medium",
      review_notes: "should not count",
      last_reviewed_at: "2026-01-01",
      github_url: "",
      platform: "web",
    });
    expect(await getReviewedToolCount()).toBe(3);
    await deleteTool("runtime-reviewed");
  });

  it("getSourceLinkedToolStats counts tools with non-empty github_url", async () => {
    const s = await getSourceLinkedToolStats();
    expect(s.total).toBe(3);
    expect(s.linked).toBe(3);
  });

  it("counts runtime tools as built by us and project-linked", async () => {
    expect(await getBuiltByUsToolCount()).toBe(0);

    await createTool({
      name: "First Party Runtime",
      slug: "first-party-runtime",
      description: "Runtime tool without a public project link",
      short_description: "Runtime",
      categories: ["runtime"],
      icon: "🧪",
      tool_kind: "web",
      delivery_mode: "browserRuntime",
      download_url: "",
      web_url: "",
      app_store_url: "",
      play_store_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_name: "first-party-runtime",
      runtime_entrypoint: "/runtime/first-party-runtime/index.html",
      sandbox_level: "strict",
      trusted_domains: "",
      vendor: "",
      privacy_summary: "",
      data_handling: "medium",
      review_notes: "",
      last_reviewed_at: null,
      github_url: "",
      platform: "web",
    });

    const s = await getSourceLinkedToolStats();
    expect(await getBuiltByUsToolCount()).toBe(1);
    expect(s.total).toBe(4);
    expect(s.linked).toBe(4);

    await deleteTool("first-party-runtime");
  });

  it("createTool adds a new tool", async () => {
    await createTool({
      name: "TestTool",
      slug: "test-tool",
      description: "A test tool",
      short_description: "Test",
      categories: ["testing", "utility"],
      icon: "🧪",
      tool_kind: "download",
      delivery_mode: "download",
      download_url: "https://example.com/dl",
      web_url: "",
      app_store_url: "",
      play_store_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "",
      vendor: "",
      privacy_summary: "",
      data_handling: "medium",
      review_notes: "",
      last_reviewed_at: null,
      github_url: "https://github.com/test/test",
      platform: "windows",
    });

    const tool = (await getToolBySlug("test-tool")) as Tool;
    expect(tool).toBeDefined();
    expect(tool.name).toBe("TestTool");
    expect(tool.categories).toEqual(["testing", "utility"]);
    expect(await getToolCount()).toBe(4);
  });

  it("createTool defaults github_url to empty when omitted", async () => {
    await createTool({
      name: "NoSource",
      slug: "no-source",
      description: "A test tool without source link",
      short_description: "No source",
      categories: ["testing"],
      icon: "🧪",
      tool_kind: "download",
      delivery_mode: "download",
      download_url: "https://example.com/no-source",
      web_url: "",
      app_store_url: "",
      play_store_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "",
      vendor: "",
      privacy_summary: "",
      data_handling: "medium",
      review_notes: "",
      last_reviewed_at: null,
      platform: "windows",
    });

    const tool = (await getToolBySlug("no-source")) as Tool;
    expect(tool).toBeDefined();
    expect(tool.github_url).toBe("");
    await deleteTool("no-source");
  });

  it("createTool rejects duplicate slugs", async () => {
    await expect(
      createTool({
        name: "Dupe",
        slug: "test-tool",
        description: "dupe",
        short_description: "dupe",
        categories: ["testing"],
        icon: "🔧",
        tool_kind: "download",
        delivery_mode: "download",
        download_url: "https://example.com",
        web_url: "",
        app_store_url: "",
        play_store_url: "",
        embed_allowed: 0,
        embed_url: "",
        runtime_supported: 0,
        runtime_name: "",
        runtime_entrypoint: "",
        sandbox_level: "strict",
        trusted_domains: "",
        vendor: "",
        privacy_summary: "",
        data_handling: "medium",
        review_notes: "",
        last_reviewed_at: null,
        github_url: "https://github.com/test",
        platform: "windows",
      })
    ).rejects.toThrow();
  });

  it("updateTool modifies fields", async () => {
    await updateTool("test-tool", {
      name: "TestTool Updated",
      description: "Updated description",
      short_description: "Updated",
      categories: ["testing", "desktop"],
      icon: "🧪",
      tool_kind: "download",
      delivery_mode: "download",
      download_url: "https://example.com/dl",
      web_url: "",
      app_store_url: "",
      play_store_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "",
      vendor: "",
      privacy_summary: "",
      data_handling: "medium",
      review_notes: "",
      last_reviewed_at: null,
      github_url: "https://github.com/test/test",
      platform: "windows,mac",
    });

    const tool = (await getToolBySlug("test-tool")) as Tool;
    expect(tool.name).toBe("TestTool Updated");
    expect(tool.categories).toEqual(["testing", "desktop"]);
    expect(tool.platform).toBe("windows,mac");
  });

  it("deleteTool removes the tool", async () => {
    await deleteTool("test-tool");
    expect(await getToolBySlug("test-tool")).toBeUndefined();
    expect(await getToolCount()).toBe(3);
  });
});

// --- Admin Auth ---

describe("Admin password verification", () => {
  it("accepts the correct password", async () => {
    expect(await verifyAdminPassword("test-admin-password")).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    expect(await verifyAdminPassword("wrong-password")).toBe(false);
  });

  it("rejects empty string", async () => {
    expect(await verifyAdminPassword("")).toBe(false);
  });
});

// --- Analytics ---

describe("Analytics DB", () => {
  function sinceUtcMidnightDaysAgo(days: number): Date {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  it("recordAnalyticsEvent rows roll up in getAnalyticsSummary", async () => {
    await recordAnalyticsEvent({
      event: "tool_action_click",
      slug: "pdf-forge",
      action: "web",
    });
    await recordAnalyticsEvent({
      event: "tool_action_click",
      slug: "pdf-forge",
      action: "download",
    });
    await recordAnalyticsEvent({
      event: "tool_action_click",
      slug: "convertx",
      action: "redirect",
    });

    const since = sinceUtcMidnightDaysAgo(1);
    const summary = await getAnalyticsSummary(since);

    expect(summary.totals.all).toBeGreaterThanOrEqual(3);
    expect(summary.toolActionClicks).toBeGreaterThanOrEqual(3);
    expect(summary.uniqueSlugs).toBeGreaterThanOrEqual(2);

    const webRow = summary.byAction.find((a) => a.action === "web");
    const dlRow = summary.byAction.find((a) => a.action === "download");
    expect(webRow?.count).toBeGreaterThanOrEqual(1);
    expect(dlRow?.count).toBeGreaterThanOrEqual(1);

    const pdfTop = summary.topTools.find((t) => t.slug === "pdf-forge");
    expect(pdfTop?.count).toBeGreaterThanOrEqual(2);
  });

  it("getAnalyticsSummary slug filter scopes totals and top tools", async () => {
    const since = sinceUtcMidnightDaysAgo(90);
    const filtered = await getAnalyticsSummary(since, { slug: "pdf-forge" });

    expect(filtered.totals.all).toBeGreaterThanOrEqual(2);
    expect(filtered.toolActionClicks).toBe(filtered.totals.all);
    expect(filtered.topTools.every((t) => t.slug === "pdf-forge")).toBe(true);
  });

  it("getAnalyticsSummary includes runtime lifecycle and UTM campaign aggregates", async () => {
    await recordAnalyticsEvent({
      event: "runtime_start",
      slug: "pdf-forge",
      action: "runtime_boot",
      utm_campaign: "be_campus_2026",
    });
    await recordAnalyticsEvent({
      event: "runtime_error",
      slug: "pdf-forge",
      action: "module_load_failed",
      utm_campaign: "be_campus_2026",
    });

    const since = sinceUtcMidnightDaysAgo(1);
    const summary = await getAnalyticsSummary(since);
    const runtimeStart = summary.runtimeLifecycleEvents.find((row) => row.event === "runtime_start");
    const runtimeError = summary.runtimeLifecycleEvents.find((row) => row.event === "runtime_error");
    expect(runtimeStart?.count).toBeGreaterThanOrEqual(1);
    expect(runtimeError?.count).toBeGreaterThanOrEqual(1);
    expect(summary.runtimeFailureRate).toBeGreaterThan(0);
    const campaign = summary.byUtmCampaign.find((row) => row.campaign === "be_campus_2026");
    expect(campaign?.count).toBeGreaterThanOrEqual(2);
  });
});
