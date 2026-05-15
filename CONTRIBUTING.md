# Contributing

Thanks for contributing to Break Everything.

## Goals

- Keep the project easy to use for first-time visitors.
- Preserve public trust by keeping safety and metadata accurate.
- Prefer simple, maintainable changes over clever complexity.

## Development Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Branch and PR Workflow

1. Create a branch from `main`.
2. Make focused changes (one logical change per PR when possible).
3. Run validation locally:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
4. Open a pull request with:
   - What changed
   - Why it changed
   - How it was tested

## Code Guidelines

- Follow existing project structure in `src/app`, `src/components`, `src/config`, `src/analytics`, `src/types`, and `src/server`.
- Avoid adding top-level catch-all barrel files unless they have clear, active consumers.
- Keep server-only logic in `src/server`.
- Keep the public request flow in `src/app/request-tool` unless requirements explicitly move it to an API-backed queue.
- Avoid breaking public API route behavior unless intentionally versioned/communicated.
- Update docs when user-facing behavior changes.

## Documentation Expectations

If your PR changes behavior visible to users or contributors, update at least one of:

- `README.md`
- `STRUCTURE.md`
- `CHANGELOG.md`

If details are uncertain, leave a clear `TODO` note instead of guessing.

## Security Notes

- Do not commit secrets or credentials.
- Be careful with authentication, cookie handling, and rate-limit logic.
- If you touch download URLs or listing metadata, verify it is accurate and current.

## Tests

- Place tests in nearby `__tests__` directories.
- Prefer small, explicit tests around changed behavior.

## Adding a Browser Runtime Tool

When adding or enabling a browser-hosted runtime tool:

1. In admin, configure either:
   - a `runtime_manifest` directly, or
   - `runtime_manifest_preset` + `runtime_entrypoint` for a safe preset baseline.
2. Use **`runtime_supported`** in admin as a catalog hint (optional); runtime loads whenever **`/runtime/...`** entry paths validate.
3. Verify rollout controls when using an allowlist:
   - optional `RUNTIME_ROLLOUT_ALLOWLIST_SLUGS` includes the tool slug
   - `RUNTIME_KILL_SWITCH_SLUGS` does not include the tool slug
4. Test behavior:
   - `/tools/[slug]` shows catalog actions; **Try in your browser** links to `/tools/[slug]/run` when rollout allows
   - `/tools/[slug]/run` matches the same rollout rules (see `resolveRuntimeRollout`)
5. Confirm runtime analytics in local testing:
   - `runtime_start`, `runtime_ready`, `runtime_error`, `runtime_action` are accepted by ingest
   - events appear in admin aggregates as expected