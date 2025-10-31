import { DatabaseErrorState } from "../_components/database-error-state";
import { DatabaseSummaryHeader } from "../_components/database-summary-header";
import { VisualExplorer } from "../_components/visual-explorer";
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-16">
        <DatabaseSummaryHeader
          connectionMeta={connectionMeta}
          snapshot={snapshot}
          accent="Visual explorer"
          headline="Visualize your schema landscape"
          description="Arrange tables, study relationships, and carve your own mental map of the database. Drag, zoom, and highlight the connections that matter."
        />

        {snapshot.tables.length ? (
          <VisualExplorer tables={snapshot.tables} relations={snapshot.relations} />
        ) : (
          <section className="rounded-2xl border border-dashed border-border/60 bg-background/60 px-6 py-12 text-center text-sm text-muted-foreground">
            No user-defined tables were returned for this connection.
          </section>
        )}
      </div>
    </div>
  );
}
