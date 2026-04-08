import path from "path";
import fs from "fs";

const TEST_DB_DIR = path.join(process.cwd(), "data", "test");
const TEST_DB_PATH = path.join(TEST_DB_DIR, "test-api.db");

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
import { getDb, _closeDb } from "@/server/db";

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
import {
  GET as getRequests,
  POST as postRequest,
} from "@/app/api/requests/route";

beforeAll(() => {
  if (!fs.existsSync(TEST_DB_DIR)) {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  }
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  for (const ext of ["-wal", "-shm"]) {
    const f = TEST_DB_PATH + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
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

beforeEach(() => {
  mockCookieStore.clear();
});

function jsonRequest(url: string, method: string, body?: object): NextRequest {
  const init: RequestInit = {
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
    // Session was set by previous test — set it manually to be safe
    mockCookieStore.set("be_admin_session", { value: "test-token" });
    const req = jsonRequest("http://localhost/api/auth", "GET");
    const res = await getAuth(req);
    const data = await res.json();
    expect(data.authenticated).toBe(true);
  });

  it("DELETE /api/auth clears session", async () => {
    mockCookieStore.set("be_admin_session", { value: "test-token" });
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
  });

  it("POST /api/tools rejects unauthenticated requests", async () => {
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "New Tool",
      slug: "new-tool",
      description: "desc",
      short_description: "short",
      category: "test",
      download_url: "https://example.com",
      github_url: "https://github.com/test",
    });
    const res = await postTool(req);
    expect(res.status).toBe(401);
  });

  it("POST /api/tools rejects missing required fields when authenticated", async () => {
    mockCookieStore.set("be_admin_session", { value: "test-token" });
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "Incomplete Tool",
    });
    const res = await postTool(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/tools creates a tool when authenticated", async () => {
    mockCookieStore.set("be_admin_session", { value: "test-token" });
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "API Test Tool",
      slug: "api-test-tool",
      description: "Created via API test",
      short_description: "API test",
      category: "test",
      download_url: "https://example.com/dl",
      github_url: "https://github.com/test/api",
    });
    const res = await postTool(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("POST /api/tools returns 500 for duplicate slug", async () => {
    mockCookieStore.set("be_admin_session", { value: "test-token" });
    const req = jsonRequest("http://localhost/api/tools", "POST", {
      name: "Duplicate Slug Tool",
      slug: "pdf-forge",
      description: "Should fail on duplicate slug",
      short_description: "duplicate",
      category: "test",
      download_url: "https://example.com/dupe",
      github_url: "https://github.com/test/dupe",
    });

    const res = await postTool(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/unique|constraint/i);
  });

  it("GET /api/tools/[slug] returns the created tool", async () => {
    const req = jsonRequest("http://localhost/api/tools/api-test-tool", "GET");
    const params = Promise.resolve({ slug: "api-test-tool" });
    const res = await getToolBySlug(req, { params });
    const data = await res.json();
    expect(data.tool.name).toBe("API Test Tool");
  });

  it("GET /api/tools/[slug] returns 404 for unknown slug", async () => {
    const req = jsonRequest("http://localhost/api/tools/nope", "GET");
    const params = Promise.resolve({ slug: "nope" });
    const res = await getToolBySlug(req, { params });
    expect(res.status).toBe(404);
  });

  it("PUT /api/tools/[slug] updates a tool when authenticated", async () => {
    mockCookieStore.set("be_admin_session", { value: "test-token" });
    const req = jsonRequest("http://localhost/api/tools/api-test-tool", "PUT", {
      name: "API Test Tool Renamed",
      description: "Updated",
      short_description: "Updated short",
      category: "test",
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
    mockCookieStore.set("be_admin_session", { value: "test-token" });
    const req = jsonRequest("http://localhost/api/tools/nope", "PUT", {
      name: "Does not exist",
      description: "Still returns success",
      short_description: "noop",
      category: "test",
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
    mockCookieStore.set("be_admin_session", { value: "test-token" });
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
    mockCookieStore.set("be_admin_session", { value: "test-token" });
    const req = jsonRequest("http://localhost/api/tools/nope", "DELETE");
    const params = Promise.resolve({ slug: "nope" });
    const res = await deleteToolRoute(req, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// --- Requests API ---

describe("Requests API", () => {
  it("POST /api/requests creates a request (public)", async () => {
    const req = jsonRequest("http://localhost/api/requests", "POST", {
      tool_name: "VS Code Alternative",
      description: "A lightweight code editor",
    });
    const res = await postRequest(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("POST /api/requests rejects empty tool_name", async () => {
    const req = jsonRequest("http://localhost/api/requests", "POST", {
      tool_name: "",
      description: "desc",
    });
    const res = await postRequest(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/requests rejects oversized description", async () => {
    const req = jsonRequest("http://localhost/api/requests", "POST", {
      tool_name: "Tool",
      description: "x".repeat(1001),
    });
    const res = await postRequest(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/requests trims user input and persists normalized values", async () => {
    const req = jsonRequest("http://localhost/api/requests", "POST", {
      tool_name: "  Trimmed Tool  ",
      description: "  Needs cleanup  ",
      submitted_by: "  Evan  ",
      link: "  https://example.com/tool  ",
    });
    const res = await postRequest(req);
    expect(res.status).toBe(201);

    mockCookieStore.set("be_admin_session", { value: "test-token" });
    const listReq = jsonRequest("http://localhost/api/requests", "GET");
    const listRes = await getRequests(listReq);
    expect(listRes.status).toBe(200);
    const data = await listRes.json();
    const created = data.requests.find((r: { tool_name: string }) => r.tool_name === "Trimmed Tool");
    expect(created).toBeDefined();
    expect(created.description).toBe("Needs cleanup");
    expect(created.submitted_by).toBe("Evan");
    expect(created.link).toBe("https://example.com/tool");
  });

  it("GET /api/requests is admin-only", async () => {
    const req = jsonRequest("http://localhost/api/requests", "GET");
    const res = await getRequests(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/requests returns requests when authenticated", async () => {
    mockCookieStore.set("be_admin_session", { value: "test-token" });
    const req = jsonRequest("http://localhost/api/requests", "GET");
    const res = await getRequests(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.requests.length).toBeGreaterThanOrEqual(1);
    expect(data.requests[0].tool_name).toBe("VS Code Alternative");
  });
});
