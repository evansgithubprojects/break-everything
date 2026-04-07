import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const DB_PATH =
  process.env.TEST_DB_PATH ||
  path.join(process.cwd(), "data", "break-everything.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

/** Close DB connection — used by tests for cleanup */
export function _closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tools (
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
    );

    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tool_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name TEXT NOT NULL,
      description TEXT NOT NULL,
      submitted_by TEXT,
      link TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const ADMIN_PASSWORD = "Wandmoon1!";
  const adminRow = db.prepare("SELECT password_hash FROM admin WHERE id = 1").get() as
    | { password_hash: string }
    | undefined;

  if (!adminRow) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare("INSERT INTO admin (id, password_hash) VALUES (1, ?)").run(hash);
  } else if (!bcrypt.compareSync(ADMIN_PASSWORD, adminRow.password_hash)) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare("UPDATE admin SET password_hash = ? WHERE id = 1").run(hash);
  }

  const toolCount = db.prepare("SELECT COUNT(*) as count FROM tools").get() as { count: number };
  if (toolCount.count === 0) {
    seedTools(db);
  }
}

function seedTools(db: Database.Database) {
  const insert = db.prepare(`
    INSERT INTO tools (name, slug, description, short_description, category, icon, download_url, github_url, platform, sha256_hash, safety_score, last_scan_date, downloads)
    VALUES (@name, @slug, @description, @short_description, @category, @icon, @download_url, @github_url, @platform, @sha256_hash, @safety_score, @last_scan_date, @downloads)
  `);

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

  const insertMany = db.transaction((tools: typeof seeds) => {
    for (const tool of tools) {
      insert.run(tool);
    }
  });

  insertMany(seeds);
}

export function getAllTools() {
  return getDb().prepare("SELECT * FROM tools ORDER BY downloads DESC").all();
}

export function getToolBySlug(slug: string) {
  return getDb().prepare("SELECT * FROM tools WHERE slug = ?").get(slug);
}

export function getToolsByCategory(category: string) {
  return getDb().prepare("SELECT * FROM tools WHERE category = ? ORDER BY downloads DESC").all(category);
}

export function createTool(tool: Record<string, unknown>) {
  const stmt = getDb().prepare(`
    INSERT INTO tools (name, slug, description, short_description, category, icon, download_url, github_url, platform, sha256_hash, safety_score, last_scan_date)
    VALUES (@name, @slug, @description, @short_description, @category, @icon, @download_url, @github_url, @platform, @sha256_hash, @safety_score, @last_scan_date)
  `);
  return stmt.run(tool);
}

export function updateTool(slug: string, tool: Record<string, unknown>) {
  const stmt = getDb().prepare(`
    UPDATE tools SET
      name = @name,
      description = @description,
      short_description = @short_description,
      category = @category,
      icon = @icon,
      download_url = @download_url,
      github_url = @github_url,
      platform = @platform,
      sha256_hash = @sha256_hash,
      safety_score = @safety_score,
      last_scan_date = @last_scan_date,
      updated_at = datetime('now')
    WHERE slug = @slug
  `);
  return stmt.run({ ...tool, slug });
}

export function deleteTool(slug: string) {
  return getDb().prepare("DELETE FROM tools WHERE slug = ?").run(slug);
}

export function verifyAdminPassword(password: string): boolean {
  const row = getDb().prepare("SELECT password_hash FROM admin WHERE id = 1").get() as
    | { password_hash: string }
    | undefined;
  if (!row) return false;
  return bcrypt.compareSync(password, row.password_hash);
}

export function getCategories(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT category FROM tools ORDER BY category")
    .all() as { category: string }[];
  return rows.map((r) => r.category);
}

export function getToolCount(): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM tools").get() as { count: number };
  return row.count;
}

export function getTotalDownloads(): number {
  const row = getDb().prepare("SELECT COALESCE(SUM(downloads), 0) as total FROM tools").get() as {
    total: number;
  };
  return row.total;
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

export function createToolRequest(req: {
  tool_name: string;
  description: string;
  submitted_by?: string;
  link?: string;
}) {
  return getDb()
    .prepare(
      `INSERT INTO tool_requests (tool_name, description, submitted_by, link)
       VALUES (@tool_name, @description, @submitted_by, @link)`
    )
    .run({
      tool_name: req.tool_name,
      description: req.description,
      submitted_by: req.submitted_by || null,
      link: req.link || null,
    });
}

export function getAllToolRequests(): ToolRequest[] {
  return getDb()
    .prepare("SELECT * FROM tool_requests ORDER BY created_at DESC")
    .all() as ToolRequest[];
}

export function getPendingToolRequests(): ToolRequest[] {
  return getDb()
    .prepare("SELECT * FROM tool_requests WHERE status = 'pending' ORDER BY created_at DESC")
    .all() as ToolRequest[];
}

export function updateToolRequestStatus(id: number, status: string) {
  return getDb()
    .prepare("UPDATE tool_requests SET status = ? WHERE id = ?")
    .run(status, id);
}

export function deleteToolRequest(id: number) {
  return getDb().prepare("DELETE FROM tool_requests WHERE id = ?").run(id);
}
