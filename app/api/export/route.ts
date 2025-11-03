import { NextRequest, NextResponse } from "next/server";
import { FileDatabase } from "@/lib/file-db/database";
import { exportDatabase } from "@/lib/export-utils";
import type { ExportOptions, TableExportData } from "@/types/export";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const DB_FILE_PATH = "data/database.json";

// POST /api/export - Export database tables
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const options: ExportOptions = {
      format: body.format || "json",
      tables: body.tables || [],
      includeSchema: body.includeSchema !== false,
      includeData: body.includeData !== false,
      pretty: body.pretty !== false,
      connectionString: body.connectionString,
    };

    // Validate format
    if (!["csv", "json", "sql"].includes(options.format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be csv, json, or sql" },
        { status: 400 }
      );
    }

    // Validate tables
    if (!options.tables || options.tables.length === 0) {
      return NextResponse.json(
        { error: "No tables specified for export" },
        { status: 400 }
      );
    }

    let tableData: TableExportData[] = [];

    // Determine data source: Neon connection or file-based database
    if (options.connectionString) {
      // Export from Neon database
      tableData = await exportFromNeon(options.connectionString, options.tables);
    } else {
      // Export from file-based database
      tableData = await exportFromFileDB(options.tables);
    }

    // Generate export
    const result = exportDatabase(tableData, options);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Export failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}

async function exportFromFileDB(tableNames: string[]): Promise<TableExportData[]> {
  const db = new FileDatabase(DB_FILE_PATH);
  await db.load();
  
  const summary = db.getSummary();
  const tableData: TableExportData[] = [];

  for (const tableName of tableNames) {
    const tableInfo = summary.tables.find(t => t.name === tableName);
    if (!tableInfo) {
      throw new Error(`Table "${tableName}" not found`);
    }

    // Get table data by executing a SELECT operation
    const selectResult = await db.executeOperation({
      type: "dql.select",
      table: tableName,
      columns: tableInfo.columns.map(c => c.name),
    });

    const rows = selectResult.resultSet?.rows || [];

    tableData.push({
      tableName,
      columns: tableInfo.columns.map(col => ({
        name: col.name,
        dataType: col.dataType,
        nullable: col.nullable,
        defaultValue: col.defaultValue,
        isPrimaryKey: col.isPrimaryKey,
      })),
      rows,
    });
  }

  return tableData;
}

async function exportFromNeon(connectionString: string, tableNames: string[]): Promise<TableExportData[]> {
  const sql = neon(connectionString, { fullResults: true });
  const tableData: TableExportData[] = [];

  for (const tableName of tableNames) {
    // Validate table name for safety
    if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    // Get column information
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = $1
              AND tc.constraint_type = 'PRIMARY KEY'
              AND kcu.column_name = c.column_name
          ) THEN true 
          ELSE false 
        END as is_primary_key
      FROM information_schema.columns c
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await sql.query(columnsQuery, [tableName]);

    // Get table data
    const dataQuery = `SELECT * FROM "${tableName}"`;
    const dataResult = await sql.query(dataQuery);

    tableData.push({
      tableName,
      columns: (columnsResult.rows as any[]).map((col: any) => ({
        name: col.column_name,
        dataType: col.data_type,
        nullable: col.is_nullable === "YES",
        defaultValue: col.column_default,
        isPrimaryKey: col.is_primary_key,
      })),
      rows: dataResult.rows as Array<Record<string, unknown>>,
    });
  }

  return tableData;
}
