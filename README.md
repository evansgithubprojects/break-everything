# Break Everything

Free, open-source software tool directory for students, with listing metadata and a lightweight admin workflow.

Break Everything helps users discover free tools (web-first listings with optional install or release links), see listing details (including review dates), and request new tools to be added.

## Features

- Browse all tools at `/tools`
- View per-tool detail pages at `/tools/[slug]`
- Inspect per-tool listing metadata (vendor, privacy, data handling, review date)
- Submit tool requests from the public UI
- Manage tools, requests, and analytics from `/admin` after authentication
- Use built-in API routes for tools, auth, requests, events, and analytics

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
- `NEXT_PUBLIC_SITE_URL` - canonical site URL for metadata (optional; defaults for local dev)
- `SEED_TOOL_LIBRARY` - set to `1` in non-production to seed sample tools locally (optional)

## Project Structure

See [`STRUCTURE.md`](./STRUCTURE.md) for the full directory map.

Key areas:

- `src/app` - routes, layouts, pages, API route handlers
- `src/components` - reusable UI components
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
- `POST /api/requests` - submit tool request (public)
- `GET /api/requests` - list requests (admin)
- `PATCH /api/requests/[id]` - update request status (admin)
- `DELETE /api/requests/[id]` - delete request (admin)
- `POST /api/events` - record analytics events (public, rate-limited)
- `GET /api/analytics` - analytics aggregates for admin UI (admin session)

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow, expectations, and validation steps.

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) for notable project changes.

## License

This project is licensed under the [MIT License](./LICENSE).
