import { GitBranch, Share2, Sparkles, Table } from "lucide-react";

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
    title: "Context you can share",
    description:
      "Package schema snapshots, AI intent, and SQL previews into a single URL that teammates can revisit anytime.",
    icon: Share2,
  },
] as const;

export function HomeFeatureGrid() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-8 text-center" id="features">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Why MyDatabase Studio</p>
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Built for database storytellers</h2>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          We designed every surface to help teams understand the intent behind a schema change, not just the SQL. Each tool works together so you can move from discovery to approval without friction.
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
              <div className="mb-5 inline-flex items-center justify-center rounded-full border border-border/60 bg-background/80 p-2 text-primary">
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
