import { Buffer } from "node:buffer";

import { redirect } from "next/navigation";

import { describeDatabase, isValidConnectionString } from "@/lib/neon";
import type { DescribeResponse } from "@/types/neon";

export type DatabaseConnectionMeta = {
  host: string;
  database: string;
  user: string;
};

export type DatabaseContextSuccess = {
  snapshot: DescribeResponse["snapshot"];
  sqlPreview: string;
  connectionMeta: DatabaseConnectionMeta;
  connectionParam: string;
};

export type DatabaseContextResult =
  | { status: "success"; data: DatabaseContextSuccess }
  | { status: "error"; message: string };

type DatabaseSearchParams = Promise<{
  connection?: string;
}>;

function decodeConnection(connection?: string) {
  if (!connection) return null;
  try {
    return Buffer.from(connection, "base64").toString("utf8").trim();
  } catch (error) {
    console.error("Failed to decode connection string", error);
    return null;
  }
}

function buildConnectionMeta(decoded: string): DatabaseConnectionMeta {
  try {
    const url = new URL(decoded);
    return {
      host: url.hostname,
      database: url.pathname.replace(/^\/+/, "") || "—",
      user: url.username || "—",
    };
  } catch (error) {
    console.error("Failed to parse connection string", error);
    return {
      host: "unknown",
      database: "—",
      user: "—",
    };
  }
}

export function formatSnapshotSummary(snapshot: DescribeResponse["snapshot"]) {
  const tableText = snapshot.tableCount === 1 ? "table" : "tables";
  const columnText = snapshot.columnCount === 1 ? "column" : "columns";
  const relationText = snapshot.relations.length === 1 ? "relation" : "relations";
  return `${snapshot.tableCount} ${tableText} · ${snapshot.columnCount} ${columnText} · ${snapshot.relations.length} ${relationText}`;
}

export async function loadDatabaseContext(
  searchParams: DatabaseSearchParams
): Promise<DatabaseContextResult> {
  const { connection } = await searchParams;
  const decoded = decodeConnection(connection);

  if (!decoded || !isValidConnectionString(decoded)) {
    redirect("/?error=invalid-connection");
  }

  const connectionMeta = buildConnectionMeta(decoded);

  try {
    const payload = await describeDatabase(decoded);

    if (!payload) {
      return {
        status: "error",
        message: "We couldn't reach that database.",
      };
    }

    return {
      status: "success",
      data: {
        snapshot: payload.snapshot,
        sqlPreview: payload.sqlPreview,
        connectionMeta,
        connectionParam: connection ?? Buffer.from(decoded).toString("base64"),
      },
    };
  } catch (error) {
    console.error("Failed to describe database", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "We couldn't reach that database.";

    return {
      status: "error",
      message,
    };
  }
}
