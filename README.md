<div align="center">

# Neon Schema Pilot

Schema-first database explorer for Neon projects. Connect a Neon URL, visualize table relations, inspect sample data, and jump between visual, tabular, and SQL views without leaving the browser.

</div>

## Features

- Visual database canvas with draggable tables and relation highlights
- Dedicated tables view with column metadata and sample row explorer
- SQL preview generated from the live schema snapshot
- Floating, draggable navbar that preserves the active connection string
- Neon API integration via serverless routes for describe and table data fetching

## Prerequisites

- [Bun](https://bun.sh/) 1.1 or newer (preferred runtime)
- Node.js 18+ if you plan to run with `npm`/`pnpm`
- A Neon connection string with read access (e.g. `postgresql://user:pass@host/db`)

## Quick Start

```bash
# install dependencies
bun install

# run the dev server
bun dev

# optional: lint and type-check
bun run lint
bunx tsc --noEmit
```

Open `http://localhost:3000` to use the interface. From the landing page, click **Connect with Neon URL**, paste your connection string, and you will be redirected to the database workspace with your schema snapshot.

## Environment & Connection Notes

- Connection strings are passed around the app via the `connection` search param (base64 encoded). The navbar keeps this param on internal navigation so the same database context persists.
- Server-side routes live in `app/api/neon/**`. The `describe` route ingests schema metadata; the `table-data` route returns sample rows. Review these handlers before deploying to production.
- No `.env` file is required by default, but you can add one and read from `process.env` in the API routes if you want to hide credentials locally.

## Production Build

```bash
bun run build
bun run start
```

The build uses Next.js 16 with Turbopack. Ensure any client components that call `useSearchParams` or other browser-only hooks remain wrapped in a `<Suspense>` boundary (see `components/layout-shell.tsx`).

## Project Structure Highlights

- `app/database/` – routed layouts for Visual, Tables, and SQL views
- `components/database-diagram/**` – canvas rendering primitives
- `app/api/neon/` – serverless routes that proxy Neon APIs
- `components/site-navbar.tsx` – floating navigation shared across pages

## Deployment

The project works well on Vercel or any platform that supports Next.js App Router with Node runtime. Remember to configure your Neon connection string as an environment variable or use secure connection sharing before deploying.

---

Need help? File an issue or ping the maintainer with details about your Neon setup and reproduction steps.
