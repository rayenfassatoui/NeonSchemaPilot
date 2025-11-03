/**
 * Import API Route
 * Handles file upload and data import operations
 */

import { NextRequest, NextResponse } from "next/server";
import { FileDatabase } from "@/lib/file-db/database";
import { neon } from "@neondatabase/serverless";
import {
    parseCSV,
    parseJSON,
    parseSQL,
    validateImportData,
    generatePreview,
} from "@/lib/import-utils";
import type {
    ImportOptions,
    ImportResult,
    ParsedImportData,
    ImportPreview,
} from "@/types/import";

/**
 * POST /api/import - Import data from file
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const optionsJson = formData.get("options") as string;
    const connectionString = formData.get("connectionString") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const options: ImportOptions = JSON.parse(optionsJson || "{}");

    // Validate options
    if (!options.format || !["csv", "json", "sql"].includes(options.format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be csv, json, or sql" },
        { status: 400 }
      );
    }

    if (!options.mode || !["create", "append", "replace"].includes(options.mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be create, append, or replace" },
        { status: 400 }
      );
    }

    if (!options.targetTable) {
      return NextResponse.json(
        { error: "Target table name is required" },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Parse file based on format
    let parsed: ParsedImportData;
    
    try {
      switch (options.format) {
        case "csv":
          parsed = parseCSV(content, {
            delimiter: options.delimiter || ",",
            hasHeader: options.hasHeader !== false,
          });
          break;
        case "json":
          parsed = parseJSON(content);
          break;
        case "sql":
          parsed = parseSQL(content);
          break;
        default:
          throw new Error("Unsupported format");
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: `Failed to parse ${options.format.toUpperCase()} file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
        { status: 400 }
      );
    }

    // Override table name with target table
    parsed.tableName = options.targetTable;

    // Validate parsed data
    if (options.validateSchema) {
      const validation = validateImportData(parsed);
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: validation.errors,
          },
          { status: 400 }
        );
      }
    }

    // Import data
    let result: ImportResult;
    
    if (connectionString) {
      result = await importToNeon(connectionString, parsed, options);
    } else {
      result = await importToFileDB(parsed, options);
    }

    result.executionTimeMs = Date.now() - startTime;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      {
        error: "Import failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/import/preview - Preview import without executing
 */
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const format = formData.get("format") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const content = await file.text();
    let parsed: ParsedImportData;

    switch (format) {
      case "csv":
        parsed = parseCSV(content, { hasHeader: true });
        break;
      case "json":
        parsed = parseJSON(content);
        break;
      case "sql":
        parsed = parseSQL(content);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid format" },
          { status: 400 }
        );
    }

    const preview: ImportPreview = generatePreview(parsed);
    const validation = validateImportData(parsed);

    return NextResponse.json({
      preview,
      validation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Preview failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

/**
 * Import to File-based Database
 */
async function importToFileDB(
  parsed: ParsedImportData,
  options: ImportOptions
): Promise<ImportResult> {
  const db = new FileDatabase("./data/database.json");
  await db.load();
  
  const errors: Array<{ row: number; error: string }> = [];
  let rowsImported = 0;
  let rowsSkipped = 0;

  try {
    // Check if table exists - try to select from it
    let tableExists = false;
    try {
      await db.executeOperation({
        type: "dql.select",
        table: parsed.tableName,
        columns: ["id"],
        limit: 1,
      });
      tableExists = true;
    } catch {
      tableExists = false;
    }

    if (options.mode === "create" && tableExists) {
      throw new Error(`Table '${parsed.tableName}' already exists`);
    }

    if (options.mode === "append" && !tableExists) {
      if (options.createTableIfNotExists) {
        // Create table with inferred schema
        const columns = parsed.columns.map(col => ({
          name: col,
          dataType: parsed.inferredTypes?.[col] || "TEXT",
        }));
        
        await db.executeOperation({
          type: "ddl.create_table",
          table: parsed.tableName,
          columns,
        });
      } else {
        throw new Error(`Table '${parsed.tableName}' does not exist`);
      }
    }

    if (options.mode === "replace") {
      if (tableExists) {
        await db.executeOperation({
          type: "ddl.drop_table",
          table: parsed.tableName,
        });
      }
      
      const columns = parsed.columns.map(col => ({
        name: col,
        dataType: parsed.inferredTypes?.[col] || "TEXT",
      }));
      
      await db.executeOperation({
        type: "ddl.create_table",
        table: parsed.tableName,
        columns,
      });
    }

    if (options.mode === "create") {
      const columns = parsed.columns.map(col => ({
        name: col,
        dataType: parsed.inferredTypes?.[col] || "TEXT",
      }));
      
      await db.executeOperation({
        type: "ddl.create_table",
        table: parsed.tableName,
        columns,
      });
    }

    // Truncate if requested
    if (options.truncateBeforeImport && tableExists) {
      const selectResult = await db.executeOperation({
        type: "dql.select",
        table: parsed.tableName,
        columns: ["id"],
      });
      
      if (selectResult.status === "success" && selectResult.resultSet?.rows) {
        for (const row of selectResult.resultSet.rows) {
          await db.executeOperation({
            type: "dml.delete",
            table: parsed.tableName,
            criteria: [{ column: "id", operator: "eq", value: row.id }],
          });
        }
      }
    }

    // Insert rows
    for (let i = 0; i < parsed.rows.length; i++) {
      try {
        await db.executeOperation({
          type: "dml.insert",
          table: parsed.tableName,
          rows: [parsed.rows[i]],
        });
        rowsImported++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push({ row: i + 1, error: errorMsg });
        rowsSkipped++;
        
        if (!options.skipErrors) {
          throw new Error(`Row ${i + 1}: ${errorMsg}`);
        }
      }
    }

    return {
      success: true,
      tableName: parsed.tableName,
      rowsImported,
      rowsSkipped,
      errors,
      executionTimeMs: 0,
      message: `Successfully imported ${rowsImported} rows into '${parsed.tableName}'`,
    };
  } catch (error) {
    return {
      success: false,
      tableName: parsed.tableName,
      rowsImported,
      rowsSkipped,
      errors: [
        ...errors,
        { row: 0, error: error instanceof Error ? error.message : "Unknown error" },
      ],
      executionTimeMs: 0,
      message: error instanceof Error ? error.message : "Import failed",
    };
  }
}

/**
 * Import to Neon PostgreSQL
 */
async function importToNeon(
  connectionString: string,
  parsed: ParsedImportData,
  options: ImportOptions
): Promise<ImportResult> {
  const sql = neon(connectionString);
  const errors: Array<{ row: number; error: string }> = [];
  let rowsImported = 0;
  let rowsSkipped = 0;

  try {
    // Check if table exists
    const tableCheckResult = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = ${parsed.tableName}
      ) as exists
    `;
    const tableExists = tableCheckResult[0]?.exists || false;

    if (options.mode === "create" && tableExists) {
      throw new Error(`Table '${parsed.tableName}' already exists`);
    }

    if (options.mode === "append" && !tableExists) {
      if (options.createTableIfNotExists) {
        // Create table - exclude 'id' column as it will be auto-generated
        const columnDefs = parsed.columns
          .filter((col) => col.toLowerCase() !== "id")
          .map((col) => {
            const type = mapTypeToPostgres(parsed.inferredTypes?.[col] || "TEXT");
            return `"${col}" ${type}`;
          })
          .join(", ");

        await sql.query(`CREATE TABLE "${parsed.tableName}" (id SERIAL PRIMARY KEY, ${columnDefs})`);
      } else {
        throw new Error(`Table '${parsed.tableName}' does not exist`);
      }
    }

    if (options.mode === "replace") {
      if (tableExists) {
        await sql.query(`DROP TABLE "${parsed.tableName}"`);
      }
      
      // Create table - exclude 'id' column as it will be auto-generated
      const columnDefs = parsed.columns
        .filter((col) => col.toLowerCase() !== "id")
        .map((col) => {
          const type = mapTypeToPostgres(parsed.inferredTypes?.[col] || "TEXT");
          return `"${col}" ${type}`;
        })
        .join(", ");

      await sql.query(`CREATE TABLE "${parsed.tableName}" (id SERIAL PRIMARY KEY, ${columnDefs})`);
    }

    if (options.mode === "create") {
      // Create table - exclude 'id' column as it will be auto-generated
      const columnDefs = parsed.columns
        .filter((col) => col.toLowerCase() !== "id")
        .map((col) => {
          const type = mapTypeToPostgres(parsed.inferredTypes?.[col] || "TEXT");
          return `"${col}" ${type}`;
        })
        .join(", ");

      await sql.query(`CREATE TABLE "${parsed.tableName}" (id SERIAL PRIMARY KEY, ${columnDefs})`);
    }

    // Truncate if requested
    if (options.truncateBeforeImport && tableExists) {
      await sql.query(`TRUNCATE TABLE "${parsed.tableName}"`);
    }

    // Insert rows - exclude 'id' column to let PostgreSQL auto-generate it
    for (let i = 0; i < parsed.rows.length; i++) {
      try {
        const row = parsed.rows[i];
        // Filter out 'id' column from the row data
        const columns = Object.keys(row).filter((col) => col.toLowerCase() !== "id");
        const values = columns.map((col) => row[col]);
        
        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(", ");
        const columnsList = columns.map((col) => `"${col}"`).join(", ");
        
        const query = `INSERT INTO "${parsed.tableName}" (${columnsList}) VALUES (${placeholders})`;
        await sql.query(query, values);
        
        rowsImported++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push({ row: i + 1, error: errorMsg });
        rowsSkipped++;
        
        if (!options.skipErrors) {
          throw new Error(`Row ${i + 1}: ${errorMsg}`);
        }
      }
    }

    return {
      success: true,
      tableName: parsed.tableName,
      rowsImported,
      rowsSkipped,
      errors,
      executionTimeMs: 0,
      message: `Successfully imported ${rowsImported} rows into '${parsed.tableName}'`,
    };
  } catch (error) {
    return {
      success: false,
      tableName: parsed.tableName,
      rowsImported,
      rowsSkipped,
      errors: [
        ...errors,
        { row: 0, error: error instanceof Error ? error.message : "Unknown error" },
      ],
      executionTimeMs: 0,
      message: error instanceof Error ? error.message : "Import failed",
    };
  }
}

/**
 * Map generic types to PostgreSQL types
 */
function mapTypeToPostgres(type: string): string {
  const mapping: Record<string, string> = {
    TEXT: "TEXT",
    INTEGER: "INTEGER",
    REAL: "NUMERIC",
    BOOLEAN: "BOOLEAN",
    TIMESTAMP: "TIMESTAMP",
  };

  return mapping[type] || "TEXT";
}
