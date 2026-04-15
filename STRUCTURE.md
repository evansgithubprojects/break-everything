# Project Structure

This project follows Next.js App Router conventions and keeps server-only modules separate from UI code.

## Directory Layout

```text
src/
|-- analytics/              # Client-only helpers (browser → /api/events)
|   |-- client.ts
|   `-- index.ts
|-- app/                    # Routes, layouts, pages, API handlers
|   |-- admin/              # Admin dashboard (+ layout metadata)
|   |-- api/
|   |   |-- __tests__/      # API integration tests
|   |   |-- analytics/      # GET /api/analytics
|   |   |-- auth/
|   |   |-- events/         # POST /api/events (analytics ingest)
|   |   |-- requests/
|   |   `-- tools/
|   |-- tools/              # Browse, [slug] detail, embed, run
|   |-- globals.css
|   |-- icon.png / apple-icon.png / favicon.ico
|   `-- layout.tsx
|-- components/
|   |-- admin/              # AdminAnalyticsPanel
|   |-- forms/
|   |-- layout/
|   |-- tools/              # Cards, trust, delivery, share, mobile store, embeds (e.g. Jira)
|   `-- index.ts            # Namespaced barrels (Admin, Forms, Layout, Tools)
|-- config/                 # App-wide constants (SEO, site name, AdSense id)
|   |-- site-metadata.ts
|   `-- index.ts
|-- server/
|   |-- analytics-ingest.ts
|   |-- api-response.ts
|   |-- auth.ts
|   |-- db.ts
|   |-- parse-json-body.ts
|   |-- rate-limit.ts
|   |-- tool-public.ts      # Public tool field shaping
|   |-- validation.ts
|   |-- __tests__/
|   `-- index.ts
|-- types/
|   |-- analytics.ts
|   |-- tool.ts
|   |-- tool-request.ts
|   `-- index.ts
`-- test-env.ts             # Jest setup (see jest.config.ts)

public/
data/
```

## Analytics (where things live)

| Concern | Location |
|--------|-----------|
| Ingest HTTP API | `src/app/api/events/route.ts` |
| Admin summary HTTP API | `src/app/api/analytics/route.ts` |
| Event name / action validation (server) | `src/server/analytics-ingest.ts` |
| Persist + aggregate queries | `src/server/db.ts` |
| Shared summary type | `src/types/analytics.ts` |
| Browser tracking helper | `src/analytics/client.ts` (`@/analytics`) |
| Admin UI | `src/components/admin/AdminAnalyticsPanel.tsx` |

## Conventions

- Keep Next.js routing logic in `src/app` only.
- Keep reusable UI in `src/components`, grouped by role (`layout`, `forms`, `tools`, `admin`).
- Keep app-wide constants and SEO defaults in `src/config` (not a catch-all `lib`).
- Keep shared TypeScript types in `src/types`.
- Keep server-only logic in `src/server`; do not import it into Client Components.
- Keep client analytics calls in `src/analytics`.
- Co-locate tests in `__tests__` next to the module they exercise.
- Prefer `@/` imports (e.g. `@/config`, `@/types`, `@/server/db`).
