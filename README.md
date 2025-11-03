<div align="center">

# MyDatabase Studio

Humanized database exploration for file-backed workspaces and Neon clusters. Blend AI-assisted schema editing with visual, tabular, and SQL-first views without leaving the browser.

<img src="./public/home.png" alt="Neon Schema Pilot landing page" width="960" />

</div>

## Features

- Gemini-powered assistant that plans and executes DDL, DML, DQL, and DCL against a file-based datastore
- Visual database canvas with draggable tables and relation highlights
- Dedicated tables view with column metadata and sample row explorer
- SQL preview generated from the live schema snapshot
- **Query History Tracker** - Monitor all executed queries with performance metrics, filters, and statistics
- **Export Data** - Download tables in CSV, JSON, or SQL format for backups, analysis, or migration
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
- The AI workspace requires a Gemini API key. Create a `.env.local` file and set `GEMINI_API_KEY=your_key_here` before running the dev server. The key is read only on the server.
- The file-backed datastore persists to `data/database.json`. The file is created automatically the first time you interact with the assistant.

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
