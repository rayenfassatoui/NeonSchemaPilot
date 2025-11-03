/**
 * Database Import Page
 * Full-page interface for importing data from files
 */

import { Buffer } from "node:buffer";
import { Suspense } from "react";
import { loadDatabaseContext } from "../_lib/context";
import { DatabaseImportPanel } from "@/components/database-import-panel";
import { DatabaseErrorState } from "../_components/database-error-state";
import { DatabaseSummaryHeader } from "../_components/database-summary-header";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ImportPageProps = {
  searchParams: Promise<{
    connection?: string;
  }>;
};

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const context = await loadDatabaseContext(searchParams);

  if (context.status === "error") {
    return <DatabaseErrorState message={context.message} />;
  }

  const { snapshot, connectionMeta, connectionParam } = context.data;

  // Decode connection string for imports
  let connectionString: string | undefined;
  if (connectionParam) {
    try {
      connectionString = Buffer.from(connectionParam, "base64").toString("utf8").trim();
    } catch (error) {
      console.error("Failed to decode connection string", error);
    }
  }

  const tableNames = snapshot.tables.map((t) => t.name);

  return (
    <div className="container max-w-full mx-auto py-8">
      <div className="space-y-6">
        <DatabaseSummaryHeader
          connectionMeta={connectionMeta}
          snapshot={snapshot}
          headline="Import Data"
          description="Upload CSV, JSON, or SQL files to import data into your database"
        />

        <Suspense fallback={<div className="animate-pulse bg-muted h-96 rounded-lg" />}>
          <DatabaseImportPanel
            connectionString={connectionString}
            existingTables={tableNames}
          />
        </Suspense>
      </div>
    </div>
  );
}
