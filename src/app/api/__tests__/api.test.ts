import path from "path";
import fs from "fs";

const TEST_DB_DIR = path.join(process.cwd(), "data", "test");
const TEST_DB_PATH = path.join(TEST_DB_DIR, "test-api.db");

function safeUnlink(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EBUSY") throw error;
  }
}

process.env.TEST_DB_PATH = TEST_DB_PATH;
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.SESSION_SECRET = "test-session-secret";

// Mock next/headers cookies — API routes depend on this via auth.ts
const mockCookieStore = new Map<string, { value: string }>();
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => mockCookieStore.get(name),
    set: (name: string, value: string) =>
      mockCookieStore.set(name, { value }),
    delete: (name: string) => mockCookieStore.delete(name),
  }),
}));

import { NextRequest } from "next/server";
import { initDb, _closeDb } from "@/server/db";

// Import route handlers
import { GET as getTools, POST as postTool } from "@/app/api/tools/route";
import {
  GET as getToolBySlug,
  PUT as putTool,
  DELETE as deleteToolRoute,
} from "@/app/api/tools/[slug]/route";
import {
  GET as getAuth,
  POST as postAuth,
  DELETE as deleteAuth,
} from "@/app/api/auth/route";
import { POST as postEvent } from "@/app/api/events/route";
import { GET as getAnalytics } from "@/app/api/analytics/route";
import { ANALYTICS_INGEST_RATE_LIMIT } from "@/server/rate-limit";

beforeAll(async () => {
  if (!fs.existsSync(TEST_DB_DIR)) {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  }
  safeUnlink(TEST_DB_PATH);
  for (const ext of ["-wal", "-shm"]) {
    const f = TEST_DB_PATH + ext;
    safeUnlink(f);
  }
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

beforeEach(() => {
  mockCookieStore.clear();
});

async function loginAsAdmin() {
  const req = jsonRequest("http://localhost/api/auth", "POST", {
    password: "test-admin-password",
  });
  await postAuth(req);
}

function jsonRequest(url: string, method: string, body?: object): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `test-${Math.random()}`,
    },
  };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(url, init);
}

// --- Auth API ---

describe("Auth API", () => {
  it("GET /api/auth returns unauthenticated when no session", async () => {
    const req = jsonRequest("http://localhost/api/auth", "GET");
    const res = await getAuth(req);
    const data = await res.json();
    expect(data.authenticated).toBe(false);
  });

  it("POST /api/auth rejects wrong password", async () => {
    const req = jsonRequest("http://localhost/api/auth", "POST", {
      password: "wrong",
    });
    const res = await postAuth(req);
    expect(res.status).toBe(401);
  });

  it("POST /api/auth rejects empty password", async () => {
    const req = jsonRequest("http://localhost/api/auth", "POST", {
      password: "",
    });
    const res = await postAuth(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/auth rejects invalid JSON with 400", async () => {
    const req = new NextRequest("http://localhost/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.11",
      },
      body: "{not-json",
    });
    const res = await postAuth(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid payload");
  });

  it("POST /api/auth accepts correct password and sets session", async () => {
    const req = jsonRequest("http://localhost/api/auth", "POST", {
      password: "test-admin-password",
    });
    const res = await postAuth(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockCookieStore.has("be_admin_session")).toBe(true);
  });

  it("POST /api/auth rate-limits repeated failed attempts", async () => {
    for (let i = 0; i < 5; i++) {
      const req = new NextRequest("http://localhost/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.10",
        },
        body: JSON.stringify({ password: "wrong" }),
      });
      const res = await postAuth(req);
      expect(res.status).toBe(401);
    }

    const blockedReq = new NextRequest("http://localhost/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.10",
      },
      body: JSON.stringify({ password: "wrong" }),
    });
    const blockedRes = await postAuth(blockedReq);
    expect(blockedRes.status).toBe(429);
    const retryAfter = parseInt(blockedRes.headers.get("Retry-After") || "0");
    expect(retryAfter).toBeGreaterThan(0);
  });

  it("GET /api/auth returns authenticated after login", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/auth", "GET");
    const res = await getAuth(req);
    const data = await res.json();
    expect(data.authenticated).toBe(true);
  });

  it("DELETE /api/auth clears session", async () => {
    await loginAsAdmin();
    await deleteAuth();
    expect(mockCookieStore.has("be_admin_session")).toBe(false);
  });
});

