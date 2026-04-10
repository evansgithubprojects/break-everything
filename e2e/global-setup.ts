import fs from "fs";
import path from "path";

/**
 * Fresh SQLite file for each Playwright run so UI tests don't depend on local dev DB state.
 */
export default async function globalSetup() {
  const dbPath = path.join(process.cwd(), "data", "e2e-playwright.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  for (const ext of ["", "-wal", "-shm"]) {
    const f = dbPath + ext;
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
      } catch {
        // ignore EBUSY; next dev may recreate
      }
    }
  }
}
