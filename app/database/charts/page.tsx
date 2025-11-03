import { Buffer } from "node:buffer";
import { ChartGallery } from "@/components/charts/chart-gallery";
import { DatabaseSummaryHeader } from "../_components/database-summary-header";
import { loadDatabaseContext } from "../_lib/context";
import { DatabaseErrorState } from "../_components/database-error-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChartsPageProps = {
  searchParams: Promise<{
    connection?: string;
  }>;
};

export default async function ChartsPage({ searchParams }: ChartsPageProps) {
  const context = await loadDatabaseContext(searchParams);

  if (context.status === "error") {
    return <DatabaseErrorState message={context.message} />;
  }

  const { snapshot, connectionMeta, connectionParam } = context.data;

  // Decode connection string for chart data fetching
  let connectionString: string | undefined;
  if (connectionParam) {
    try {
      connectionString = Buffer.from(connectionParam, "base64").toString("utf8").trim();
    } catch (error) {
      console.error("Failed to decode connection string", error);
    }
  }

  // Prepare table list
  const tables = snapshot.tables.map(table => ({
    name: table.name,
  }));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-14 px-6 py-16">
        <DatabaseSummaryHeader
          connectionMeta={connectionMeta}
          snapshot={snapshot}
          accent="Data Visualizations"
          headline="Explore your data visually"
          description="Interactive charts and insights automatically generated from your tables. Discover trends, patterns, and outliers at a glance."
        />

        <section>
          {tables.length > 0 ? (
            <ChartGallery tables={tables} connectionString={connectionString} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 px-6 py-12 text-center text-sm text-muted-foreground">
              No tables available for visualization.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
