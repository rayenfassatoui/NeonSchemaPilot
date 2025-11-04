import { Activity, FileUp, GitBranch, Share2, Sparkles, Table, Database, Clock } from "lucide-react";

import { Card } from "@/components/ui/card";

const features = [
  {
    title: "AI-powered change planning",
    description:
      "Let the Gemini assistant draft DDL, DML, DQL, and DCL operations against a safe file-backed datastore before touching production.",
    icon: Sparkles,
  },
  {
    title: "Visual schema canvas",
    description:
      "Drag tables around a collaborative board, surface relations instantly, and spot missing references without leaving the browser.",
    icon: GitBranch,
  },
  {
    title: "Tables that stay readable",
    description:
      "Inspect column metadata alongside sample rows so analysts, engineers, and PMs can answer their own questions quickly.",
    icon: Table,
  },
  {
    title: "Import data seamlessly",
    description:
      "Upload CSV, JSON, or SQL files with automatic type inference and validation. Preview changes before committing to your database.",
    icon: FileUp,
  },
  {
    title: "Performance analytics",
    description:
      "Monitor query execution times, identify slow queries, and get optimization recommendations to keep your database running smoothly.",
    icon: Activity,
  },
  {
    title: "Backup & restore",
    description:
      "Create automated backups in SQL, JSON, or CSV formats. Restore your database from snapshots with confidence and zero downtime.",
    icon: Database,
  },
  {
    title: "Scheduled queries",
    description:
      "Automate routine database operations with cron-based scheduling. Run reports, cleanup tasks, and maintenance jobs on autopilot.",
    icon: Clock,
  },
  {
    title: "Context you can share",
    description:
      "Package schema snapshots, AI intent, and SQL previews into a single URL that teammates can revisit anytime.",
    icon: Share2,
  },
] as const;

export function HomeFeatureGrid() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-10 text-center" id="features">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Why MyDatabase Studio</p>
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need to manage databases efficiently</h2>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          From AI-powered query building to automated backups and performance monitoring, MyDatabase Studio brings together all the tools modern teams need to work confidently with their databases. No context switching, no scattered tools—just one powerful workspace.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="group h-full rounded-2xl border border-border/70 bg-background/60 p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-border/60 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="mb-4 inline-flex items-center justify-center rounded-full border border-border/60 bg-background/80 p-2.5 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
