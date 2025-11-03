import { Buffer } from "node:buffer";
import { ExportPanel } from "@/components/database-export-panel";
import { DatabaseSummaryHeader } from "../_components/database-summary-header";
import { loadDatabaseContext } from "../_lib/context";
import { DatabaseErrorState } from "../_components/database-error-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ExportPageProps = {
  searchParams: Promise<{
    connection?: string;
  }>;
};

export default async function ExportPage({ searchParams }: ExportPageProps) {
  const context = await loadDatabaseContext(searchParams);

  if (context.status === "error") {
    return <DatabaseErrorState message={context.message} />;
  }

  const { snapshot, connectionMeta, connectionParam } = context.data;

  // Decode connection string for Neon exports
  let connectionString: string | undefined;
  if (connectionParam) {
    try {
      connectionString = Buffer.from(connectionParam, "base64").toString("utf8").trim();
    } catch (error) {
      console.error("Failed to decode connection string", error);
    }
  }

  // Prepare table data
  const tables = snapshot.tables.map(table => ({
    name: table.name,
    rowCount: table.columns.length > 0 ? undefined : 0,
  }));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-16">
        <DatabaseSummaryHeader
          connectionMeta={connectionMeta}
          snapshot={snapshot}
          accent="Export Data"
          headline="Download your database"
          description="Export tables to CSV, JSON, or SQL format. Perfect for backups, data analysis, or migration."
        />

        <section>
          {tables.length > 0 ? (
            <ExportPanel tables={tables} connectionString={connectionString} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 px-6 py-12 text-center text-sm text-muted-foreground">
              No tables available to export.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
