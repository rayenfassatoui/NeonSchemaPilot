import { DatabaseErrorState } from "../_components/database-error-state";
import { DatabaseSummaryHeader } from "../_components/database-summary-header";
import { TableDataExplorer } from "../_components/table-data-explorer";
import { loadDatabaseContext } from "../_lib/context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TablesViewPageProps = {
  searchParams: Promise<{
    connection?: string;
  }>;
};

export default async function TablesViewPage({ searchParams }: TablesViewPageProps) {
  const context = await loadDatabaseContext(searchParams);

  if (context.status === "error") {
    return <DatabaseErrorState message={context.message} />;
  }

  const { snapshot, connectionMeta, connectionParam } = context.data;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-16">
        <DatabaseSummaryHeader
          connectionMeta={connectionMeta}
          snapshot={snapshot}
          accent="Table ledger"
          headline="Dive into every table"
          description="Scan column definitions, defaults, and nullability across the entire schema. Perfect when you need quick answers for migrations or API contracts."
        />

        <TableDataExplorer connectionParam={connectionParam} tables={snapshot.tables} />

        <section className="space-y-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Tables overview</h2>
              <p className="text-sm text-muted-foreground">
                Each panel mirrors a table. Scroll horizontally to review the full column matrix.
              </p>
            </div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {snapshot.tableCount} total
            </span>
          </div>

          {snapshot.tables.length ? (
            <div className="space-y-6">
              {snapshot.tables.map((table) => (
                <div
                  key={`${table.schema}.${table.name}`}
                  className="rounded-2xl border border-border/60 bg-background/80 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/60 px-5 py-4">
                    <div>
                      <p className="font-semibold text-foreground">
                        {table.schema}.{table.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {table.columns.length} {table.columns.length === 1 ? "column" : "columns"}
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto px-5 pb-5 pt-4">
                    {table.columns.length ? (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="py-2 pr-6">Column</th>
                            <th className="py-2 pr-6">Type</th>
                            <th className="py-2 pr-6">Nullable</th>
                            <th className="py-2 pr-6">Default</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.columns.map((column) => (
                            <tr key={column.name} className="border-t border-border/40">
                              <td className="py-2 pr-6 font-medium text-foreground">{column.name}</td>
                              <td className="py-2 pr-6 text-muted-foreground">{column.dataType}</td>
                              <td className="py-2 pr-6 text-muted-foreground">{column.nullable ? "Yes" : "No"}</td>
                              <td className="py-2 pr-6 text-muted-foreground">{column.defaultValue ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-muted-foreground">No columns discovered for this table.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
              No user-defined tables were returned for this connection.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
