import { DatabaseDiagram } from "@/components/database-diagram";

import { DatabaseErrorState } from "../_components/database-error-state";
import { DatabaseSummaryHeader } from "../_components/database-summary-header";
import { loadDatabaseContext } from "../_lib/context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VisualViewPageProps = {
  searchParams: Promise<{
    connection?: string;
  }>;
};

export default async function VisualViewPage({ searchParams }: VisualViewPageProps) {
  const context = await loadDatabaseContext(searchParams);

  if (context.status === "error") {
    return <DatabaseErrorState message={context.message} />;
  }

  const { snapshot, connectionMeta } = context.data;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
        <DatabaseSummaryHeader
          connectionMeta={connectionMeta}
          snapshot={snapshot}
          accent="Visual explorer"
          headline="Visualize your schema landscape"
          description="Arrange tables, study relationships, and carve your own mental map of the database. Drag, zoom, and highlight the connections that matter."
        />

        {snapshot.tables.length ? (
          <section className="space-y-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">Canvas playground</h2>
                <p className="text-sm text-muted-foreground">
                  Use drag, pan, or wheel zoom to sculpt the diagram. Your layout is kept per schema snapshot.
                </p>
              </div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {snapshot.relations.length} relation{snapshot.relations.length === 1 ? "" : "s"}
              </span>
            </div>
            <DatabaseDiagram tables={snapshot.tables} relations={snapshot.relations} />
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
            No user-defined tables were returned for this connection.
          </section>
        )}

        {snapshot.relations.length ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="text-2xl font-semibold">Relation digest</h2>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Foreign key overview
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {snapshot.relations.map((relation) => (
                <div
                  key={`${relation.constraintName}-${relation.source.table}-${relation.source.column}-${relation.target.table}-${relation.target.column}`}
                  className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {relation.source.schema}.{relation.source.table}.{relation.source.column}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    → {relation.target.schema}.{relation.target.table}
                    {relation.target.column ? `.${relation.target.column}` : ""}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {relation.constraintName}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
