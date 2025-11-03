/**
 * Import Data Types
 * Defines types for importing data from CSV, JSON, and SQL files
 */

export type ImportFormat = "csv" | "json" | "sql";

export type ImportMode = "create" | "append" | "replace";

export interface ImportOptions {
  format: ImportFormat;
  mode: ImportMode;
  targetTable: string;
  createTableIfNotExists?: boolean;
  truncateBeforeImport?: boolean;
  skipErrors?: boolean;
  validateSchema?: boolean;
  delimiter?: string; // For CSV
  hasHeader?: boolean; // For CSV
  encoding?: string;
}

export interface ImportResult {
  success: boolean;
  tableName: string;
  rowsImported: number;
  rowsSkipped: number;
  errors: ImportError[];
  executionTimeMs: number;
  message?: string;
}

export interface ImportError {
  row: number;
  column?: string;
  error: string;
  value?: any;
}

export interface ParsedImportData {
  tableName: string;
  columns: string[];
  rows: any[];
  inferredTypes?: Record<string, string>;
}

export interface CSVParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
  skipEmptyLines?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportPreview {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    sampleValues: any[];
  }>;
  rowCount: number;
  previewRows: any[];
  warnings: string[];
}