// --- Tools API ---

describe("Tools API", () => {
  it("GET /api/tools returns seeded tools", async () => {
    const req = jsonRequest("http://localhost/api/tools", "GET");
    const res = await getTools(req);
    const data = await res.json();
    expect(data.tools.length).toBe(3);
    for (const t of data.tools) {
      expect(t).not.toHaveProperty("review_notes");
    }
  });

  it("POST /api/tools rejects unauthenticated requests", async () => {
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "New Tool",
      slug: "new-tool",
      description: "desc",
      short_description: "short",
      categories: ["test"],
      download_url: "https://example.com",
      github_url: "https://github.com/test",
    });
    const res = await postTool(req);
    expect(res.status).toBe(401);
  });

  it("POST /api/tools rejects forged session cookie", async () => {
    mockCookieStore.set("be_admin_session", { value: "not-a-valid-token" });
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "Forged",
      slug: "forged-tool",
      description: "desc",
      short_description: "short",
      categories: ["test"],
      download_url: "https://example.com",
      github_url: "https://github.com/test",
    });
    const res = await postTool(req);
    expect(res.status).toBe(401);
  });

  it("POST /api/tools rejects missing required fields when authenticated", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "Incomplete Tool",
    });
    const res = await postTool(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/tools creates a tool when authenticated", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "API Test Tool",
      slug: "api-test-tool",
      description: "Created via API test",
      short_description: "API test",
      categories: ["test", "utility"],
      download_url: "https://example.com/dl",
      github_url: "https://github.com/test/api",
    });
    const res = await postTool(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("POST /api/tools allows missing github_url when authenticated", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "No Source API Tool",
      slug: "no-source-api-tool",
      description: "Created via API test with no source link",
      short_description: "API no source",
      categories: ["test"],
      download_url: "https://example.com/no-source-api",
    });
    const res = await postTool(req);
    expect(res.status).toBe(201);

    const getReq = jsonRequest("http://localhost/api/tools/no-source-api-tool", "GET");
    const getRes = await getToolBySlug(getReq, {
      params: Promise.resolve({ slug: "no-source-api-tool" }),
    });
    const data = await getRes.json();
    expect(data.tool.github_url).toBe("");
  });

  it("POST /api/tools creates a web app with web_url when authenticated", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "Web Only",
      slug: "web-only-tool",
      description: "Browser app",
      short_description: "Web short",
      categories: ["utility"],
      tool_kind: "web",
      web_url: "https://app.example.com/run",
      download_url: "",
      github_url: "https://github.com/test/web-only",
      platform: "web",
    });
    const res = await postTool(req);
    expect(res.status).toBe(201);

    const getReq = jsonRequest("http://localhost/api/tools/web-only-tool", "GET");
    const getRes = await getToolBySlug(getReq, {
      params: Promise.resolve({ slug: "web-only-tool" }),
    });
    const data = await getRes.json();
    expect(data.tool.tool_kind).toBe("web");
    expect(data.tool.web_url).toBe("https://app.example.com/run");
    expect(data.tool.download_url).toBe("");
  });

  it("POST /api/tools returns 500 for duplicate slug", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "Duplicate Slug Tool",
      slug: "pdf-forge",
      description: "Should fail on duplicate slug",
      short_description: "duplicate",
      categories: ["test"],
      download_url: "https://example.com/dupe",
      github_url: "https://github.com/test/dupe",
    });

    const res = await postTool(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Something went wrong.");
  });

  it("GET /api/tools/[slug] returns the created tool", async () => {
    const req = jsonRequest("http://localhost/api/tools/api-test-tool", "GET");
    const params = Promise.resolve({ slug: "api-test-tool" });
    const res = await getToolBySlug(req, { params });
    const data = await res.json();
    expect(data.tool.name).toBe("API Test Tool");
    expect(data.tool).not.toHaveProperty("review_notes");
  });

  it("GET /api/tools/[slug] returns 404 for unknown slug", async () => {
    const req = jsonRequest("http://localhost/api/tools/nope", "GET");
    const params = Promise.resolve({ slug: "nope" });
    const res = await getToolBySlug(req, { params });
    expect(res.status).toBe(404);
  });

  it("PUT /api/tools/[slug] updates a tool when authenticated", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools/api-test-tool", "PUT", {
      name: "API Test Tool Renamed",
      description: "Updated",
      short_description: "Updated short",
      categories: ["test", "desktop"],
      download_url: "https://example.com/dl2",
      github_url: "https://github.com/test/api2",
      platform: "mac",
    });
    const params = Promise.resolve({ slug: "api-test-tool" });
    const res = await putTool(req, { params });
    expect(res.status).toBe(200);

    const getReq = jsonRequest("http://localhost/api/tools/api-test-tool", "GET");
    const getRes = await getToolBySlug(getReq, {
      params: Promise.resolve({ slug: "api-test-tool" }),
    });
    const data = await getRes.json();
    expect(data.tool.name).toBe("API Test Tool Renamed");
  });

  it("PUT /api/tools/[slug] on missing slug is a no-op success", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools/nope", "PUT", {
      name: "Does not exist",
      description: "Still returns success",
      short_description: "noop",
      categories: ["test"],
      download_url: "https://example.com/nope",
      github_url: "https://github.com/test/nope",
      platform: "windows",
    });
    const params = Promise.resolve({ slug: "nope" });
    const res = await putTool(req, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("DELETE /api/tools/[slug] removes a tool when authenticated", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools/api-test-tool", "DELETE");
    const params = Promise.resolve({ slug: "api-test-tool" });
    const res = await deleteToolRoute(req, { params });
    expect(res.status).toBe(200);

    const getReq = jsonRequest("http://localhost/api/tools/api-test-tool", "GET");
    const getRes = await getToolBySlug(getReq, {
      params: Promise.resolve({ slug: "api-test-tool" }),
    });
    expect(getRes.status).toBe(404);
  });

  it("DELETE /api/tools/[slug] on missing slug is idempotent success", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools/nope", "DELETE");
    const params = Promise.resolve({ slug: "nope" });
    const res = await deleteToolRoute(req, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("POST /api/tools rejects missing categories", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "No Categories",
      slug: "no-categories",
      description: "Invalid payload",
      short_description: "invalid",
      download_url: "https://example.com/no-categories",
      github_url: "https://github.com/test/no-categories",
    });
    const res = await postTool(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("categories");
  });

  it("POST /api/tools rejects empty categories array", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "Empty Categories",
      slug: "empty-categories",
      description: "Invalid payload",
      short_description: "invalid",
      categories: [],
      download_url: "https://example.com/empty-categories",
      github_url: "https://github.com/test/empty-categories",
    });
    const res = await postTool(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("at least one");
  });

  it("POST /api/tools dedupes categories case-insensitively", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "Normalized Categories",
      slug: "normalized-categories",
      description: "Category normalization test",
      short_description: "normalize",
      categories: ["  Utility  ", "utility", "TOOLS "],
      download_url: "https://example.com/normalized-categories",
      github_url: "https://github.com/test/normalized-categories",
    });
    const res = await postTool(req);
    expect(res.status).toBe(201);

    const getReq = jsonRequest("http://localhost/api/tools/normalized-categories", "GET");
    const getRes = await getToolBySlug(getReq, {
      params: Promise.resolve({ slug: "normalized-categories" }),
    });
    expect(getRes.status).toBe(200);
    const data = await getRes.json();
    expect(data.tool.categories).toEqual(["Utility", "TOOLS"]);

    const delReq = jsonRequest("http://localhost/api/tools/normalized-categories", "DELETE");
    const delRes = await deleteToolRoute(delReq, {
      params: Promise.resolve({ slug: "normalized-categories" }),
    });
    expect(delRes.status).toBe(200);
  });
});

