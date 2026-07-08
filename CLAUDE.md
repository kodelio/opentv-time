# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Overview

Personal TV show and movie tracker: Nuxt 4 + Nuxt UI v4 + Tailwind 4, SQLite
(better-sqlite3 + Drizzle ORM), TMDB metadata localized from the selected display
language. Single-user app, no authentication, mobile-first PWA, self-hosted with Docker.

**Default language is English** for UI, comments, errors, docs, and README. The app
supports a display-language setting in **Settings**, including French, saved in SQLite.
Keep new user-facing text in the i18n dictionary (`app/utils/i18n/messages.ts`).

## Commands

Node >= 24, pnpm 11.

```bash
pnpm dev                # http://localhost:3000 (requires NUXT_TMDB_API_KEY in .env)
pnpm test               # all Vitest tests
pnpm vitest run tests/unit/text-search.test.ts   # one test file
pnpm vitest run -t "test name"                   # one test by name
pnpm test:coverage      # 80% thresholds on server/services, server/utils/tmdb, shared
pnpm typecheck
pnpm db:generate        # generate a migration after changing server/db/schema/
pnpm rebuild:sqlite     # rebuild better-sqlite3 after changing Node version
```

Deployment: run `./deploy.sh` from the server (pull + Docker rebuild, app on port
3002 by default, health check `/api/health`).

## Local Data

- `data/opentvtime.sqlite`: local SQLite database, created and migrated automatically
  on startup. Ignored by git. Tests use in-memory SQLite and do not touch it.
- **TV Time import**: in **Settings** (`/settings`), drop the TV Time GDPR export ZIP.
  `POST /api/import/tvtime` extracts CSV files in memory and calls `runGdprImport`
  (`server/services/import/`), which matches titles through TMDB and imports shows,
  watched episodes, and movies. Titles not matched automatically are resolved manually
  on the same page (**Items to resolve**).

## Architecture

Typical request flow:

```
page/component (useFetch) -> server/api/... (thin handler) -> server/services/<domain>/...
```

- **`server/api/`**: thin h3 handlers. Validate with zod schemas from
  `shared/schemas/api/` via `getValidatedQuery`/`readValidatedBody`, then call a
  service with `useDb()` / `useTmdb()`. Convert errors with `toHttpError`
  (`server/utils/handleServiceError.ts`); services throw `NotFoundError`
  (`server/services/errors.ts`).
- **`server/services/`**: all business logic, written as functions that receive
  `Db` (and `TmdbClient` when needed) **as parameters**. Never call `useDb()` or
  `useTmdb()` inside a service. This keeps integration tests HTTP-free.
- **`server/db/`**: Drizzle schema split by domain in `schema/`; migrations generated
  by drizzle-kit in `migrations/` and applied automatically on startup
  (`server/plugins/01.migrate.ts`). Never edit an existing migration: change the
  schema, then run `pnpm db:generate`.
- **`server/utils/tmdb/`**: TMDB client (v4 read token, p-limit concurrency). Followed
  shows are refreshed nightly by Nitro task `tmdb:refresh` (5:00 cron in
  `nuxt.config.ts`), also triggerable with `POST /api/sync/refresh`.
- **`shared/`**: isomorphic client/server code: config defaults
  (`shared/config/defaults.ts`), supported languages (`shared/config/languages.ts`),
  zod schemas, utilities.
- **`app/`**: Nuxt 4 pages. Canonical paths are English and centralized in
  `app/utils/navigation.ts` (`ROUTES`, `movieRoute`, `showRoute`); French legacy pages
  (`decouvrir.vue`, `films/...`, `series/...`, etc.) are 301 redirects. Always use
  `navigation.ts` for links. Forced dark theme, mobile navigation via `AppBottomNav`.

## Tests

- `tests/unit/`: pure logic (parsers, utils, TMDB client).
- `tests/integration/`: services against a real in-memory SQLite database.
  `createTestDb()` (`tests/helpers/testDb.ts`) applies real migrations; TMDB is mocked
  with `fakeTmdb()` (`tests/helpers/fakeTmdb.ts`).
- Add tests for a new service at the same layer: test the service directly, not through HTTP.
