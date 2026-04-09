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

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let db: Client | null = null;
let initPromise: Promise<void> | null = null;

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
  await ensureInitialized();
}

async function execute(sql: string, args: InArgs = []): Promise<ResultSet> {
  await ensureInitialized();
  return getDb().execute({ sql, args });
}

async function queryOne<T>(sql: string, args: InArgs = []): Promise<T | undefined> {
  const result = await execute(sql, args);
  return result.rows[0] as T | undefined;
}

async function queryAll<T>(sql: string, args: InArgs = []): Promise<T[]> {
  const result = await execute(sql, args);
  return result.rows as T[];
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
        download_url TEXT NOT NULL,
        github_url TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'windows',
        sha256_hash TEXT,
        safety_score INTEGER DEFAULT 100,
        last_scan_date TEXT,
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
  ];

  await client.batch(schemaStatements, "write");

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

  await seedTools(client);
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
      download_url: "https://github.com/example/pdf-forge/releases/latest",
      github_url: "https://github.com/example/pdf-forge",
      platform: "windows,mac",
      sha256_hash: "a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01",
      safety_score: 98,
      last_scan_date: "2026-03-28",
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
      download_url: "https://github.com/example/convertx/releases/latest",
      github_url: "https://github.com/example/convertx",
      platform: "windows",
      sha256_hash: "b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef0123",
      safety_score: 95,
      last_scan_date: "2026-04-01",
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
      download_url: "https://github.com/example/clipvault/releases/latest",
      github_url: "https://github.com/example/clipvault",
      platform: "windows,mac",
      sha256_hash: "c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef012345",
      safety_score: 100,
      last_scan_date: "2026-04-03",
      downloads: 5640,
    },
  ];

  const statements: InStatement[] = seeds.map((tool) => ({
    sql: `INSERT OR IGNORE INTO tools (
      name, slug, description, short_description, category, icon, download_url, github_url,
      platform, sha256_hash, safety_score, last_scan_date, downloads
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      tool.name,
      tool.slug,
      tool.description,
      tool.short_description,
      tool.category,
      tool.icon,
      tool.download_url,
      tool.github_url,
      tool.platform,
      tool.sha256_hash,
      tool.safety_score,
      tool.last_scan_date,
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
  download_url: string;
  github_url: string;
  platform: string;
  sha256_hash: string | null;
  safety_score: number;
  last_scan_date: string | null;
}

export async function createTool(tool: ToolWriteInput) {
  return execute(
    `INSERT INTO tools (
      name, slug, description, short_description, category, icon, download_url, github_url,
      platform, sha256_hash, safety_score, last_scan_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tool.name,
      tool.slug,
      tool.description,
      tool.short_description,
      tool.category,
      tool.icon,
      tool.download_url,
      tool.github_url,
      tool.platform,
      tool.sha256_hash,
      tool.safety_score,
      tool.last_scan_date,
    ] as InValue[]
  );
}

export async function updateTool(slug: string, tool: ToolWriteInput) {
  return execute(
    `UPDATE tools SET
      name = ?,
      description = ?,
      short_description = ?,
      category = ?,
      icon = ?,
      download_url = ?,
      github_url = ?,
      platform = ?,
      sha256_hash = ?,
      safety_score = ?,
      last_scan_date = ?,
      updated_at = datetime('now')
    WHERE slug = ?`,
    [
      tool.name,
      tool.description,
      tool.short_description,
      tool.category,
      tool.icon,
      tool.download_url,
      tool.github_url,
      tool.platform,
      tool.sha256_hash,
      tool.safety_score,
      tool.last_scan_date,
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

// --- Tool Requests ---

export interface ToolRequest {
  id: number;
  tool_name: string;
  description: string;
  submitted_by: string | null;
  link: string | null;
  status: string;
  created_at: string;
}

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
