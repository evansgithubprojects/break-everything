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
  getTotalDownloads,
  createToolRequest,
  getAllToolRequests,
  getPendingToolRequests,
  updateToolRequestStatus,
  deleteToolRequest,
} from "@/server/db";
import type { Tool } from "@/types";
import type { ToolRequest } from "@/server/db";

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
    expect(tool.category).toBe("pdf");
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

  it("getCategories returns all unique categories", async () => {
    const cats = await getCategories();
    expect(cats).toContain("pdf");
    expect(cats).toContain("converter");
    expect(cats).toContain("utility");
    expect(cats.length).toBe(3);
  });

  it("getToolCount returns correct count", async () => {
    expect(await getToolCount()).toBe(3);
  });

  it("getTotalDownloads sums all downloads", async () => {
    const total = await getTotalDownloads();
    expect(total).toBe(12450 + 8320 + 5640);
  });

  it("createTool adds a new tool", async () => {
    await createTool({
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

    const tool = (await getToolBySlug("test-tool")) as Tool;
    expect(tool).toBeDefined();
    expect(tool.name).toBe("TestTool");
    expect(tool.safety_score).toBe(90);
    expect(await getToolCount()).toBe(4);
  });

  it("createTool rejects duplicate slugs", async () => {
    await expect(
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
    ).rejects.toThrow();
  });

  it("updateTool modifies fields", async () => {
    await updateTool("test-tool", {
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

    const tool = (await getToolBySlug("test-tool")) as Tool;
    expect(tool.name).toBe("TestTool Updated");
    expect(tool.platform).toBe("windows,mac");
    expect(tool.safety_score).toBe(95);
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

// --- Tool Requests ---

describe("Tool Requests CRUD", () => {
  it("starts with no requests", async () => {
    const reqs = await getAllToolRequests();
    expect(reqs.length).toBe(0);
  });

  it("createToolRequest adds a request with pending status", async () => {
    await createToolRequest({
      tool_name: "Notion Clone",
      description: "A free open-source Notion alternative",
      submitted_by: "Alice",
      link: "https://github.com/example/notion-clone",
    });

    const reqs = (await getAllToolRequests()) as ToolRequest[];
    expect(reqs.length).toBe(1);
    expect(reqs[0].tool_name).toBe("Notion Clone");
    expect(reqs[0].status).toBe("pending");
    expect(reqs[0].submitted_by).toBe("Alice");
  });

  it("createToolRequest works with optional fields omitted", async () => {
    await createToolRequest({
      tool_name: "Anon Tool",
      description: "Some tool",
    });

    const reqs = (await getAllToolRequests()) as ToolRequest[];
    expect(reqs.length).toBe(2);
    const anon = reqs.find((r) => r.tool_name === "Anon Tool")!;
    expect(anon.submitted_by).toBeNull();
    expect(anon.link).toBeNull();
  });

  it("getPendingToolRequests only returns pending ones", async () => {
    const pending = await getPendingToolRequests();
    expect(pending.length).toBe(2);
  });

  it("updateToolRequestStatus changes the status", async () => {
    const reqs = (await getAllToolRequests()) as ToolRequest[];
    const first = reqs[reqs.length - 1]; // oldest

    await updateToolRequestStatus(first.id, "approved");

    const updated = (await getAllToolRequests()) as ToolRequest[];
    const found = updated.find((r) => r.id === first.id)!;
    expect(found.status).toBe("approved");

    const pending = await getPendingToolRequests();
    expect(pending.length).toBe(1);
  });

  it("deleteToolRequest removes a request", async () => {
    const reqs = (await getAllToolRequests()) as ToolRequest[];
    await deleteToolRequest(reqs[0].id);

    expect((await getAllToolRequests()).length).toBe(1);
  });

  // Clean up remaining
  afterAll(async () => {
    const reqs = (await getAllToolRequests()) as ToolRequest[];
    for (const r of reqs) {
      await deleteToolRequest(r.id);
    }
  });
});
