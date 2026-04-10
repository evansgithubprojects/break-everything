import path from "path";
import { defineConfig, devices } from "@playwright/test";

/** Dedicated port so E2E does not attach to a developer's unrelated `next dev` on :3000. */
const port = 3001;
const baseURL = `http://127.0.0.1:${port}`;
const e2eDbPath = path.join(process.cwd(), "data", "e2e-playwright.db");

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Production server on a dedicated port — avoids Next.js "only one dev server per project" lock
    // and matches deployed behavior. Requires `npm run build` first (see npm script `test:e2e`).
    command: `npx next start -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      // Force local SQLite for E2E even if developer .env points at Turso.
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
      TEST_DB_PATH: e2eDbPath,
      PLAYWRIGHT_E2E: "1",
      ADMIN_PASSWORD: "e2e-admin-password",
      SESSION_SECRET: "e2e-session-secret-at-least-32-characters-long",
    },
  },
});
