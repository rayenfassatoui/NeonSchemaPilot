/**
 * Database Backup API Route
 * Handles backup creation and download
 */

import { NextRequest, NextResponse } from "next/server";
import { FileDatabase } from "@/lib/file-db/database";
import { createBackupFromFileDB, generateBackupPreview } from "@/lib/backup-utils";
import type { BackupOptions } from "@/types/backup";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

/**
 * GET - Generate backup preview
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const encodedConnectionString = searchParams.get("connectionString");
    const format = (searchParams.get("format") || "sql") as any;

    let tables: Array<{ name: string; rowCount: number; columnCount: number }> = [];

    if (encodedConnectionString) {
      // Neon database preview
      const connectionString = decodeURIComponent(encodedConnectionString);
      const sql = neon(connectionString);

      const tablesResult = await sql`
        SELECT 
          table_name as name,
          (SELECT count(*) FROM information_schema.columns 
           WHERE table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;

      tables = tablesResult.map((t: any) => ({
        name: t.name,
        columnCount: Number(t.column_count) || 0,
        rowCount: 0, // Estimate or skip for preview
      }));
    } else {
      // File database preview
      const db = new FileDatabase("./data/database.json");
      await db.load();
      const summary = db.getSummary();

      tables = summary.tables.map((t) => ({
        name: t.name,
        columnCount: t.columnCount,
        rowCount: t.rowCount,
      }));
    }

    const preview = generateBackupPreview(tables, format);

    return NextResponse.json(preview);
  } catch (error) {
    console.error("Error generating backup preview:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate preview" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create and download backup
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const options: BackupOptions = body.options;
    const encodedConnectionString = body.connectionString;

    let backupData: string;
    let metadata: any;

    if (encodedConnectionString) {
      // Backup Neon database
      const connectionString = decodeURIComponent(encodedConnectionString);
      const sql = neon(connectionString);

      // Fetch schema and data from Neon
      const tablesResult = await sql`
        SELECT table_name as name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;

      // Build a database state structure similar to FileDatabase
      const dbState: any = {
        meta: {
          name: options.name,
          createdAt: new Date().toISOString(),
        },
        tables: {},
      };

      for (const table of tablesResult) {
        const tableName = table.name;

        // Validate table name to prevent SQL injection (only alphanumeric, underscore, and dollar sign)
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(tableName)) {
          console.warn(`Skipping table with invalid name: ${tableName}`);
          continue;
        }

        // Get columns - using parameterized query for safety
        const columnsResult = await sql`
          SELECT column_name as name, data_type as type, is_nullable
          FROM information_schema.columns
          WHERE table_name = ${tableName} AND table_schema = 'public'
        `;

        // Get data if needed
        let rows: any[] = [];
        if (options.includeData) {
          try {
            // Create a template string array to use with tagged template
            // This is a workaround to dynamically construct the query
            const query = `SELECT * FROM "${tableName}"`;
            const templateArray = Object.assign([query], { raw: [query] }) as TemplateStringsArray;
            const dataResult = await sql(templateArray);
            
            console.log(`Raw dataResult for ${tableName}:`, typeof dataResult, Array.isArray(dataResult), dataResult?.length);
            
            // The neon client returns results as an array directly
            rows = Array.isArray(dataResult) ? dataResult : [];
            
            console.log(`Fetched ${rows.length} rows from table ${tableName}`);
          } catch (err) {
            console.error(`Failed to fetch data for table ${tableName}:`, err);
            rows = [];
          }
        }

        dbState.tables[tableName] = {
          columns: columnsResult,
          rows,
        };
      }

      const result = await createBackupFromFileDB(dbState, options);
      backupData = result.data;
      metadata = result.metadata;
    } else {
      // Backup file database
      const db = new FileDatabase("./data/database.json");
      await db.load();

      // Access internal state (this requires the database to expose it, or we read the file)
      const fs = await import("fs/promises");
      const dbContent = await fs.readFile("./data/database.json", "utf-8");
      const dbState = JSON.parse(dbContent);

      const result = await createBackupFromFileDB(dbState, options);
      backupData = result.data;
      metadata = result.metadata;
    }

    // Return backup data and metadata
    return NextResponse.json({
      success: true,
      metadata,
      data: backupData,
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create backup" },
      { status: 500 }
    );
  }
}
