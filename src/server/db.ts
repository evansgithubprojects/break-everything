import {
  createClient,
  type Client,
  type InArgs,
  type InStatement,
  type InValue,
  type ResultSet,
} from "@libsql/client";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import type { AnalyticsSummary, ToolRequest } from "@/types";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let db: Client | null = null;
let initPromise: Promise<void> | null = null;

/** Next.js sets this during `next build` — avoid touching Turso/SQLite during compile. */
function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/** Sample tools are never inserted in production; tests keep seeds via NODE_ENV=test; local dev opt-in. */
function shouldSeedToolLibrary(): boolean {
  if (process.env.PLAYWRIGHT_E2E === "1") {
    return true;
  }
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  if (process.env.NODE_ENV === "test") {
    return true;
  }
  return process.env.SEED_TOOL_LIBRARY === "1";
}

function resolveDatabaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }

  const dbPath =
    process.env.TEST_DB_PATH || path.join(process.cwd(), "data", "break-everything.db");
  return `file:${dbPath}`;
}

function maybeGetAuthToken(url: string): string | undefined {
  if (!url.startsWith("file:")) {
    if (!process.env.TURSO_AUTH_TOKEN) {
      throw new Error("Missing TURSO_AUTH_TOKEN environment variable.");
    }
    return process.env.TURSO_AUTH_TOKEN;
  }
  return undefined;
}

