import { QueryHistoryPanel } from "@/components/query-history-panel";
import { DatabaseSummaryHeader } from "../_components/database-summary-header";
import { loadDatabaseContext } from "../_lib/context";
import { DatabaseErrorState } from "../_components/database-error-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QueryHistoryPageProps = {
  searchParams: Promise<{
    connection?: string;
  }>;
};

export default async function QueryHistoryPage({ searchParams }: QueryHistoryPageProps) {
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
          accent="Query History"
          headline="Track your database operations"
          description="View and analyze all executed queries, monitor performance metrics, and review operation outcomes."
        />

        <section>
          <QueryHistoryPanel />
        </section>
      </div>
    </div>
  );
}
