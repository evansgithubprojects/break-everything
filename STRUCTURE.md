# Project Structure

This project follows Next.js App Router conventions and keeps server-only modules separate from UI code.

## Directory Layout

```text
src/
|-- analytics/              # Client-only helpers (browser → /api/events)
|   |-- client.ts
|   |-- campus-attribution.ts
|   |-- useCampusAttribution.ts
|   `-- index.ts
|-- app/                    # Routes, layouts, pages, API handlers
|   |-- admin/              # Admin dashboard (+ layout metadata)
|   |-- request-tool/       # Public request-a-tool page
|   |-- api/
|   |   |-- __tests__/      # API integration tests
|   |   |-- analytics/      # GET /api/analytics
|   |   |-- auth/
|   |   |-- events/         # POST /api/events (analytics ingest)
|   |   `-- tools/
|   |-- tools/              # Browse, [slug] detail, run
|   |-- globals.css
|   |-- icon.png / apple-icon.png / favicon.ico
|   `-- layout.tsx
|-- components/
|   |-- admin/              # AdminAnalyticsPanel
|   |-- analytics/          # Bounce/engagement trackers
|   |-- forms/
|   |-- layout/
|   |-- runtime/            # ToolRuntimeHost boundary + runtime boot/error UX
|   `-- tools/              # Cards, trust, delivery, share, mobile store
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
|   |-- runtime-policy.ts
|   |-- runtime-rollout.ts
|   |-- tool-public.ts      # Public tool field shaping
|   |-- validation.ts
|   `-- __tests__/
|-- types/
|   |-- analytics.ts
|   |-- runtime.ts
|   |-- tool.ts
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

## Runtime Hosting (where things live)

| Concern | Location |
|--------|-----------|
| Runtime route page / rollout gating | `src/app/tools/[slug]/run/page.tsx` |
| Runtime rollout + kill switch controls | `src/server/runtime-rollout.ts` |
| Runtime contract type | `src/types/runtime.ts` |
| Manifest validation + presets | `src/server/validation.ts` |
| Runtime analytics ingest allowlist | `src/server/analytics-ingest.ts` |

## Conventions

- Keep Next.js routing logic in `src/app` only.
- Keep reusable UI in `src/components`, grouped by role (`layout`, `forms`, `tools`, `admin`).
- Keep app-wide constants and SEO defaults in `src/config` (not a catch-all `lib`).
- Keep shared TypeScript types in `src/types`.
- Keep server-only logic in `src/server`; do not import it into Client Components.
- Keep client analytics calls in `src/analytics`.
- Co-locate tests in `__tests__` next to the module they exercise.
- Prefer `@/` imports (e.g. `@/config`, `@/types`, `@/server/db`).
