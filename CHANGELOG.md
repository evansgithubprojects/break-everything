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

- Refreshed Markdown docs (`README`, `STRUCTURE`, `CONTRIBUTING`, agent pointers) to match current layout (`src/config`, analytics APIs, env vars, test scripts).

### Security

- Admin authentication relies on `ADMIN_PASSWORD` and `SESSION_SECRET` at runtime; do not commit real values or checked-in `.env` files.
