import { Buffer } from "node:buffer";

import Link from "next/link";
import { redirect } from "next/navigation";

import { describeDatabase, isValidConnectionString } from "@/lib/neon";
import { Card, CardContent } from "@/components/ui/card";
import type { DescribeResponse } from "@/types/neon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DatabasePageProps = {
  searchParams: Promise<{
    connection?: string;
  }>;
};

function decodeConnection(connection?: string) {
  if (!connection) return null;
  try {
    return Buffer.from(connection, "base64").toString("utf8").trim();
  } catch (error) {
    console.error("Failed to decode connection string", error);
    return null;
  }
}

function formatSummary(snapshot: DescribeResponse["snapshot"]) {
  const tableText = snapshot.tableCount === 1 ? "table" : "tables";
  const columnText = snapshot.columnCount === 1 ? "column" : "columns";
  return `${snapshot.tableCount} ${tableText} · ${snapshot.columnCount} ${columnText}`;
}

export default async function DatabasePage({ searchParams }: DatabasePageProps) {
  const { connection } = await searchParams;
  const decoded = decodeConnection(connection);

  if (!decoded || !isValidConnectionString(decoded)) {
    redirect("/?error=invalid-connection");
  }

  let connectionMeta: { host: string; database: string; user: string } = {
    host: "unknown",
    database: "—",
    user: "—",
  };

  try {
    const url = new URL(decoded);
    connectionMeta = {
      host: url.hostname,
      database: url.pathname.replace(/^\/+/, "") || "—",
      user: url.username || "—",
    };
  } catch (error) {
    console.error("Failed to parse connection string", error);
  }

  let payload: DescribeResponse | null = null;
  let failureMessage: string | null = null;

  try {
    payload = await describeDatabase(decoded);
  } catch (error) {
    console.error("Failed to describe database", error);
    failureMessage =
      error instanceof Error && error.message
        ? error.message
        : "We couldn't reach that database.";
  }

  if (!payload) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Database overview
          </p>
          <h1 className="text-balance text-3xl font-semibold">We couldn't inspect that Neon workspace</h1>
          <p className="text-sm text-muted-foreground">
            {failureMessage}
          </p>
          <div className="flex justify-center">
            <Link
              href="/"
              className="rounded-full border border-border/60 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-muted/50"
            >
              Back to hero
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { snapshot, sqlPreview } = payload;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
        <header className="flex flex-col gap-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-4">
              <Link
                href="/"
                className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Back to hero
              </Link>
              <div className="space-y-3">
                <h1 className="text-balance text-4xl font-semibold leading-tight">
                  Your database, mapped clearly
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground">
                  We introspected your Neon workspace using read-only access. Explore every table, understand column definitions, and copy the generated SQL snapshot when you need it.
                </p>
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-2xl border-border/70 bg-background/80 shadow-sm">
              <CardContent className="space-y-1 px-6 py-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tables</p>
                <p className="text-3xl font-semibold text-foreground">{snapshot.tableCount}</p>
                <p className="text-xs text-muted-foreground">
                  User-defined tables detected
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/70 bg-background/80 shadow-sm">
              <CardContent className="space-y-1 px-6 py-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Columns</p>
                <p className="text-3xl font-semibold text-foreground">{snapshot.columnCount}</p>
                <p className="text-xs text-muted-foreground">
                  Across all tables
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/70 bg-background/80 shadow-sm">
              <CardContent className="space-y-1 px-6 py-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
                <p className="text-sm font-medium text-foreground">
                  {formatSummary(snapshot)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Generated moments ago
                </p>
              </CardContent>
            </Card>
          </div>
        </header>

        <section className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Tables</h2>
              <p className="text-sm text-muted-foreground">
                Every table exposed by your Neon schema, with column-level detail.
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
                              <td className="py-2 pr-6 font-medium text-foreground">
                                {column.name}
                              </td>
                              <td className="py-2 pr-6 text-muted-foreground">
                                {column.dataType}
                              </td>
                              <td className="py-2 pr-6 text-muted-foreground">
                                {column.nullable ? "Yes" : "No"}
                              </td>
                              <td className="py-2 pr-6 text-muted-foreground">
                                {column.defaultValue ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No columns discovered for this table.
                      </p>
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

        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-2xl font-semibold">Generated SQL preview</h2>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Read only
            </span>
          </div>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-border/70 bg-muted/40 px-6 py-5 text-sm leading-relaxed text-muted-foreground shadow-inner">
{sqlPreview}
          </pre>
        </section>
      </div>
    </div>
  );
}
