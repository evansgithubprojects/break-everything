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
import type { AnalyticsSummary, RuntimeManifest, Tool } from "@/types";
import { coerceRuntimeEntryToRelative, toolSupportsInAppRuntime } from "@/lib/first-party-inapp";
import {
  defaultRuntimeManifestForName,
  inferRuntimeNameFromEntryPath,
  normalizeRuntimeName,
  runtimeIndexHtmlPath,
} from "@/lib/runtime-name";
import { getServerFirstPartyOrigin } from "@/server/first-party-origin";
import { isAllowedHttpUrl, parseRuntimeManifestInput } from "@/server/validation";

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

function normalizeCategories(categories: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const value of categories) {
    const category = value.trim();
    if (!category) continue;
    const key = category.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(category);
  }
  return normalized;
}

function parseCategoriesValue(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return normalizeCategories(parsed.filter((c): c is string => typeof c === "string"));
  } catch {
    return [];
  }
}

function primaryCategoryFrom(categories: string[]): string {
  return categories[0] ?? "";
}

function parseRuntimeManifestJson(value: unknown): RuntimeManifest | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    const validated = parseRuntimeManifestInput(parsed);
    return validated.ok ? validated.manifest : null;
  } catch {
    return null;
  }
}

function fallbackRuntimeManifestFromLegacy(row: Record<string, unknown>): RuntimeManifest | null {
  const runtimeSupported = Number(row.runtime_supported ?? 0) > 0;
  const runtimeEntrypoint =
    typeof row.runtime_entrypoint === "string" ? row.runtime_entrypoint.trim() : "";
  if (!runtimeSupported || !runtimeEntrypoint) return null;
  return {
    version: 1,
    entry: runtimeEntrypoint,
    executionMode: "iframe",
    permissions: {},
    allowedOrigins: [],
    storagePolicy: "session",
    capabilities: [],
  };
}

