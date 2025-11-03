/**
 * Database Backup Utilities
 * Functions for creating and managing database backups
 */

import type { BackupFormat, BackupMetadata, BackupOptions, BackupPreview } from "@/types/backup";

/**
 * Generate backup preview with estimated size and duration
 */
export function generateBackupPreview(
  tables: Array<{ name: string; rowCount: number; columnCount: number }>,
  format: BackupFormat
): BackupPreview {
  const tableDetails = tables.map((table) => {
    // Estimate size based on format
    let bytesPerRow = table.columnCount * 50; // Average 50 bytes per column
    if (format === "json") bytesPerRow *= 1.5; // JSON is more verbose
    if (format === "sql") bytesPerRow *= 2; // SQL INSERT statements are verbose

    return {
      name: table.name,
      rowCount: table.rowCount,
      columnCount: table.columnCount,
      estimatedSize: bytesPerRow * table.rowCount,
    };
  });

  const totalSize = tableDetails.reduce((sum, t) => sum + t.estimatedSize, 0);
  const estimatedDuration = Math.ceil(totalSize / 1000000); // ~1 second per MB

  return {
    tables: tableDetails,
    totalSize,
    estimatedDuration,
  };
}

/**
 * Create backup from file database
 */
export async function createBackupFromFileDB(
  dbState: any, // DatabaseFile from file-db/types.ts
  options: BackupOptions
): Promise<{ data: string; metadata: BackupMetadata }> {
  const allTables = Object.keys(dbState.tables);
  const tablesToBackup = options.tables && options.tables.length > 0 ? options.tables : allTables;

  let backupData = "";
  let totalRows = 0;

  if (options.format === "sql") {
    backupData = generateSQLBackup(dbState, tablesToBackup, options);
  } else if (options.format === "json") {
    backupData = generateJSONBackup(dbState, tablesToBackup, options);
  } else if (options.format === "csv") {
    backupData = generateCSVBackup(dbState, tablesToBackup, options);
  }

  // Count total rows
  for (const tableName of tablesToBackup) {
    const table = dbState.tables[tableName];
    if (table && table.rows) {
      totalRows += table.rows.length;
    }
  }

  const metadata: BackupMetadata = {
    id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: options.name,
    description: options.description,
    format: options.format,
    size: new Blob([backupData]).size,
    tableCount: tablesToBackup.length,
    rowCount: totalRows,
    createdAt: new Date().toISOString(),
    status: "completed",
  };

  return { data: backupData, metadata };
}

/**
 * Generate SQL backup
 */
function generateSQLBackup(dbState: any, tables: string[], options: BackupOptions): string {
  let sql = `-- Database Backup: ${options.name}\n`;
  sql += `-- Created: ${new Date().toISOString()}\n`;
  sql += `-- Format: SQL\n\n`;

  for (const tableName of tables) {
    const table = dbState.tables[tableName];
    if (!table) continue;

    if (options.includeSchema && table.columns) {
      sql += `-- Table: ${tableName}\n`;
      sql += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
      sql += `CREATE TABLE "${tableName}" (\n`;

      const columns = table.columns.map((col: any) => {
        let def = `  "${col.name}" ${col.type}`;
        if (col.isPrimaryKey) def += " PRIMARY KEY";
        if (col.isNullable === false) def += " NOT NULL";
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        return def;
      });

      sql += columns.join(",\n");
      sql += "\n);\n\n";
    }

    if (options.includeData && table.rows && table.rows.length > 0) {
      sql += `-- Data for table: ${tableName}\n`;

      for (const row of table.rows) {
        const columns = Object.keys(row).filter((k) => k !== "id" || !options.includeSchema);
        const values = columns.map((col) => {
          const val = row[col];
          if (val === null) return "NULL";
          if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
          return val;
        });

        sql += `INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});\n`;
      }
      sql += "\n";
    }
  }

  return sql;
}

/**
 * Generate JSON backup
 */
function generateJSONBackup(dbState: any, tables: string[], options: BackupOptions): string {
  const backup: any = {
    metadata: {
      name: options.name,
      description: options.description,
      createdAt: new Date().toISOString(),
      format: "json",
      version: "1.0",
    },
    tables: {},
  };

  for (const tableName of tables) {
    const table = dbState.tables[tableName];
    if (!table) continue;

    backup.tables[tableName] = {
      schema: options.includeSchema ? { columns: table.columns } : undefined,
      data: options.includeData ? table.rows || [] : [],
    };
  }

  return JSON.stringify(backup, null, 2);
}

/**
 * Generate CSV backup (one file per table, concatenated)
 */
function generateCSVBackup(dbState: any, tables: string[], options: BackupOptions): string {
  let csv = "";

  for (const tableName of tables) {
    const table = dbState.tables[tableName];
    if (!table || !table.rows || table.rows.length === 0) continue;

    csv += `# Table: ${tableName}\n`;

    // Header
    const columns = Object.keys(table.rows[0]);
    csv += columns.join(",") + "\n";

    // Data
    for (const row of table.rows) {
      const values = columns.map((col) => {
        const val = row[col];
        if (val === null) return "";
        if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
        return val;
      });
      csv += values.join(",") + "\n";
    }

    csv += "\n";
  }

  return csv;
}

/**
 * Validate backup file
 */
export function validateBackup(content: string, format: BackupFormat): { valid: boolean; error?: string } {
  try {
    if (format === "json") {
      const parsed = JSON.parse(content);
      if (!parsed.tables || typeof parsed.tables !== "object") {
        return { valid: false, error: "Invalid backup format: missing tables" };
      }
    } else if (format === "sql") {
      if (!content.includes("CREATE TABLE") && !content.includes("INSERT INTO")) {
        return { valid: false, error: "Invalid SQL backup: no CREATE TABLE or INSERT statements found" };
      }
    } else if (format === "csv") {
      if (!content.includes(",")) {
        return { valid: false, error: "Invalid CSV backup: no comma-separated values found" };
      }
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Unknown validation error" };
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
