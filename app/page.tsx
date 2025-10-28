"use client";

import * as React from "react";

import { HomeCallToAction } from "./_components/home-call-to-action";
import { HomeFeatureGrid } from "./_components/home-feature-grid";
import { HomeHeader } from "./_components/home-header";
import { HomeHero } from "./_components/home-hero";
import { HomeWorkflow } from "./_components/home-workflow";
import { HomeWorkspaceHighlights } from "./_components/home-workspace-highlights";
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
      <HomeHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-24 px-6 pb-32 pt-4">
        <HomeHero summaryLabel={summaryLabel} sqlPreview={sqlPreview} onSnapshot={handleSnapshot} />
        <HomeFeatureGrid />
        <HomeWorkflow />
        <HomeWorkspaceHighlights />
        <HomeCallToAction />
      </main>
    </div>
  );
}