function normalizeToolRow<T extends Record<string, unknown>>(row: T): T {
  const categories = parseCategoriesValue(row.categories);
  const fallbackCategory = typeof row.category === "string" ? row.category.trim() : "";
  const resolved = categories.length > 0 ? categories : fallbackCategory ? [fallbackCategory] : [];
  const runtimeName = normalizeRuntimeName(row.runtime_name) ?? "";
  let runtime_manifest: RuntimeManifest | null = null;
  if (runtimeName) {
    runtime_manifest = defaultRuntimeManifestForName(runtimeName);
  } else {
    runtime_manifest =
      parseRuntimeManifestJson(row.runtime_manifest_json) ?? fallbackRuntimeManifestFromLegacy(row);
  }
  return {
    ...row,
    categories: resolved,
    category: primaryCategoryFrom(resolved),
    runtime_name: runtimeName,
    runtime_entrypoint: runtimeName ? runtimeIndexHtmlPath(runtimeName) : String(row.runtime_entrypoint ?? ""),
    runtime_manifest,
    delivery_mode: normalizeDeliveryMode(row),
    embed_allowed: 0,
    embed_url: "",
  };
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
  if (!colNames.has("app_store_url")) {
    await client.execute("ALTER TABLE tools ADD COLUMN app_store_url TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("play_store_url")) {
    await client.execute("ALTER TABLE tools ADD COLUMN play_store_url TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("categories")) {
    await client.execute("ALTER TABLE tools ADD COLUMN categories TEXT NOT NULL DEFAULT '[]'");
  }
  if (!colNames.has("runtime_manifest_json")) {
    await client.execute("ALTER TABLE tools ADD COLUMN runtime_manifest_json TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("runtime_name")) {
    await client.execute("ALTER TABLE tools ADD COLUMN runtime_name TEXT NOT NULL DEFAULT ''");
  }
}

/** Infer `runtime_name` from legacy `/runtime/<folder>/...` entry paths and normalize stored rows. */
async function migrateRuntimeNameBackfill(client: Client) {
  const info = await client.execute("PRAGMA table_info(tools)");
  const colNames = new Set(
    info.rows.map((row) => {
      const name = (row as { name?: string }).name;
      return name != null ? String(name) : "";
    })
  );
  if (!colNames.has("runtime_name")) return;

  const res = await client.execute(
    "SELECT id, runtime_entrypoint, runtime_manifest_json, runtime_name FROM tools"
  );
  for (const row of res.rows) {
    const r = row as Record<string, unknown>;
    if (normalizeRuntimeName(r.runtime_name)) continue;

    const ep = String(r.runtime_entrypoint ?? "").trim();
    let inferred = inferRuntimeNameFromEntryPath(ep);
    if (!inferred) {
      const m = parseRuntimeManifestJson(r.runtime_manifest_json);
      if (m?.entry) inferred = inferRuntimeNameFromEntryPath(m.entry);
    }
    if (!inferred) continue;

    const path = runtimeIndexHtmlPath(inferred);
    await client.execute({
      sql: `UPDATE tools SET runtime_name = ?, runtime_entrypoint = ?, runtime_manifest_json = '' WHERE id = ?`,
      args: [inferred, path, Number(r.id)],
    });
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

async function migrateToolCategoriesData(client: Client) {
  const rows = await client.execute(`
    SELECT id, category, categories
    FROM tools
    WHERE TRIM(COALESCE(categories, '')) = '' OR TRIM(COALESCE(categories, '')) = '[]'
  `);

  for (const row of rows.rows) {
    const id = Number((row as { id?: number | string }).id ?? 0);
    if (!id) continue;
    const legacyCategory = String((row as { category?: string }).category ?? "");
    const normalized = normalizeCategories([legacyCategory]);
    await client.execute({
      sql: "UPDATE tools SET categories = ?, category = ? WHERE id = ?",
      args: [JSON.stringify(normalized), primaryCategoryFrom(normalized), id],
    });
  }
}

async function migrateAnalyticsColumns(client: Client) {
  const info = await client.execute("PRAGMA table_info(analytics_events)");
  const colNames = new Set(
    info.rows.map((row) => {
      const name = (row as { name?: string }).name;
      return name != null ? String(name) : "";
    })
  );
  if (!colNames.has("utm_source")) {
    await client.execute("ALTER TABLE analytics_events ADD COLUMN utm_source TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("utm_medium")) {
    await client.execute("ALTER TABLE analytics_events ADD COLUMN utm_medium TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("utm_campaign")) {
    await client.execute("ALTER TABLE analytics_events ADD COLUMN utm_campaign TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("utm_term")) {
    await client.execute("ALTER TABLE analytics_events ADD COLUMN utm_term TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.has("utm_content")) {
    await client.execute("ALTER TABLE analytics_events ADD COLUMN utm_content TEXT NOT NULL DEFAULT ''");
  }
}

function pickFallbackDeliveryMode(
  tool: Pick<Tool, "web_url" | "download_url" | "app_store_url" | "play_store_url">
): "redirect" | "download" {
  const w = String(tool.web_url ?? "").trim();
  const d = String(tool.download_url ?? "").trim();
  const a = String(tool.app_store_url ?? "").trim();
  const p = String(tool.play_store_url ?? "").trim();
  if (
    isAllowedHttpUrl(w) ||
    isAllowedHttpUrl(d) ||
    isAllowedHttpUrl(a) ||
    isAllowedHttpUrl(p)
  ) {
    return "redirect";
  }
  return "download";
}

function normalizeDeliveryMode(row: Record<string, unknown>): Tool["delivery_mode"] {
  const dm = String(row.delivery_mode ?? "download");
  if (dm === "redirect" || dm === "browserRuntime" || dm === "download") {
    return dm;
  }
  if (dm === "embedded") {
    return pickFallbackDeliveryMode({
      web_url: String(row.web_url ?? ""),
      download_url: String(row.download_url ?? ""),
      app_store_url: String(row.app_store_url ?? ""),
      play_store_url: String(row.play_store_url ?? ""),
    });
  }
  return "download";
}

/** Strict migration: strip legacy embed surfacing + invalid `/runtime` flags (first-party + `/runtime` only). */
async function migrateFirstPartyInAppTools(client: Client) {
  const origin = getServerFirstPartyOrigin();
  const res = await client.execute("SELECT * FROM tools");
  for (const row of res.rows) {
    const r = row as Record<string, unknown>;
    const prevEmbedAllowed = Number(r.embed_allowed ?? 0);
    const prevEmbedUrl = String(r.embed_url ?? "").trim();
    const prevDeliveryMode = String(r.delivery_mode ?? "download");
    const tool = normalizeToolRow(r) as unknown as Tool;
    const embed_allowed = 0;
    const embed_url = "";

    let runtime_supported = Number(tool.runtime_supported) ? 1 : 0;
    let runtime_name = tool.runtime_name || "";
    let runtime_entrypoint = String(tool.runtime_entrypoint ?? "").trim();
    let runtime_manifest_json = runtime_name
      ? ""
      : String(r.runtime_manifest_json ?? "").trim();

    let manifestForTool = tool.runtime_manifest;
    if (!runtime_name && runtime_manifest_json) {
      const parsed = parseRuntimeManifestJson(runtime_manifest_json);
      if (parsed?.entry) {
        const ce = coerceRuntimeEntryToRelative(String(parsed.entry), origin);
        if (ce) {
          manifestForTool = { ...parsed, entry: ce };
          runtime_manifest_json = JSON.stringify(manifestForTool);
        }
      }
    }

    const partialTool: Tool = {
      ...tool,
      embed_allowed,
      embed_url,
      runtime_supported,
      runtime_name,
      runtime_entrypoint,
      runtime_manifest: runtime_name ? defaultRuntimeManifestForName(runtime_name) : manifestForTool,
    };

    if (runtime_supported && !toolSupportsInAppRuntime(partialTool)) {
      runtime_supported = 0;
      runtime_name = "";
      runtime_entrypoint = "";
      runtime_manifest_json = "";
      manifestForTool = null;
    }

    const finalTool: Tool = {
      ...partialTool,
      runtime_supported,
      runtime_name,
      runtime_entrypoint,
      runtime_manifest: runtime_name ? defaultRuntimeManifestForName(runtime_name) : manifestForTool,
    };

    let delivery_mode: Tool["delivery_mode"] = tool.delivery_mode;
    if (delivery_mode === "browserRuntime" && !toolSupportsInAppRuntime(finalTool)) {
      delivery_mode = pickFallbackDeliveryMode(finalTool);
    }

    const id = Number(tool.id);
    const jsonBefore = String(r.runtime_manifest_json ?? "").trim();
    const prevName = String(r.runtime_name ?? "").trim().toLowerCase();
    const changed =
      prevEmbedAllowed !== 0 ||
      prevEmbedUrl !== "" ||
      prevDeliveryMode !== delivery_mode ||
      runtime_supported !== Number(r.runtime_supported ?? 0) ||
      runtime_name !== prevName ||
      runtime_entrypoint !== String(r.runtime_entrypoint ?? "").trim() ||
      runtime_manifest_json !== jsonBefore;

    if (!changed) continue;

    await client.execute({
      sql: `UPDATE tools SET embed_allowed = ?, embed_url = ?, runtime_supported = ?, delivery_mode = ?, runtime_name = ?, runtime_entrypoint = ?, runtime_manifest_json = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [
        embed_allowed,
        embed_url,
        runtime_supported,
        delivery_mode,
        runtime_name,
        runtime_entrypoint,
        runtime_manifest_json,
        id,
      ],
    });
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
        categories TEXT NOT NULL DEFAULT '[]',
        icon TEXT DEFAULT '🔧',
        tool_kind TEXT NOT NULL DEFAULT 'download' CHECK (tool_kind IN ('download', 'web')),
        delivery_mode TEXT NOT NULL DEFAULT 'download' CHECK (delivery_mode IN ('redirect', 'embedded', 'browserRuntime', 'download')),
        download_url TEXT NOT NULL DEFAULT '',
        web_url TEXT NOT NULL DEFAULT '',
        app_store_url TEXT NOT NULL DEFAULT '',
        play_store_url TEXT NOT NULL DEFAULT '',
        embed_allowed INTEGER NOT NULL DEFAULT 0,
        embed_url TEXT NOT NULL DEFAULT '',
        runtime_supported INTEGER NOT NULL DEFAULT 0,
        runtime_entrypoint TEXT NOT NULL DEFAULT '',
        runtime_manifest_json TEXT NOT NULL DEFAULT '',
        sandbox_level TEXT NOT NULL DEFAULT 'strict' CHECK (sandbox_level IN ('strict', 'standard', 'trusted')),
        trusted_domains TEXT NOT NULL DEFAULT '',
        vendor TEXT NOT NULL DEFAULT '',
        privacy_summary TEXT NOT NULL DEFAULT '',
        data_handling TEXT NOT NULL DEFAULT 'medium' CHECK (data_handling IN ('low', 'medium', 'high')),
        review_notes TEXT NOT NULL DEFAULT '',
        last_reviewed_at TEXT,
        github_url TEXT NOT NULL DEFAULT '',
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
      sql: `CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        slug TEXT NOT NULL,
        action TEXT NOT NULL DEFAULT '',
        utm_source TEXT NOT NULL DEFAULT '',
        utm_medium TEXT NOT NULL DEFAULT '',
        utm_campaign TEXT NOT NULL DEFAULT '',
        utm_term TEXT NOT NULL DEFAULT '',
        utm_content TEXT NOT NULL DEFAULT '',
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
  await migrateRuntimeNameBackfill(client);
  await migrateToolCategoriesData(client);
  await migrateRemoveLegacyVerificationColumns(client);
  await migrateAnalyticsColumns(client);
  await migrateFirstPartyInAppTools(client);

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
        "A lightweight PDF editor that lets you merge, split, rotate, and annotate PDF files. No watermarks, no subscriptions, no nonsense. Built with students in mind who need to handle PDF assignments without paying for Adobe.",
      short_description: "Free PDF editor — merge, split, rotate & annotate with zero watermarks.",
      categories: ["pdf"],
      icon: "📄",
      delivery_mode: "download",
      download_url: "https://github.com/example/pdf-forge/releases/latest",
      web_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_name: "",
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "github.com",
      vendor: "Example team",
      privacy_summary: "Downloaded from the project’s release page; use a web version when the team offers one.",
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
      categories: ["converter"],
      icon: "🔄",
      delivery_mode: "download",
      download_url: "https://github.com/example/convertx/releases/latest",
      web_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_name: "",
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "github.com",
      vendor: "Example team",
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
        "A smart clipboard manager that remembers your copy history. Search through past clips, pin frequently used text, and sync snippets across sessions. Handy for research papers and long assignments when you juggle dozens of references.",
      short_description: "Smart clipboard manager — search history, pin clips & never lose a copy.",
      categories: ["utility"],
      icon: "📋",
      delivery_mode: "download",
      download_url: "https://github.com/example/clipvault/releases/latest",
      web_url: "",
      embed_allowed: 0,
      embed_url: "",
      runtime_supported: 0,
      runtime_name: "",
      runtime_entrypoint: "",
      sandbox_level: "strict",
      trusted_domains: "github.com",
      vendor: "Example team",
      privacy_summary: "Clipboard data stays on your machine when you run it locally; see the project page if they offer a web version.",
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
      name, slug, description, short_description, category, categories, icon, tool_kind, delivery_mode, download_url, web_url,
      app_store_url, play_store_url,
      embed_allowed, embed_url, runtime_supported, runtime_name, runtime_entrypoint, runtime_manifest_json, sandbox_level, trusted_domains, vendor,
      privacy_summary, data_handling, review_notes, last_reviewed_at, github_url, platform, downloads
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      tool.name,
      tool.slug,
      tool.description,
      tool.short_description,
      primaryCategoryFrom(tool.categories),
      JSON.stringify(tool.categories),
      tool.icon,
      "download",
      tool.delivery_mode,
      tool.download_url,
      tool.web_url,
      "",
      "",
      tool.embed_allowed,
      tool.embed_url,
      tool.runtime_supported,
      tool.runtime_name,
      tool.runtime_entrypoint,
      "",
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
  const rows = await queryAll<Record<string, unknown>>("SELECT * FROM tools ORDER BY downloads DESC");
  return rows.map(normalizeToolRow);
}

export async function getToolBySlug(slug: string) {
  const row = await queryOne<Record<string, unknown>>("SELECT * FROM tools WHERE slug = ?", [slug]);
  return row ? normalizeToolRow(row) : undefined;
}

export async function getToolsByCategory(category: string) {
  const rows = await queryAll<Record<string, unknown>>("SELECT * FROM tools ORDER BY downloads DESC");
  const target = category.trim().toLowerCase();
  return rows
    .map(normalizeToolRow)
    .filter(
      (row) =>
        Array.isArray(row.categories) &&
        row.categories.some((entry) => entry.trim().toLowerCase() === target)
    );
}

interface ToolWriteInput {
  name: string;
  slug?: string;
  description: string;
  short_description: string;
  categories: string[];
  icon: string;
  tool_kind: "download" | "web";
  delivery_mode: Tool["delivery_mode"];
  download_url: string;
  web_url: string;
  embed_allowed: number;
  embed_url: string;
  app_store_url: string;
  play_store_url: string;
  runtime_supported: number;
  runtime_name?: string;
  runtime_entrypoint: string;
  runtime_manifest?: RuntimeManifest | null;
  sandbox_level: "strict" | "standard" | "trusted";
  trusted_domains: string;
  vendor: string;
  privacy_summary: string;
  data_handling: "low" | "medium" | "high";
  review_notes: string;
  last_reviewed_at: string | null;
  github_url?: string;
  platform: string;
}

function withToolDefaults(tool: ToolWriteInput): ToolWriteInput {
  const normalizedCategories = normalizeCategories(tool.categories ?? []);
  const runtimeTool =
    (tool.runtime_supported ?? 0) > 0 || tool.delivery_mode === "browserRuntime";
  return {
    ...tool,
    categories: normalizedCategories,
    delivery_mode: tool.delivery_mode ?? "download",
    download_url: tool.download_url ?? "",
    web_url: tool.web_url ?? "",
    app_store_url: tool.app_store_url ?? "",
    play_store_url: tool.play_store_url ?? "",
    embed_allowed: 0,
    embed_url: "",
    runtime_supported: tool.runtime_supported ?? 0,
    runtime_name: tool.runtime_name ?? "",
    runtime_entrypoint: tool.runtime_entrypoint ?? "",
    sandbox_level: tool.sandbox_level ?? "strict",
    trusted_domains: tool.trusted_domains ?? "",
    vendor: tool.vendor ?? "",
    privacy_summary: tool.privacy_summary ?? "",
    data_handling: tool.data_handling ?? "medium",
    review_notes: runtimeTool ? "" : tool.review_notes ?? "",
    last_reviewed_at: runtimeTool ? null : tool.last_reviewed_at ?? null,
    github_url: tool.github_url ?? "",
  };
}

export async function createTool(tool: ToolWriteInput) {
  const t = withToolDefaults(tool);
  const runtimeManifestJson = t.runtime_manifest ? JSON.stringify(t.runtime_manifest) : "";
  return execute(
    `INSERT INTO tools (
      name, slug, description, short_description, category, categories, icon, tool_kind, delivery_mode, download_url, web_url,
      app_store_url, play_store_url,
      embed_allowed, embed_url, runtime_supported, runtime_name, runtime_entrypoint, runtime_manifest_json, sandbox_level, trusted_domains, vendor,
      privacy_summary, data_handling, review_notes, last_reviewed_at, github_url, platform
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.name,
      t.slug,
      t.description,
      t.short_description,
      primaryCategoryFrom(t.categories),
      JSON.stringify(t.categories),
      t.icon,
      t.tool_kind,
      t.delivery_mode,
      t.download_url,
      t.web_url,
      t.app_store_url,
      t.play_store_url,
      t.embed_allowed,
      t.embed_url,
      t.runtime_supported,
      t.runtime_name,
      t.runtime_entrypoint,
      runtimeManifestJson,
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
  const runtimeManifestJson = t.runtime_manifest ? JSON.stringify(t.runtime_manifest) : "";
  return execute(
    `UPDATE tools SET
      name = ?,
      description = ?,
      short_description = ?,
      category = ?,
      categories = ?,
      icon = ?,
      tool_kind = ?,
      delivery_mode = ?,
      download_url = ?,
      web_url = ?,
      app_store_url = ?,
      play_store_url = ?,
      embed_allowed = ?,
      embed_url = ?,
      runtime_supported = ?,
      runtime_name = ?,
      runtime_entrypoint = ?,
      runtime_manifest_json = ?,
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
      primaryCategoryFrom(t.categories),
      JSON.stringify(t.categories),
      t.icon,
      t.tool_kind,
      t.delivery_mode,
      t.download_url,
      t.web_url,
      t.app_store_url,
      t.play_store_url,
      t.embed_allowed,
      t.embed_url,
      t.runtime_supported,
      t.runtime_name,
      t.runtime_entrypoint,
      runtimeManifestJson,
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
  const tools = await getAllTools();
  const categories = tools.flatMap((tool) =>
    Array.isArray((tool as { categories?: unknown }).categories)
      ? ((tool as { categories: string[] }).categories ?? [])
      : []
  );
  return [...new Set(categories)].sort();
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
    `SELECT COUNT(*) as count
     FROM tools
     WHERE last_reviewed_at IS NOT NULL
       AND TRIM(last_reviewed_at) != ''
       AND COALESCE(runtime_supported, 0) = 0
       AND delivery_mode != 'browserRuntime'`
  );
  return Number(row?.count ?? 0);
}

export async function getBuiltByUsToolCount(): Promise<number> {
  const row = await queryOne<{ count: number | string }>(
    `SELECT COUNT(*) as count
     FROM tools
     WHERE COALESCE(runtime_supported, 0) > 0
        OR delivery_mode = 'browserRuntime'`
  );
  return Number(row?.count ?? 0);
}

/** Tools with a public project URL or first-party runtime backing. */
export async function getSourceLinkedToolStats(): Promise<{
  linked: number;
  total: number;
}> {
  const row = await queryOne<{ total: number | string; linked: number | string }>(`
    SELECT
      (SELECT COUNT(*) FROM tools) AS total,
      (SELECT COUNT(*) FROM tools
       WHERE TRIM(COALESCE(github_url, '')) != ''
          OR COALESCE(runtime_supported, 0) > 0
          OR delivery_mode = 'browserRuntime') AS linked
  `);
  return {
    total: Number(row?.total ?? 0),
    linked: Number(row?.linked ?? 0),
  };
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
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}): Promise<void> {
  await execute(
    `INSERT INTO analytics_events (
      event, slug, action, utm_source, utm_medium, utm_campaign, utm_term, utm_content
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.event,
      input.slug,
      input.action,
      input.utm_source ?? "",
      input.utm_medium ?? "",
      input.utm_campaign ?? "",
      input.utm_term ?? "",
      input.utm_content ?? "",
    ]
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

  const runtimeLifecycleEvents = byEvent
    .filter((row) => row.event.startsWith("runtime_"))
    .map((row) => ({
      event: row.event,
      count: row.count,
    }));
  const runtimeErrorCount = runtimeLifecycleEvents
    .filter((row) => row.event === "runtime_error")
    .reduce((total, row) => total + row.count, 0);
  const runtimeStartCount = runtimeLifecycleEvents
    .filter((row) => row.event === "runtime_start")
    .reduce((total, row) => total + row.count, 0);
  const runtimeFailureRate = runtimeStartCount > 0 ? runtimeErrorCount / runtimeStartCount : 0;

  const byUtmCampaignRows = await queryAll<{ utm_campaign: string; count: number | string }>(
    `SELECT utm_campaign, COUNT(*) as count
     FROM analytics_events
     WHERE ${baseWhere} AND TRIM(COALESCE(utm_campaign, '')) != ''
     GROUP BY utm_campaign
     ORDER BY count DESC`,
    baseArgs
  );
  const byUtmCampaign = byUtmCampaignRows.map((r) => ({
    campaign: r.utm_campaign,
    count: Number(r.count),
  }));

  return {
    range: { since: since.toISOString(), until: untilIso },
    totals: { all, byEvent },
    uniqueSlugs,
    toolActionClicks,
    runtimeLifecycleEvents,
    runtimeFailureRate,
    byUtmCampaign,
    byDay,
    topTools,
    byAction,
  };
}
