import type { ExportOptions, ExportResult, TableExportData } from "@/types/export";

/**
 * Export data to CSV format
 */
export function exportToCSV(data: TableExportData[], options: ExportOptions): ExportResult {
  try {
    let content = "";

    for (const table of data) {
      if (data.length > 1) {
        content += `# Table: ${table.tableName}\n`;
      }

      if (table.rows.length === 0) {
        content += "# No data\n\n";
        continue;
      }

      // Header row
      const columns = Object.keys(table.rows[0]);
      content += columns.map(col => escapeCSV(col)).join(",") + "\n";

      // Data rows
      for (const row of table.rows) {
        const values = columns.map(col => {
          const value = row[col];
          return escapeCSV(formatValue(value));
        });
        content += values.join(",") + "\n";
      }

      content += "\n";
    }

    const filename = generateFilename(data, "csv");
    const size = new Blob([content]).size;

    return {
      success: true,
      filename,
      content,
      mimeType: "text/csv",
      size,
    };
  } catch (error) {
    return {
      success: false,
      filename: "",
      content: "",
      mimeType: "text/csv",
      size: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: TableExportData[], options: ExportOptions): ExportResult {
  try {
    const exportData: Record<string, unknown> = {};

    if (options.includeSchema) {
      exportData.schema = data.map(table => ({
        tableName: table.tableName,
        columns: table.columns,
      }));
    }

    if (options.includeData !== false) {
      exportData.data = data.length === 1
        ? { [data[0].tableName]: data[0].rows }
        : Object.fromEntries(data.map(table => [table.tableName, table.rows]));
    }

    const content = options.pretty
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);

    const filename = generateFilename(data, "json");
    const size = new Blob([content]).size;

    return {
      success: true,
      filename,
      content,
      mimeType: "application/json",
      size,
    };
  } catch (error) {
    return {
      success: false,
      filename: "",
      content: "",
      mimeType: "application/json",
      size: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Export data to SQL format
 */
export function exportToSQL(data: TableExportData[], options: ExportOptions): ExportResult {
  try {
    let content = "";
    content += "-- Database Export\n";
    content += `-- Generated on: ${new Date().toISOString()}\n`;
    content += `-- Tables: ${data.map(t => t.tableName).join(", ")}\n\n`;

    for (const table of data) {
      // CREATE TABLE statement
      if (options.includeSchema !== false) {
        content += `-- Table: ${table.tableName}\n`;
        content += `CREATE TABLE IF NOT EXISTS ${escapeIdentifier(table.tableName)} (\n`;

        const columnDefs = table.columns.map(col => {
          let def = `  ${escapeIdentifier(col.name)} ${col.dataType}`;
          
          if (col.isPrimaryKey) {
            def += " PRIMARY KEY";
          }
          
          if (col.nullable === false) {
            def += " NOT NULL";
          }
          
          if (col.defaultValue !== undefined && col.defaultValue !== null) {
            def += ` DEFAULT ${formatSQLValue(col.defaultValue)}`;
          }
          
          return def;
        });

        content += columnDefs.join(",\n");
        content += "\n);\n\n";
      }

      // INSERT statements
      if (options.includeData !== false && table.rows.length > 0) {
        content += `-- Data for table: ${table.tableName}\n`;

        const columns = Object.keys(table.rows[0]);
        const columnList = columns.map(col => escapeIdentifier(col)).join(", ");

        for (const row of table.rows) {
          const values = columns.map(col => formatSQLValue(row[col])).join(", ");
          content += `INSERT INTO ${escapeIdentifier(table.tableName)} (${columnList}) VALUES (${values});\n`;
        }

        content += "\n";
      }
    }

    const filename = generateFilename(data, "sql");
    const size = new Blob([content]).size;

    return {
      success: true,
      filename,
      content,
      mimeType: "application/sql",
      size,
    };
  } catch (error) {
    return {
      success: false,
      filename: "",
      content: "",
      mimeType: "application/sql",
      size: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main export function that delegates to format-specific exporters
 */
export function exportDatabase(data: TableExportData[], options: ExportOptions): ExportResult {
  switch (options.format) {
    case "csv":
      return exportToCSV(data, options);
    case "json":
      return exportToJSON(data, options);
    case "sql":
      return exportToSQL(data, options);
    default:
      return {
        success: false,
        filename: "",
        content: "",
        mimeType: "text/plain",
        size: 0,
        error: `Unsupported export format: ${options.format}`,
      };
  }
}

// Helper functions

function escapeCSV(value: string): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeIdentifier(identifier: string): string {
  // Simple escaping - wrap in double quotes if needed
  if (/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    return identifier;
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatSQLValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") {
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateFilename(data: TableExportData[], extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  
  if (data.length === 1) {
    return `${data[0].tableName}_${timestamp}.${extension}`;
  }
  
  return `database_export_${timestamp}.${extension}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
