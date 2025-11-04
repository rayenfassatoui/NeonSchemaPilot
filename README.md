<div align="center">

# MyDatabase Studio

Humanized database exploration for file-backed workspaces and Neon clusters. Blend AI-assisted schema editing with visual, tabular, and SQL-first views without leaving the browser.

<img src="./public/home.png" alt="Neon Schema Pilot landing page" width="960" />

</div>

## Features

### 🤖 AI-Powered Development
- **Gemini-powered assistant** - Plans and executes DDL, DML, DQL, and DCL operations against a safe file-based datastore
- **Intelligent query suggestions** - Get smart recommendations based on your schema and query patterns

### 📊 Data Visualization & Analysis
- **Interactive Charts** - Create bar, line, pie, and area charts with automatic insights and trend detection
- **Visual Database Canvas** - Drag tables, trace foreign keys, and visualize relationships on an infinite canvas
- **Tables Explorer** - Inspect column metadata and sample rows with advanced filtering and search

### ⚡ Performance & Monitoring
- **Performance Analytics** - Real-time monitoring with slow query detection and optimization recommendations
- **Query History Tracker** - Complete audit trail of executed queries with performance metrics and statistics
- **Execution Insights** - Identify bottlenecks and get actionable performance improvement suggestions

### 💾 Data Management
- **Import Data** - Upload CSV, JSON, or SQL files with automatic type inference and validation
- **Export Data** - Download tables in multiple formats for backups, analysis, or migration
- **Backup & Restore** - Create automated backups in SQL, JSON, or CSV formats with preview and verification
- **Scheduled Queries** - Automate routine operations with cron-based scheduling for reports and maintenance tasks

### 🔧 Developer Experience
- **SQL Preview** - Live-generated SQL from schema snapshots with syntax highlighting
- **Floating Navigation** - Draggable navbar that preserves active connection context across views
- **Neon Integration** - Seamless connection to Neon PostgreSQL with secure credential handling
- **Multi-View Support** - Switch between visual, tabular, and SQL-first perspectives without losing context

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

## Feature Quick Start

### 🤖 AI Assistant
Navigate to the **AI Studio** to draft queries, plan schema changes, and get intelligent suggestions based on your database structure.

### 📊 Visualizations
Use the **Charts** view to create interactive visualizations of your data. The system automatically suggests chart types and provides insights.

### ⚡ Performance Monitoring
Check the **Performance** dashboard to monitor query execution times, identify slow queries, and receive optimization recommendations.

### 💾 Backup & Restore
Go to **Backup & Restore** to create snapshots in SQL, JSON, or CSV formats. Preview estimated sizes before downloading.

### ⏰ Scheduled Queries
Set up **Scheduled Queries** to automate reports, cleanup tasks, and maintenance operations with cron-based scheduling.

### 📥 Import/Export Data
Use **Import Data** to upload CSV, JSON, or SQL files with automatic type inference, or **Export Data** to download tables in multiple formats.

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

### Core Application
- `app/database/` – Database workspace with Visual, Tables, SQL, Charts, Performance, and History views
- `app/ai/` – AI assistant interface for schema planning and query generation
- `components/database-diagram/` – Interactive canvas rendering with drag-and-drop tables

### API Routes
- `app/api/neon/` – Serverless routes for Neon database operations (describe, table-data)
- `app/api/backup/` – Backup creation and preview endpoints
- `app/api/schedules/` – Scheduled query management
- `app/api/performance/` – Performance metrics and analytics
- `app/api/import/` – Data import from CSV, JSON, SQL files
- `app/api/export/` – Data export in multiple formats

### Components
- `components/backup-manager.tsx` – Backup creation and history interface
- `components/schedule-manager.tsx` – Scheduled query configuration
- `components/performance-dashboard.tsx` – Performance monitoring dashboard
- `components/site-navbar.tsx` – Floating navigation with connection context

### Utilities
- `lib/backup-utils.ts` – Backup generation and validation logic
- `lib/schedule-utils.ts` – Cron scheduling and query management
- `lib/performance-utils.ts` – Performance calculation and recommendations
- `lib/import-utils.ts` – File parsing and type inference
- `lib/file-db/` – File-based database implementation

## Deployment

The project works well on Vercel or any platform that supports Next.js App Router with Node runtime. Remember to configure your Neon connection string as an environment variable or use secure connection sharing before deploying.

---

Need help? File an issue or ping the maintainer with details about your Neon setup and reproduction steps.
