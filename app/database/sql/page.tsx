import { DatabaseErrorState } from "../_components/database-error-state";
import { DatabaseSummaryHeader } from "../_components/database-summary-header";
import { loadDatabaseContext } from "../_lib/context";
import { CopySqlButton } from "@/components/sql-copy-button";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SqlViewPageProps = {
  searchParams: Promise<{
    connection?: string;
  }>;
};

export default async function SqlViewPage({ searchParams }: SqlViewPageProps) {
  const context = await loadDatabaseContext(searchParams);

  if (context.status === "error") {
    return <DatabaseErrorState message={context.message} />;
  }

  const { snapshot, connectionMeta, sqlPreview } = context.data;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16">
        <DatabaseSummaryHeader
          connectionMeta={connectionMeta}
          snapshot={snapshot}
          accent="SQL snapshot"
          headline="Generated SQL preview"
          description="Review the assembled SQL needed to reproduce your schema. Copy it into migrations, documentation, or onboarding wikis."
        />

        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">Snapshot file</h2>
              <p className="text-sm text-muted-foreground">
                Read-only text. Copy, download, or share as needed—no credentials embedded.
              </p>
            </div>
            <CopySqlButton content={sqlPreview} />
          </div>
          <pre className="max-h-[540px] overflow-auto whitespace-pre-wrap rounded-2xl border border-border/70 bg-muted/30 px-6 py-5 text-sm leading-relaxed text-muted-foreground shadow-inner">
{sqlPreview}
          </pre>
        </section>
      </div>
    </div>
  );
}
