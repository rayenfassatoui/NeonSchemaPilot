import { Buffer } from "node:buffer";

import { NextRequest, NextResponse } from "next/server";

import { neon } from "@neondatabase/serverless";

import { isValidConnectionString } from "@/lib/neon";

interface TableDataRequestBody {
  connectionParam?: string;
  connectionString?: string;
  schema?: string;
  table?: string;
  limit?: number;
}

function decodeConnection(param?: string) {
  if (!param) return null;
  try {
    return Buffer.from(param, "base64").toString("utf8").trim();
  } catch (error) {
    console.error("Failed to decode connection parameter", error);
    return null;
  }
}

function isSafeIdentifier(value?: string) {
  if (!value) return false;
  return /^[A-Za-z0-9_]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TableDataRequestBody;
    const resolvedConnection = body.connectionString?.trim() ?? decodeConnection(body.connectionParam);

    if (!resolvedConnection) {
      return NextResponse.json({ error: "Missing connection information." }, { status: 400 });
    }

    if (!isValidConnectionString(resolvedConnection)) {
      return NextResponse.json({ error: "Please provide a valid Postgres connection string." }, { status: 400 });
    }

    const schema = body.schema?.trim();
    const table = body.table?.trim();

    if (!isSafeIdentifier(schema) || !isSafeIdentifier(table)) {
      return NextResponse.json({ error: "Invalid schema or table name." }, { status: 400 });
    }

    const limit = Math.min(Math.max(body.limit ?? 20, 1), 100);

    const sql = neon(resolvedConnection, { fullResults: true });
    const query = `select * from "${schema}"."${table}" limit $1`;

    console.log("[table-data] executing", { schema, table, limit });

    const result = await sql.query(query, [limit]);
    console.log("[table-data] raw result", {
      keys: Object.keys(result ?? {}),
      rowCount: result?.rowCount ?? null,
      hasRows: Array.isArray(result?.rows),
      hasFields: Array.isArray(result?.fields),
    });

    const rows = Array.isArray(result.rows)
      ? result.rows.map((row) =>
          row && typeof row === "object" && !Array.isArray(row)
            ? Object.fromEntries(Object.entries(row))
            : { value: row }
        )
      : [];

    const columns = Array.isArray(result.fields)
      ? result.fields.map((field) => field.name)
      : rows.length && typeof rows[0] === "object"
        ? Object.keys(rows[0] as Record<string, unknown>)
        : [];

    const rowCount = typeof result.rowCount === "number" ? result.rowCount : rows.length;

    console.log("[table-data] normalized result", {
      schema,
      table,
      limit,
      rowCount,
      columnCount: columns.length,
      sampleRow: rows[0] ?? null,
    });

    return NextResponse.json(
      {
        rows,
        columns,
        rowCount,
        limit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch table data", error);

    const message =
      error instanceof Error && error.message ? error.message : "Unable to fetch table data.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
