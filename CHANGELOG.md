# Changelog

All notable changes to this project should be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- MIT license via `LICENSE` file.
- Introduced public-facing project documentation:
  - Replaced scaffold README with project-specific `README.md`
  - Added contributor workflow in `CONTRIBUTING.md`
  - Added changelog tracking in `CHANGELOG.md`

### Changed

- Restricted **browser runtime** listings to **first-party same-origin** URLs; runtime entries must live under **`/runtime/...` only**. Invalid stored rows are normalized on database initialization (strict migration). Admin/API enforce the same rules.
- Removed the `/tools/[slug]/embed` iframe route and **embed** delivery mode; in-app tools use the browser runtime at `/tools/[slug]/run` only. Legacy `embed_*` columns are cleared on DB init.
- Removed unused top-level barrels (`src/components/index.ts`, `src/server/index.ts`) and updated structure docs accordingly.
- Lazy-loaded `BounceInsightTracker` on home and tools pages to reduce non-critical client JS in initial render paths.
- Code-split admin-only UI by lazy-loading `AdminAnalyticsPanel` and `AdminToolForm` in `src/app/admin/page.tsx`.
- Removed empty stale directories (`src/components/ads`, `src/app/ads.txt`) and simplified route inventory.
- Removed stale empty routes (src/app/request-a-tool, src/app/api/requests/[id]) and aligned docs with actual request flow (/request-tool).
- Refreshed Markdown docs (`README`, `STRUCTURE`, `CONTRIBUTING`, agent pointers) to match current layout (`src/config`, analytics APIs, env vars, test scripts).

### Security