# Break Everything

Free, open-source software tool directory for students, with listing metadata and a lightweight admin workflow.

Break Everything helps users discover free tools (web-first listings with optional install or release links), see listing details (including review dates), and request new tools to be added.

## Features

- Browse all tools at `/tools`
- View per-tool detail pages at `/tools/[slug]`
- Run eligible browser-hosted tools at `/tools/[slug]/run` (beta, rollout-gated)
- Inspect per-tool listing metadata (vendor, privacy, data handling, review date)
- Submit tool requests from the public UI (`/request-tool`)
- Manage tools and analytics from `/admin` after authentication
- Use built-in API routes for tools, auth, events, and analytics

## Tech Stack

- Next.js (App Router)
- React 19
- TypeScript
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- SQLite via `@libsql/client` (local `file:` database or hosted Turso)
- Jest (`ts-jest`) for unit/API tests; Playwright for E2E (`npm run test:e2e`)
- ESLint (`eslint-config-next`)
- Vercel Analytics & Speed Insights (optional in production)

## Environment Variables

- `ADMIN_PASSWORD` - admin login password (required at runtime; stored hashed)
- `SESSION_SECRET` - session cookie secret (required)
- `TURSO_DATABASE_URL` - Turso URL, or omit for local `file:` SQLite under `data/`
- `TURSO_AUTH_TOKEN` - required when `TURSO_DATABASE_URL` is a remote Turso URL
- `NEXT_PUBLIC_SITE_URL` - canonical site URL for metadata and first-party in-app URL checks (optional; defaults for local dev)
- `FIRST_PARTY_ORIGIN` - optional override for same-origin validation of **`/runtime/...`** runtime entries; defaults to `NEXT_PUBLIC_SITE_URL` origin or `http://localhost:3000`
- `SEED_TOOL_LIBRARY` - set to `1` in non-production to seed sample tools locally (optional)
- `NEXT_PUBLIC_RUNTIME_BETA` - global gate for `/tools/[slug]/run` visibility (`1` to enable)
- `NEXT_PUBLIC_RUNTIME_MODULE_BETA` - allow vetted `module` runtime mode in the host (`1` to enable)
- `RUNTIME_ROLLOUT_ALLOWLIST_SLUGS` - optional comma-separated rollout allowlist
- `RUNTIME_KILL_SWITCH_SLUGS` - optional comma-separated emergency runtime denylist

## First-party in-app browser runtime

The in-app experience (**Try in your browser** at `/tools/[slug]/run`) uses assets **you host on this site** only:

- **Runtime**: `runtime_manifest.entry` and `runtime_entrypoint` are **relative paths** only (starting with **`/runtime/`** — for example `/runtime/video-converter/index.html`). Stored full URLs on the same deployment are coerced to that path on admin write and DB init. Schemes, hosts, and `..` segments are rejected.

Third-party tools remain listable with external **Open in browser**, downloads, and store links; legacy embed fields and invalid runtime flags are **corrected on database init** (strict migration).

## Project Structure

See [`STRUCTURE.md`](./STRUCTURE.md) for the full directory map.

Key areas:

- `src/app` - routes, layouts, pages, API route handlers
- `src/components` - reusable UI components
- `src/components/analytics` - client engagement trackers (lazy-loaded on key pages)
- `src/config` - site-wide constants (SEO, branding, AdSense meta value)
- `src/analytics` - client-side analytics helpers (calls `/api/events`)
- `src/types` - shared domain TypeScript types
- `src/server` - server-only modules (database, auth, rate limiting, validation)
- `data` - local SQLite database files

## API Overview

- `GET /api/tools` - list tools (public)
- `POST /api/tools` - create tool (admin)
- `GET /api/tools/[slug]` - get one tool (public)
- `PUT /api/tools/[slug]` - update tool (admin)
- `DELETE /api/tools/[slug]` - delete tool (admin)
- `GET /api/auth` - auth status
- `POST /api/auth` - login
- `DELETE /api/auth` - logout
- `POST /api/events` - record analytics events (public, rate-limited)
- `GET /api/analytics` - analytics aggregates for admin UI (admin session)

Runtime analytics also accepts lifecycle events (`runtime_start`, `runtime_ready`, `runtime_error`,
`runtime_action`) with optional UTM context fields for attribution analysis.

## Local Video Converter Runtime (Template)

This repo now includes a fully local browser runtime tool scaffold at:

- `public/runtime/video-converter/index.html`
- `public/runtime/video-converter/runtime.js`

What it does:

- Uses `ffmpeg.wasm` in-browser to convert local video files (MP4/WebM/GIF)
- Loads **`@ffmpeg/ffmpeg`**, **`@ffmpeg/util`**, and **`@ffmpeg/core`** from **`public/runtime/vendor/`** (same origin; run **`npm run vendor:ffmpeg`** after `npm install` to copy them from `node_modules`, including the ~31 MB `ffmpeg-core.wasm`)
- `next.config.ts` sends **`Cross-Origin-Opener-Policy: same-origin`** and **`Cross-Origin-Embedder-Policy: credentialless`** on `/runtime/*` and `/tools/*` so `SharedArrayBuffer` works (`credentialless` keeps CDN core fetches practical; `require-corp` needs every subresource to opt in with CORP)
- Keeps file processing local to the user’s browser tab
- Emits runtime lifecycle/action messages so host analytics continue working

How to enable it as a listing:

1. Set `NEXT_PUBLIC_RUNTIME_BETA=1` in `.env`
2. Create a tool entry (admin UI or `POST /api/tools`) with:
   - `slug`: `local-video-converter`
   - `delivery_mode`: `browserRuntime`
   - `sandbox_level`: **`trusted`** or **`standard`** (both allow `downloads: true` from the manifest; **`strict`** clears it so `<a download>` cannot work)
   - `runtime_supported`: `true`
   - `runtime_entrypoint`: `/runtime/video-converter/index.html`
   - `runtime_manifest`:

```json
{
  "version": 1,
  "entry": "/runtime/video-converter/index.html",
  "executionMode": "iframe",
  "permissions": {
    "network": false,
    "storage": true,
    "clipboard": false,
    "downloads": true,
    "popups": false
  },
  "allowedOrigins": [],
  "storagePolicy": "session",
  "capabilities": ["fileOpen", "fileSave"]
}
```

Optional: override the core directory (must contain `ffmpeg-core.js` / `ffmpeg-core.wasm` under that URL path):

```html
<script>
  window.__FFMPEG_CORE_BASE = "/runtime/vendor/ffmpeg-core";
</script>
```

before loading `runtime.js` (defaults already use this path after `npm run vendor:ffmpeg`).

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow, expectations, and validation steps.

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) for notable project changes.

## License

This project is licensed under the [MIT License](./LICENSE).
