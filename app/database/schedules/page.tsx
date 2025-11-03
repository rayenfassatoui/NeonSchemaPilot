/**
 * Scheduled Queries Page
 * Manage scheduled query operations
 */

import { Buffer } from "node:buffer";
import { Suspense } from "react";
import { loadDatabaseContext } from "../_lib/context";
import { ScheduleManager } from "@/components/schedule-manager";
import { DatabaseErrorState } from "../_components/database-error-state";
import { DatabaseSummaryHeader } from "../_components/database-summary-header";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SchedulePageProps = {
  searchParams: Promise<{
    connection?: string;
  }>;
};

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const context = await loadDatabaseContext(searchParams);

  if (context.status === "error") {
    return <DatabaseErrorState message={context.message} />;
  }

  const { snapshot, connectionMeta, connectionParam } = context.data;

  // Decode connection string
  let connectionString: string | undefined;
  if (connectionParam) {
    try {
      connectionString = Buffer.from(connectionParam, "base64").toString("utf8").trim();
    } catch (error) {
      console.error("Failed to decode connection string", error);
    }
  }

  return (
    <div className="container max-w-full mx-auto py-8">
      <div className="space-y-6">
        <DatabaseSummaryHeader
          connectionMeta={connectionMeta}
          snapshot={snapshot}
          headline="Scheduled Queries"
          description="Automate query execution with scheduled jobs"
        />

        <Suspense fallback={<div className="animate-pulse bg-muted h-96 rounded-lg" />}>
          <ScheduleManager connectionString={connectionString} />
        </Suspense>
      </div>
    </div>
  );
}
