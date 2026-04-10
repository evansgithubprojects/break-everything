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

- Follow existing project structure in `src/app`, `src/components`, and `src/server`.
- Keep server-only logic in `src/server`.
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