// --- Events API ---

describe("Events API", () => {
  it("POST /api/events persists a valid analytics event", async () => {
    const req = jsonRequest("http://localhost/api/events", "POST", {
      event: "tool_action_click",
      slug: "pdf-forge",
      action: "download",
    });
    const res = await postEvent(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("POST /api/events rejects unknown event", async () => {
    const req = jsonRequest("http://localhost/api/events", "POST", {
      event: "unknown_event",
      slug: "pdf-forge",
      action: "download",
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/events rejects invalid slug", async () => {
    const req = jsonRequest("http://localhost/api/events", "POST", {
      event: "tool_action_click",
      slug: "Not_A_Slug!",
      action: "download",
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/events rejects invalid action characters", async () => {
    const req = jsonRequest("http://localhost/api/events", "POST", {
      event: "tool_action_click",
      slug: "pdf-forge",
      action: "download;",
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/events rejects missing event or slug", async () => {
    const noEvent = jsonRequest("http://localhost/api/events", "POST", {
      slug: "pdf-forge",
      action: "download",
    });
    expect((await postEvent(noEvent)).status).toBe(400);

    const noSlug = jsonRequest("http://localhost/api/events", "POST", {
      event: "tool_action_click",
      action: "download",
    });
    expect((await postEvent(noSlug)).status).toBe(400);
  });

  it("POST /api/events accepts omitted action as empty string", async () => {
    const req = jsonRequest("http://localhost/api/events", "POST", {
      event: "tool_action_click",
      slug: "pdf-forge",
    });
    const res = await postEvent(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("POST /api/events rejects invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.50",
      },
      body: "not-valid-json{",
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid payload");
  });

  it("POST /api/events rejects empty body", async () => {
    const req = new NextRequest("http://localhost/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.51",
      },
      body: "",
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid payload");
  });

  it("POST /api/events rejects whitespace-only body", async () => {
    const req = new NextRequest("http://localhost/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.52",
      },
      body: " \n\t ",
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid payload");
  });

  it("POST /api/events rejects JSON body when Content-Type is not application/json", async () => {
    const req = new NextRequest("http://localhost/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "x-forwarded-for": "203.0.113.53",
      },
      body: JSON.stringify({
        event: "tool_action_click",
        slug: "pdf-forge",
        action: "download",
      }),
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid payload");
  });

  it("POST /api/events rejects missing Content-Type with non-empty body", async () => {
    const req = new NextRequest("http://localhost/api/events", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.54",
      },
      body: JSON.stringify({
        event: "tool_action_click",
        slug: "pdf-forge",
      }),
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid payload");
  });

  it("POST /api/events rejects truncated JSON", async () => {
    const req = new NextRequest("http://localhost/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.55",
      },
      body: '{"event":"tool_action_click","slug":',
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid payload");
  });

  it("POST /api/events rejects JSON array root", async () => {
    const req = new NextRequest("http://localhost/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.56",
      },
      body: JSON.stringify([{ event: "tool_action_click", slug: "pdf-forge" }]),
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid payload");
  });

  it("POST /api/events accepts application/json with charset", async () => {
    const req = new NextRequest("http://localhost/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-forwarded-for": "203.0.113.57",
      },
      body: JSON.stringify({
        event: "tool_action_click",
        slug: "pdf-forge",
        action: "download",
      }),
    });
    const res = await postEvent(req);
    expect(res.status).toBe(200);
  });

  it("POST /api/events rate-limits ingest per IP", async () => {
    // `TRUST_FORWARDED_FOR` is set in `src/test-env.ts` (jest setupFiles) so this header is the client key.
    const { maxRequests } = ANALYTICS_INGEST_RATE_LIMIT;
    const ip = "203.0.113.99";
    for (let i = 0; i < maxRequests; i++) {
      const req = new NextRequest("http://localhost/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({
          event: "tool_action_click",
          slug: "pdf-forge",
          action: "download",
        }),
      });
      expect((await postEvent(req)).status).toBe(200);
    }

    const blocked = new NextRequest("http://localhost/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({
        event: "tool_action_click",
        slug: "pdf-forge",
        action: "embed",
      }),
    });
    const blockedRes = await postEvent(blocked);
    expect(blockedRes.status).toBe(429);
  });
});

// --- Analytics API ---

describe("Analytics API", () => {
  it("GET /api/analytics returns 401 without session", async () => {
    const req = jsonRequest("http://localhost/api/analytics", "GET");
    const res = await getAnalytics(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/analytics returns aggregates after events when authenticated", async () => {
    for (let i = 0; i < 2; i++) {
      const evReq = jsonRequest("http://localhost/api/events", "POST", {
        event: "tool_action_click",
        slug: "convertx",
        action: "redirect",
      });
      expect((await postEvent(evReq)).status).toBe(200);
    }

    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/analytics?days=7", "GET");
    const res = await getAnalytics(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.days).toBe(7);
    expect(data.summary.totals.all).toBeGreaterThanOrEqual(2);
    expect(data.summary.toolActionClicks).toBeGreaterThanOrEqual(2);
    const top = data.summary.topTools as { slug: string; count: number }[];
    const convertx = top.find((t) => t.slug === "convertx");
    expect(convertx).toBeDefined();
    expect(convertx!.count).toBeGreaterThanOrEqual(2);
  });

  it("GET /api/analytics rejects invalid slug query param", async () => {
    await loginAsAdmin();
    const req = jsonRequest("http://localhost/api/analytics?slug=Not%21Valid", "GET");
    const res = await getAnalytics(req);
    expect(res.status).toBe(400);
  });

  it("GET /api/analytics filters by slug", async () => {
    const evReq = jsonRequest("http://localhost/api/events", "POST", {
      event: "tool_action_click",
      slug: "clipvault",
      action: "embed",
    });
    expect((await postEvent(evReq)).status).toBe(200);

    await loginAsAdmin();
    const allRes = await getAnalytics(jsonRequest("http://localhost/api/analytics?days=90", "GET"));
    expect(allRes.status).toBe(200);
    const allData = await allRes.json();

    const filRes = await getAnalytics(
      jsonRequest("http://localhost/api/analytics?days=90&slug=clipvault", "GET")
    );
    expect(filRes.status).toBe(200);
    const filData = await filRes.json();
    expect(filData.slug).toBe("clipvault");
    expect(filData.summary.totals.all).toBeLessThanOrEqual(allData.summary.totals.all);
    expect(filData.summary.toolActionClicks).toBeGreaterThanOrEqual(1);
    expect(filData.summary.topTools.length).toBeLessThanOrEqual(1);
    if (filData.summary.topTools.length === 1) {
      expect(filData.summary.topTools[0].slug).toBe("clipvault");
    }
    const embedRow = (filData.summary.byAction as { action: string; count: number }[]).find(
      (a) => a.action === "embed"
    );
    expect(embedRow).toBeDefined();
    expect(embedRow!.count).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/analytics clamps days to default when below 1 or non-numeric", async () => {
    await loginAsAdmin();

    const zeroDays = await getAnalytics(jsonRequest("http://localhost/api/analytics?days=0", "GET"));
    expect(zeroDays.status).toBe(200);
    expect((await zeroDays.json()).days).toBe(7);

    const badDays = await getAnalytics(
      jsonRequest("http://localhost/api/analytics?days=not-a-number", "GET")
    );
    expect(badDays.status).toBe(200);
    expect((await badDays.json()).days).toBe(7);
  });

  it("GET /api/analytics caps days at 90", async () => {
    await loginAsAdmin();
    const res = await getAnalytics(jsonRequest("http://localhost/api/analytics?days=500", "GET"));
    expect(res.status).toBe(200);
    expect((await res.json()).days).toBe(90);
  });
});
