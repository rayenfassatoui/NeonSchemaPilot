import { Card, CardContent } from "@/components/ui/card";
import type { DescribeResponse } from "@/types/neon";

import type { DatabaseConnectionMeta } from "../_lib/context";
import { formatSnapshotSummary } from "../_lib/context";

type DatabaseSummaryHeaderProps = {
  connectionMeta: DatabaseConnectionMeta;
  snapshot: DescribeResponse["snapshot"];
  headline: string;
  description: string;
  accent?: string;
};

export function DatabaseSummaryHeader({
  connectionMeta,
  snapshot,
  headline,
  description,
  accent = "Database overview",
}: DatabaseSummaryHeaderProps) {
  return (
    <header className="flex flex-col gap-10">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="space-y-6">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {accent}
          </span>
          <div className="space-y-4">
            <h1 className="text-balance text-4xl font-semibold leading-tight">{headline}</h1>
            <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="grid gap-3 text-sm text-muted-foreground">
          <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cluster host</p>
            <p className="text-base font-medium text-foreground">{connectionMeta.host}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Database</p>
              <p className="text-base font-medium text-foreground">{connectionMeta.database}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">User</p>
              <p className="text-base font-medium text-foreground">{connectionMeta.user}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="rounded-2xl border-border/70 bg-background/80 shadow-sm">
          <CardContent className="space-y-2 px-6 py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tables</p>
            <p className="text-3xl font-semibold text-foreground">{snapshot.tableCount}</p>
            <p className="text-xs text-muted-foreground">User-defined tables detected</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70 bg-background/80 shadow-sm">
          <CardContent className="space-y-2 px-6 py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Columns</p>
            <p className="text-3xl font-semibold text-foreground">{snapshot.columnCount}</p>
            <p className="text-xs text-muted-foreground">Across all tables</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70 bg-background/80 shadow-sm">
          <CardContent className="space-y-2 px-6 py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Relations</p>
            <p className="text-3xl font-semibold text-foreground">{snapshot.relations.length}</p>
            <p className="text-xs text-muted-foreground">Foreign keys discovered</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70 bg-background/80 shadow-sm">
          <CardContent className="space-y-2 px-6 py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
            <p className="text-sm font-medium text-foreground">{formatSnapshotSummary(snapshot)}</p>
            <p className="text-xs text-muted-foreground">Generated moments ago</p>
          </CardContent>
        </Card>
      </div>
    </header>
  );
}