function ensureLocalDbDirectory(url: string) {
  if (!url.startsWith("file:")) return;
  const filePath = url.slice("file:".length);
  if (!filePath || filePath === ":memory:") return;

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDb(): Client {
  if (!db) {
    const url = resolveDatabaseUrl();
    ensureLocalDbDirectory(url);
    db = createClient({
      url,
      authToken: maybeGetAuthToken(url),
    });
  }
  return db;
}

async function ensureInitialized(): Promise<void> {
  if (isNextProductionBuild()) {
    return;
  }
  if (!initPromise) {
    initPromise = initSchema(getDb());
  }
  await initPromise;
}

/** Close DB connection — used by tests for cleanup */
export async function _closeDb() {
  if (db) {
    db.close();
    db = null;
    initPromise = null;
  }
}

export async function initDb(): Promise<void> {
  if (isNextProductionBuild()) {
    throw new Error("initDb() must not run during `next build`.");
  }
  await ensureInitialized();
}

async function execute(sql: string, args: InArgs = []): Promise<ResultSet> {
  if (isNextProductionBuild()) {
    throw new Error(
      "Database access during `next build` is disabled. Pages that use the DB should stay dynamic/runtime-only."
    );
  }
  await ensureInitialized();
  return getDb().execute({ sql, args });
}

function toPlainObject<T>(row: unknown): T {
  if (!row || typeof row !== "object") {
    return row as T;
  }
  return Object.fromEntries(Object.entries(row as Record<string, unknown>)) as T;
}

async function queryOne<T>(sql: string, args: InArgs = []): Promise<T | undefined> {
  const result = await execute(sql, args);
  const row = result.rows[0];
  if (!row) return undefined;
  return toPlainObject<T>(row);
}

async function queryAll<T>(sql: string, args: InArgs = []): Promise<T[]> {
  const result = await execute(sql, args);
  return result.rows.map((row) => toPlainObject<T>(row));
}

async function migrateToolsColumns(client: Client) {
  const info = await client.execute("PRAGMA table_info(tools)");
  const colNames = new Set(
    info.rows.map((row) => {
      const name = (row as { name?: string }).name;
      return name != null ? String(name) : "";
    })
  );

  if (!colNames.has("tool_kind")) {
    await client.execute(
      "ALTER TABLE tools ADD COLUMN tool_kind TEXT NOT NULL DEFAULT 'download'"
    );
  }
  if (!colNames.has("web_url")) {
    await client.execute("ALTER TABLE tools ADD COLUMN web_url TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("delivery_mode")) {
    await client.execute(
      "ALTER TABLE tools ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'download'"
    );
  }
  if (!colNames.has("embed_allowed")) {
    await client.execute("ALTER TABLE tools ADD COLUMN embed_allowed INTEGER NOT NULL DEFAULT 0");
  }
  if (!colNames.has("embed_url")) {
    await client.execute("ALTER TABLE tools ADD COLUMN embed_url TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("runtime_supported")) {
    await client.execute(
      "ALTER TABLE tools ADD COLUMN runtime_supported INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!colNames.has("runtime_entrypoint")) {
    await client.execute("ALTER TABLE tools ADD COLUMN runtime_entrypoint TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("sandbox_level")) {
    await client.execute("ALTER TABLE tools ADD COLUMN sandbox_level TEXT NOT NULL DEFAULT 'strict'");
  }
  if (!colNames.has("trusted_domains")) {
    await client.execute("ALTER TABLE tools ADD COLUMN trusted_domains TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("vendor")) {
    await client.execute("ALTER TABLE tools ADD COLUMN vendor TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("privacy_summary")) {
    await client.execute("ALTER TABLE tools ADD COLUMN privacy_summary TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("data_handling")) {
    await client.execute("ALTER TABLE tools ADD COLUMN data_handling TEXT NOT NULL DEFAULT 'medium'");
  }
  if (!colNames.has("review_notes")) {
    await client.execute("ALTER TABLE tools ADD COLUMN review_notes TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("last_reviewed_at")) {
    await client.execute("ALTER TABLE tools ADD COLUMN last_reviewed_at TEXT");
  }
}

/** Legacy columns removed from the product; drop on existing databases (SQLite 3.35+). */
async function migrateRemoveLegacyVerificationColumns(client: Client) {
  let info = await client.execute("PRAGMA table_info(tools)");
  let colNames = new Set(
    info.rows.map((row) => {
      const name = (row as { name?: string }).name;
      return name != null ? String(name) : "";
    })
  );
  if (colNames.has("sha256_hash")) {
    await client.execute("ALTER TABLE tools DROP COLUMN sha256_hash");
  }
  info = await client.execute("PRAGMA table_info(tools)");
  colNames = new Set(
    info.rows.map((row) => {
      const name = (row as { name?: string }).name;
      return name != null ? String(name) : "";
    })
  );
  if (colNames.has("last_scan_date")) {
    await client.execute("ALTER TABLE tools DROP COLUMN last_scan_date");
  }
}

async function initSchema(client: Client) {
  const schemaStatements: InStatement[] = [
    {
      sql: `CREATE TABLE IF NOT EXISTS tools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        short_description TEXT NOT NULL,
        category TEXT NOT NULL,
        icon TEXT DEFAULT '🔧',
        tool_kind TEXT NOT NULL DEFAULT 'download' CHECK (tool_kind IN ('download', 'web')),
        delivery_mode TEXT NOT NULL DEFAULT 'download' CHECK (delivery_mode IN ('redirect', 'embedded', 'browserRuntime', 'download')),
        download_url TEXT NOT NULL DEFAULT '',
        web_url TEXT NOT NULL DEFAULT '',
        embed_allowed INTEGER NOT NULL DEFAULT 0,
        embed_url TEXT NOT NULL DEFAULT '',
        runtime_supported INTEGER NOT NULL DEFAULT 0,
        runtime_entrypoint TEXT NOT NULL DEFAULT '',
        sandbox_level TEXT NOT NULL DEFAULT 'strict' CHECK (sandbox_level IN ('strict', 'standard', 'trusted')),
        trusted_domains TEXT NOT NULL DEFAULT '',
        vendor TEXT NOT NULL DEFAULT '',
        privacy_summary TEXT NOT NULL DEFAULT '',
        data_handling TEXT NOT NULL DEFAULT 'medium' CHECK (data_handling IN ('low', 'medium', 'high')),
        review_notes TEXT NOT NULL DEFAULT '',
        last_reviewed_at TEXT,
        github_url TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'windows',
        downloads INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        password_hash TEXT NOT NULL
      );`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS tool_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_name TEXT NOT NULL,
        description TEXT NOT NULL,
        submitted_by TEXT,
        link TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
      );`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        slug TEXT NOT NULL,
        action TEXT NOT NULL DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_analytics_events_event_slug ON analytics_events(event, slug);`,
    },
  ];

  await client.batch(schemaStatements, "write");
  await migrateToolsColumns(client);
  await migrateRemoveLegacyVerificationColumns(client);

  if (!ADMIN_PASSWORD) {
    throw new Error("Missing ADMIN_PASSWORD environment variable.");
  }

  // Idempotent bootstrap for concurrent initializers (multiple prod instances/cold starts).
  const bootstrapHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  await client.execute({
    sql: "INSERT OR IGNORE INTO admin (id, password_hash) VALUES (1, ?)",
    args: [bootstrapHash],
  });

  const adminRow = await client.execute("SELECT password_hash FROM admin WHERE id = 1");
  const existingHash = adminRow.rows[0]?.password_hash as string | undefined;

  if (existingHash && !bcrypt.compareSync(ADMIN_PASSWORD, existingHash)) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    await client.execute({
      sql: "UPDATE admin SET password_hash = ? WHERE id = 1",
      args: [hash],
    });
  }

  if (!shouldSeedToolLibrary()) {
    return;
  }

  const toolCountResult = await client.execute("SELECT COUNT(*) as count FROM tools");
  const count = Number(toolCountResult.rows[0]?.count ?? 0);
  if (count === 0) {
    await seedTools(client);
  }
}

async function seedTools(client: Client) {
  const seeds = [
    {
      name: "PDF Forge",
      slug: "pdf-forge",
      description:
        "A lightweight, open-source PDF editor that lets you merge, split, rotate, and annotate PDF files. No watermarks, no subscriptions, no nonsense. Built with students in mind who need to handle PDF assignments without paying for Adobe.",
      short_description: "Free PDF editor — merge, split, rotate & annotate with zero watermarks.",
      category: "pdf",
      icon: "📄",
      delivery_mode: "download",
      download_url: "https://github.com/example/pdf-forge/releases/latest",
      web_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "github.com",
      vendor: "Example OSS",
      privacy_summary: "Shipped via GitHub releases; prefer web or in-app flows when the project offers them.",
      data_handling: "medium",
      review_notes: "Seed data. Replace with real moderation notes before publishing.",
      last_reviewed_at: "2026-03-28",
      github_url: "https://github.com/example/pdf-forge",
      platform: "windows,mac",
      downloads: 12450,
    },
    {
      name: "ConvertX",
      slug: "convertx",
      description:
        "Universal file converter supporting 50+ formats. Convert images, documents, audio, and video files locally on your machine — no uploads, no privacy concerns. Supports batch conversion for handling entire folders at once.",
      short_description: "Convert 50+ file formats locally. Images, docs, audio & video — all offline.",
      category: "converter",
      icon: "🔄",
      delivery_mode: "download",
      download_url: "https://github.com/example/convertx/releases/latest",
      web_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "github.com",
      vendor: "Example OSS",
      privacy_summary: "Local conversion workflow. Files are not uploaded by default.",
      data_handling: "medium",
      review_notes: "Seed data. Verify publisher identity before production.",
      last_reviewed_at: "2026-04-01",
      github_url: "https://github.com/example/convertx",
      platform: "windows",
      downloads: 8320,
    },
    {
      name: "ClipVault",
      slug: "clipvault",
      description:
        "A smart clipboard manager that remembers your copy history. Search through past clips, pin frequently used text, and sync snippets across sessions. Perfect for research papers and coding projects where you juggle dozens of references.",
      short_description: "Smart clipboard manager — search history, pin clips & never lose a copy.",
      category: "utility",
      icon: "📋",
      delivery_mode: "download",
      download_url: "https://github.com/example/clipvault/releases/latest",
      web_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "github.com",
      vendor: "Example OSS",
      privacy_summary: "Clipboard data stays on your machine when you run it locally; check the repo for web options.",
      data_handling: "medium",
      review_notes: "Seed data. Update before production listing.",
      last_reviewed_at: "2026-04-03",
      github_url: "https://github.com/example/clipvault",
      platform: "windows,mac",
      downloads: 5640,
    },
  ];

  const statements: InStatement[] = seeds.map((tool) => ({
    sql: `INSERT OR IGNORE INTO tools (
      name, slug, description, short_description, category, icon, tool_kind, delivery_mode, download_url, web_url,
      embed_allowed, embed_url, runtime_supported, runtime_entrypoint, sandbox_level, trusted_domains, vendor,
      privacy_summary, data_handling, review_notes, last_reviewed_at, github_url, platform, downloads
    ) VALUES (?, ?, ?, ?, ?, ?, 'download', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      tool.name,
      tool.slug,
      tool.description,
      tool.short_description,
      tool.category,
      tool.icon,
      tool.delivery_mode,
      tool.download_url,
      tool.web_url,
      tool.embed_allowed,
      tool.embed_url,
      tool.runtime_supported,
      tool.runtime_entrypoint,
      tool.sandbox_level,
      tool.trusted_domains,
      tool.vendor,
      tool.privacy_summary,
      tool.data_handling,
      tool.review_notes,
      tool.last_reviewed_at,
      tool.github_url,
      tool.platform,
      tool.downloads,
    ],
  }));

  await client.batch(statements, "write");
}

export async function getAllTools() {
  return queryAll("SELECT * FROM tools ORDER BY downloads DESC");
}

export async function getToolBySlug(slug: string) {
  return queryOne("SELECT * FROM tools WHERE slug = ?", [slug]);
}

export async function getToolsByCategory(category: string) {
  return queryAll("SELECT * FROM tools WHERE category = ? ORDER BY downloads DESC", [category]);
}

interface ToolWriteInput {
  name: string;
  slug?: string;
  description: string;
  short_description: string;
  category: string;
  icon: string;
  tool_kind: "download" | "web";
  delivery_mode: "redirect" | "embedded" | "browserRuntime" | "download";
  download_url: string;
  web_url: string;
  embed_allowed: number;
  embed_url: string;
  runtime_supported: number;
  runtime_entrypoint: string;
  sandbox_level: "strict" | "standard" | "trusted";
  trusted_domains: string;
  vendor: string;
  privacy_summary: string;
  data_handling: "low" | "medium" | "high";
  review_notes: string;
  last_reviewed_at: string | null;
  github_url: string;
  platform: string;
}

function withToolDefaults(tool: ToolWriteInput): ToolWriteInput {
  return {
    ...tool,
    delivery_mode: tool.delivery_mode ?? "download",
    download_url: tool.download_url ?? "",
    web_url: tool.web_url ?? "",
    embed_allowed: tool.embed_allowed ?? 0,
    embed_url: tool.embed_url ?? "",
    runtime_supported: tool.runtime_supported ?? 0,
    runtime_entrypoint: tool.runtime_entrypoint ?? "",
    sandbox_level: tool.sandbox_level ?? "strict",
    trusted_domains: tool.trusted_domains ?? "",
    vendor: tool.vendor ?? "",
    privacy_summary: tool.privacy_summary ?? "",
    data_handling: tool.data_handling ?? "medium",
    review_notes: tool.review_notes ?? "",
    last_reviewed_at: tool.last_reviewed_at ?? null,
  };
}

export async function createTool(tool: ToolWriteInput) {
  const t = withToolDefaults(tool);
  return execute(
    `INSERT INTO tools (
      name, slug, description, short_description, category, icon, tool_kind, delivery_mode, download_url, web_url,
      embed_allowed, embed_url, runtime_supported, runtime_entrypoint, sandbox_level, trusted_domains, vendor,
      privacy_summary, data_handling, review_notes, last_reviewed_at, github_url, platform
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.name,
      t.slug,
      t.description,
      t.short_description,
      t.category,
      t.icon,
      t.tool_kind,
      t.delivery_mode,
      t.download_url,
      t.web_url,
      t.embed_allowed,
      t.embed_url,
      t.runtime_supported,
      t.runtime_entrypoint,
      t.sandbox_level,
      t.trusted_domains,
      t.vendor,
      t.privacy_summary,
      t.data_handling,
      t.review_notes,
      t.last_reviewed_at,
      t.github_url,
      t.platform,
    ] as InValue[]
  );
}

export async function updateTool(slug: string, tool: ToolWriteInput) {
  const t = withToolDefaults(tool);
  return execute(
    `UPDATE tools SET
      name = ?,
      description = ?,
      short_description = ?,
      category = ?,
      icon = ?,
      tool_kind = ?,
      delivery_mode = ?,
      download_url = ?,
      web_url = ?,
      embed_allowed = ?,
      embed_url = ?,
      runtime_supported = ?,
      runtime_entrypoint = ?,
      sandbox_level = ?,
      trusted_domains = ?,
      vendor = ?,
      privacy_summary = ?,
      data_handling = ?,
      review_notes = ?,
      last_reviewed_at = ?,
      github_url = ?,
      platform = ?,
      updated_at = datetime('now')
    WHERE slug = ?`,
    [
      t.name,
      t.description,
      t.short_description,
      t.category,
      t.icon,
      t.tool_kind,
      t.delivery_mode,
      t.download_url,
      t.web_url,
      t.embed_allowed,
      t.embed_url,
      t.runtime_supported,
      t.runtime_entrypoint,
      t.sandbox_level,
      t.trusted_domains,
      t.vendor,
      t.privacy_summary,
      t.data_handling,
      t.review_notes,
      t.last_reviewed_at,
      t.github_url,
      t.platform,
      slug,
    ] as InValue[]
  );
}

export async function deleteTool(slug: string) {
  return execute("DELETE FROM tools WHERE slug = ?", [slug]);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM admin WHERE id = 1");
  if (!row) return false;
  return bcrypt.compareSync(password, row.password_hash);
}

export async function getCategories(): Promise<string[]> {
  const rows = await queryAll<{ category: string }>("SELECT DISTINCT category FROM tools ORDER BY category");
  return rows.map((r) => r.category);
}

export async function getToolCount(): Promise<number> {
  const row = await queryOne<{ count: number | string }>("SELECT COUNT(*) as count FROM tools");
  return Number(row?.count ?? 0);
}

export async function getTotalDownloads(): Promise<number> {
  const row = await queryOne<{ total: number | string }>(
    "SELECT COALESCE(SUM(downloads), 0) as total FROM tools"
  );
  return Number(row?.total ?? 0);
}

export async function getReviewedToolCount(): Promise<number> {
  const row = await queryOne<{ count: number | string }>(
    "SELECT COUNT(*) as count FROM tools WHERE last_reviewed_at IS NOT NULL AND TRIM(last_reviewed_at) != ''"
  );
  return Number(row?.count ?? 0);
}

/** Tools with a non-empty public repo URL (trust signal for “every listing links to source”). */
export async function getSourceLinkedToolStats(): Promise<{
  linked: number;
  total: number;
}> {
  const row = await queryOne<{ total: number | string; linked: number | string }>(`
    SELECT
      (SELECT COUNT(*) FROM tools) AS total,
      (SELECT COUNT(*) FROM tools WHERE TRIM(COALESCE(github_url, '')) != '') AS linked
  `);
  return {
    total: Number(row?.total ?? 0),
    linked: Number(row?.linked ?? 0),
  };
}

// --- Tool Requests ---

export type { ToolRequest };

export async function createToolRequest(req: {
  tool_name: string;
  description: string;
  submitted_by?: string;
  link?: string;
}) {
  return execute(
    `INSERT INTO tool_requests (tool_name, description, submitted_by, link)
     VALUES (?, ?, ?, ?)`,
    [req.tool_name, req.description, req.submitted_by || null, req.link || null]
  );
}

export async function getAllToolRequests(): Promise<ToolRequest[]> {
  return queryAll("SELECT * FROM tool_requests ORDER BY created_at DESC");
}

export async function getPendingToolRequests(): Promise<ToolRequest[]> {
  return queryAll("SELECT * FROM tool_requests WHERE status = 'pending' ORDER BY created_at DESC");
}

export async function updateToolRequestStatus(id: number, status: string) {
  return execute("UPDATE tool_requests SET status = ? WHERE id = ?", [status, id]);
}

export async function deleteToolRequest(id: number) {
  return execute("DELETE FROM tool_requests WHERE id = ?", [id]);
}

// --- Analytics (UTC day boundaries for rollups; created_at matches SQLite datetime('now')) ---

const ANALYTICS_TOP_TOOLS_LIMIT = 20;

/** Format bound for SQLite `created_at` comparisons (UTC, `YYYY-MM-DD HH:MM:SS`). */
function toSqliteUtcBound(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export type { AnalyticsSummary };

export async function recordAnalyticsEvent(input: {
  event: string;
  slug: string;
  action: string;
}): Promise<void> {
  await execute(
    "INSERT INTO analytics_events (event, slug, action) VALUES (?, ?, ?)",
    [input.event, input.slug, input.action]
  );
}

export async function getAnalyticsSummary(
  since: Date,
  options?: { slug?: string }
): Promise<AnalyticsSummary> {
  const sinceBound = toSqliteUtcBound(since);
  const until = new Date();
  const untilIso = until.toISOString();
  const slug = options?.slug?.trim();
  const baseWhere = slug ? "created_at >= ? AND slug = ?" : "created_at >= ?";
  const baseArgs: InValue[] = slug ? [sinceBound, slug] : [sinceBound];

  const allRow = await queryOne<{ count: number | string }>(
    `SELECT COUNT(*) as count FROM analytics_events WHERE ${baseWhere}`,
    baseArgs
  );
  const all = Number(allRow?.count ?? 0);

  const byEventRows = await queryAll<{ event: string; count: number | string }>(
    `SELECT event, COUNT(*) as count FROM analytics_events
     WHERE ${baseWhere} GROUP BY event ORDER BY count DESC`,
    baseArgs
  );
  const byEvent = byEventRows.map((r) => ({
    event: r.event,
    count: Number(r.count),
  }));

  const uniqueRow = await queryOne<{ n: number | string }>(
    `SELECT COUNT(DISTINCT slug) as n FROM analytics_events WHERE ${baseWhere}`,
    baseArgs
  );
  const uniqueSlugs = Number(uniqueRow?.n ?? 0);

  const tacWhere = slug
    ? "created_at >= ? AND slug = ? AND event = 'tool_action_click'"
    : "created_at >= ? AND event = 'tool_action_click'";
  const tacArgs: InValue[] = slug ? [sinceBound, slug] : [sinceBound];

  const tacRow = await queryOne<{ count: number | string }>(
    `SELECT COUNT(*) as count FROM analytics_events WHERE ${tacWhere}`,
    tacArgs
  );
  const toolActionClicks = Number(tacRow?.count ?? 0);

  const byDayRows = await queryAll<{ day: string; count: number | string }>(
    `SELECT strftime('%Y-%m-%d', created_at) as day, COUNT(*) as count
     FROM analytics_events WHERE ${baseWhere}
     GROUP BY day ORDER BY day`,
    baseArgs
  );
  const byDay = byDayRows.map((r) => ({
    date: r.day,
    count: Number(r.count),
  }));

  const topArgs: InValue[] = slug
    ? [sinceBound, slug, ANALYTICS_TOP_TOOLS_LIMIT]
    : [sinceBound, ANALYTICS_TOP_TOOLS_LIMIT];
  const topWhere = slug
    ? "created_at >= ? AND slug = ? AND event = 'tool_action_click'"
    : "created_at >= ? AND event = 'tool_action_click'";
  const topRows = await queryAll<{ slug: string; count: number | string }>(
    `SELECT slug, COUNT(*) as count FROM analytics_events
     WHERE ${topWhere}
     GROUP BY slug ORDER BY count DESC LIMIT ?`,
    topArgs
  );
  const topTools = topRows.map((r) => ({
    slug: r.slug,
    count: Number(r.count),
  }));

  const byActionRows = await queryAll<{ action: string; count: number | string }>(
    `SELECT action, COUNT(*) as count FROM analytics_events
     WHERE ${tacWhere}
     GROUP BY action ORDER BY count DESC`,
    tacArgs
  );
  const byAction = byActionRows.map((r) => ({
    action: r.action || "(empty)",
    count: Number(r.count),
  }));

  return {
    range: { since: since.toISOString(), until: untilIso },
    totals: { all, byEvent },
    uniqueSlugs,
    toolActionClicks,
    byDay,
    topTools,
    byAction,
  };
}
