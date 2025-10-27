"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { NeonConnectDialog } from "@/components/neon-connect-dialog";
import type { DescribeResponse } from "@/types/neon";

const DEFAULT_PREVIEW = `-- Quick snapshot of what we parse for you
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  owner_email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO projects (id, title, owner_email)
VALUES (
  'd2b7f3a3-9c21-4d93-8611-a0f4a1acdb2c',
  'Customer Growth Experiments',
  'avery@studioflow.dev'
);
`;

export default function Home() {
  const [sqlPreview, setSqlPreview] = React.useState(DEFAULT_PREVIEW);
  const [tableSummary, setTableSummary] = React.useState<
    | {
        tableCount: number;
        columnCount: number;
        relationCount: number;
      }
    | null
  >(null);

  const handleSnapshot = React.useCallback((payload: DescribeResponse) => {
    setSqlPreview(payload.sqlPreview);
    setTableSummary({
      tableCount: payload.snapshot.tableCount,
      columnCount: payload.snapshot.columnCount,
      relationCount: payload.snapshot.relations.length,
    });
  }, []);

  const summaryLabel = React.useMemo(() => {
    if (!tableSummary) return "read-only";
    const partials = [] as string[];
    partials.push(`${tableSummary.tableCount} ${tableSummary.tableCount === 1 ? "table" : "tables"}`);
    partials.push(`${tableSummary.columnCount} ${tableSummary.columnCount === 1 ? "column" : "columns"}`);
    partials.push(`${tableSummary.relationCount} ${tableSummary.relationCount === 1 ? "relation" : "relations"}`);
    return partials.join(" · ");
  }, [tableSummary]);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center">
        <div className="h-[420px] w-[420px] rounded-full bg-primary/5 blur-3xl dark:bg-primary/15" />
      </div>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-primary/5 text-sm font-semibold uppercase tracking-widest text-primary dark:bg-primary/10">
            DB
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">MyDatabase Studio</span>
            <span className="text-xs text-muted-foreground">Share context, not chaos</span>
          </div>
        </div>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-16 px-6 pb-20">
        <section className="grid gap-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-10">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground backdrop-blur-sm">
                Neon ready
                <span className="h-1 w-1 rounded-full bg-primary" />
              </span>
              <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Connect Your Database Effortlessly
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Just provide your Neon URL — we’ll handle the rest. Your schema, data, and intent stay crystal clear for anyone on your team.
              </p>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-none rounded-full bg-primary/80" />
                <p className="leading-relaxed">
                  Drop in a secure Neon connection string and we validate it instantly—no SQL dumps or migrations to juggle.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-none rounded-full bg-primary/60" />
                <p className="leading-relaxed">
                  Preview the generated SQL before sharing so collaborators know exactly what tables and inserts they are receiving.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <NeonConnectDialog onSnapshot={handleSnapshot} />
              <button className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                See how sharing works
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Built with Bun, Next.js, and shadcn/ui so your onboarding stays fast and familiar.
            </p>
          </div>
          <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/60 shadow-xl shadow-primary/5 backdrop-blur-2xl dark:border-border/40">
            <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-primary/10 via-transparent to-transparent dark:from-primary/15" />
            <CardContent className="relative space-y-6 pb-8 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm font-medium text-muted-foreground">SQL preview</span>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {summaryLabel}
                </span>
              </div>
              <pre className="max-h-[320px] overflow-hidden whitespace-pre-wrap rounded-xl border border-border/40 bg-muted/60 px-5 py-4 text-sm leading-relaxed text-muted-foreground shadow-inner">
{sqlPreview}
              </pre>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Neon cluster: <span className="font-medium text-foreground">nyc1</span>
                </span>
                <span>
                  Last checked: <span className="font-medium text-foreground">moments ago</span>
                </span>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
