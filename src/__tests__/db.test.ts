import path from "path";
import fs from "fs";

const TEST_DB_DIR = path.join(process.cwd(), "data", "test");
const TEST_DB_PATH = path.join(TEST_DB_DIR, "test.db");

// Point the DB module to our test database before importing
process.env.TEST_DB_PATH = TEST_DB_PATH;

import {
  getDb,
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
  getTotalDownloads,
  createToolRequest,
  getAllToolRequests,
  getPendingToolRequests,
  updateToolRequestStatus,
  deleteToolRequest,
} from "@/lib/db";
import type { Tool } from "@/components/ToolCard";
import type { ToolRequest } from "@/lib/db";

beforeAll(() => {
  if (!fs.existsSync(TEST_DB_DIR)) {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  }
  // Ensure clean state — delete any leftover test DB
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  // WAL mode creates these companion files
  for (const ext of ["-wal", "-shm"]) {
    const f = TEST_DB_PATH + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  // Initialize the DB (triggers schema + seed)
  getDb();
});

afterAll(() => {
  _closeDb();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  for (const ext of ["-wal", "-shm"]) {
    const f = TEST_DB_PATH + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});

// --- Tools CRUD ---

describe("Tools CRUD", () => {
  it("seeds 3 default tools on init", () => {
    const tools = getAllTools() as Tool[];
    expect(tools.length).toBe(3);
  });

  it("getAllTools returns tools sorted by downloads descending", () => {
    const tools = getAllTools() as Tool[];
    for (let i = 1; i < tools.length; i++) {
      expect(tools[i - 1].downloads).toBeGreaterThanOrEqual(tools[i].downloads);
    }
  });

  it("getToolBySlug returns the correct tool", () => {
    const tool = getToolBySlug("pdf-forge") as Tool;
    expect(tool).toBeDefined();
    expect(tool.name).toBe("PDF Forge");
    expect(tool.category).toBe("pdf");
  });

  it("getToolBySlug returns undefined for non-existent slug", () => {
    const tool = getToolBySlug("non-existent");
    expect(tool).toBeUndefined();
  });

  it("getToolsByCategory filters correctly", () => {
    const pdfTools = getToolsByCategory("pdf") as Tool[];
    expect(pdfTools.length).toBe(1);
    expect(pdfTools[0].slug).toBe("pdf-forge");
  });

  it("getCategories returns all unique categories", () => {
    const cats = getCategories();
    expect(cats).toContain("pdf");
    expect(cats).toContain("converter");
    expect(cats).toContain("utility");
    expect(cats.length).toBe(3);
  });

  it("getToolCount returns correct count", () => {
    expect(getToolCount()).toBe(3);
  });

  it("getTotalDownloads sums all downloads", () => {
    const total = getTotalDownloads();
    expect(total).toBe(12450 + 8320 + 5640);
  });

  it("createTool adds a new tool", () => {
    createTool({
      name: "TestTool",
      slug: "test-tool",
      description: "A test tool",
      short_description: "Test",
      category: "testing",
      icon: "🧪",
      download_url: "https://example.com/dl",
      github_url: "https://github.com/test/test",
      platform: "windows",
      sha256_hash: "abc123",
      safety_score: 90,
      last_scan_date: "2026-04-01",
    });

    const tool = getToolBySlug("test-tool") as Tool;
    expect(tool).toBeDefined();
    expect(tool.name).toBe("TestTool");
    expect(tool.safety_score).toBe(90);
    expect(getToolCount()).toBe(4);
  });

  it("createTool rejects duplicate slugs", () => {
    expect(() =>
      createTool({
        name: "Dupe",
        slug: "test-tool",
        description: "dupe",
        short_description: "dupe",
        category: "testing",
        icon: "🔧",
        download_url: "https://example.com",
        github_url: "https://github.com/test",
        platform: "windows",
        sha256_hash: null,
        safety_score: 100,
        last_scan_date: null,
      })
    ).toThrow();
  });

  it("updateTool modifies fields", () => {
    updateTool("test-tool", {
      name: "TestTool Updated",
      description: "Updated description",
      short_description: "Updated",
      category: "testing",
      icon: "🧪",
      download_url: "https://example.com/dl",
      github_url: "https://github.com/test/test",
      platform: "windows,mac",
      sha256_hash: "def456",
      safety_score: 95,
      last_scan_date: "2026-04-05",
    });

    const tool = getToolBySlug("test-tool") as Tool;
    expect(tool.name).toBe("TestTool Updated");
    expect(tool.platform).toBe("windows,mac");
    expect(tool.safety_score).toBe(95);
  });

  it("deleteTool removes the tool", () => {
    deleteTool("test-tool");
    expect(getToolBySlug("test-tool")).toBeUndefined();
    expect(getToolCount()).toBe(3);
  });
});

// --- Admin Auth ---

describe("Admin password verification", () => {
  it("accepts the correct password", () => {
    expect(verifyAdminPassword("Wandmoon1!")).toBe(true);
  });

  it("rejects an incorrect password", () => {
    expect(verifyAdminPassword("wrong-password")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(verifyAdminPassword("")).toBe(false);
  });
});

// --- Tool Requests ---

describe("Tool Requests CRUD", () => {
  it("starts with no requests", () => {
    const reqs = getAllToolRequests();
    expect(reqs.length).toBe(0);
  });

  it("createToolRequest adds a request with pending status", () => {
    createToolRequest({
      tool_name: "Notion Clone",
      description: "A free open-source Notion alternative",
      submitted_by: "Alice",
      link: "https://github.com/example/notion-clone",
    });

    const reqs = getAllToolRequests() as ToolRequest[];
    expect(reqs.length).toBe(1);
    expect(reqs[0].tool_name).toBe("Notion Clone");
    expect(reqs[0].status).toBe("pending");
    expect(reqs[0].submitted_by).toBe("Alice");
  });

  it("createToolRequest works with optional fields omitted", () => {
    createToolRequest({
      tool_name: "Anon Tool",
      description: "Some tool",
    });

    const reqs = getAllToolRequests() as ToolRequest[];
    expect(reqs.length).toBe(2);
    const anon = reqs.find((r) => r.tool_name === "Anon Tool")!;
    expect(anon.submitted_by).toBeNull();
    expect(anon.link).toBeNull();
  });

  it("getPendingToolRequests only returns pending ones", () => {
    const pending = getPendingToolRequests();
    expect(pending.length).toBe(2);
  });

  it("updateToolRequestStatus changes the status", () => {
    const reqs = getAllToolRequests() as ToolRequest[];
    const first = reqs[reqs.length - 1]; // oldest

    updateToolRequestStatus(first.id, "approved");

    const updated = getAllToolRequests() as ToolRequest[];
    const found = updated.find((r) => r.id === first.id)!;
    expect(found.status).toBe("approved");

    const pending = getPendingToolRequests();
    expect(pending.length).toBe(1);
  });

  it("deleteToolRequest removes a request", () => {
    const reqs = getAllToolRequests() as ToolRequest[];
    deleteToolRequest(reqs[0].id);

    expect(getAllToolRequests().length).toBe(1);
  });

  // Clean up remaining
  afterAll(() => {
    const reqs = getAllToolRequests() as ToolRequest[];
    for (const r of reqs) {
      deleteToolRequest(r.id);
    }
  });
});
