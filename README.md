# Break Everything

Free, open-source software tool directory for students, with listing metadata and a lightweight admin workflow.

Break Everything helps users discover downloadable tools, see listing details (including review dates), and request new tools to be added.

## Features

- Browse all tools at `/tools`
- View per-tool detail pages at `/tools/[slug]`
- Inspect per-tool listing metadata (vendor, privacy, data handling, review date)
- Submit tool requests from the public UI
- Manage tools and requests from `/admin` after authentication
- Use built-in API routes for tools, auth, and requests

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- SQLite via `better-sqlite3`
- Turso/libSQL via `@libsql/client` (production-ready client)
- Jest (`ts-jest`) for tests
- ESLint for linting

## Environment Variables

- `ADMIN_PASSWORD` - admin login password hash source (required)
- `SESSION_SECRET` - cookie/session signing secret (required)
- `TURSO_DATABASE_URL` - Turso database URL (required for production Turso client)
- `TURSO_AUTH_TOKEN` - Turso auth token (required for production Turso client)

## Project Structure

See [`STRUCTURE.md`](./STRUCTURE.md) for the full directory map.

Key areas:

- `src/app` - routes, layouts, pages, API route handlers
- `src/components` - reusable UI components
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

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow, expectations, and validation steps.

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) for notable project changes.

## License

No license file is currently present. Add a `LICENSE` file before public distribution.
