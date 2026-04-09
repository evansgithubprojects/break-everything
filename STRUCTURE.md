# Project Structure

This project follows Next.js App Router conventions and keeps server-only modules separate from UI code.

## Directory Layout

```text
src/
|-- app/                    # Next.js routes, layouts, pages, and API handlers
|   |-- admin/              # Admin dashboard route segment
|   |-- api/                # HTTP route handlers
|   |   |-- __tests__/      # API route integration tests (co-located)
|   |   |-- auth/           # Auth endpoints
|   |   |-- requests/       # Tool request endpoints
|   |   `-- tools/          # Tool CRUD endpoints
|   |-- tools/              # Public tool listing/detail routes
|   |-- globals.css         # Global styles
|   `-- layout.tsx          # Root layout shell
|-- components/             # Reusable UI components
|   |-- forms/              # Form-centric components
|   |-- layout/             # App shell components (header/footer/background)
|   |-- tools/              # Tool-domain display components
|   `-- index.ts            # Barrel exports for component domains
|-- types/                  # Shared TypeScript domain types
|   `-- index.ts            # Barrel exports for shared types
`-- server/                 # Server-only modules (DB, auth, rate limits)
    |-- __tests__/          # Server module tests (co-located)
    `-- index.ts            # Barrel exports for server modules

public/                     # Static assets served directly
data/                       # SQLite databases and local test DBs
```

## Conventions

- Keep Next.js routing logic in `src/app` only.
- Keep reusable UI in `src/components`, organized by role (`layout`, `forms`, `tools`).
- Keep shared domain types in `src/types` (not inside UI component files).
- Keep all server-only logic in `src/server`; do not import it into Client Components.
- Co-locate tests under the nearest module `__tests__` directory.
- Use `@/` absolute imports and avoid deep relative paths.
