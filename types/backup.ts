/**
 * Database Backup and Restore Types
 */

export type BackupFormat = "sql" | "json" | "csv";

export type BackupStatus = "pending" | "in-progress" | "completed" | "failed";

export interface BackupMetadata {
  id: string;
  name: string;
  description?: string;
  format: BackupFormat;
  size: number; // in bytes
  tableCount: number;
  rowCount: number;
  createdAt: string;
  status: BackupStatus;
  error?: string;
}

export interface BackupOptions {
  name: string;
  description?: string;
  format: BackupFormat;
  tables?: string[]; // If empty, backup all tables
  includeSchema: boolean;
  includeData: boolean;
  compress?: boolean;
}

export interface RestoreOptions {
  backupId: string;
  mode: "replace" | "append" | "skip-existing";
  tables?: string[]; // If empty, restore all tables
  validateOnly?: boolean;
}

export interface RestoreResult {
  success: boolean;
  tablesRestored: number;
  rowsRestored: number;
  errors: string[];
  warnings: string[];
  duration: number; // in milliseconds
}

export interface BackupPreview {
  tables: Array<{
    name: string;
    rowCount: number;
    columnCount: number;
    estimatedSize: number;
  }>;
  totalSize: number;
  estimatedDuration: number; // in seconds
}
