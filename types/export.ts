export type ExportFormat = "csv" | "json" | "sql";

export interface ExportOptions {
  format: ExportFormat;
  tables: string[];
  includeSchema?: boolean;
  includeData?: boolean;
  pretty?: boolean;
  connectionString?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  content: string;
  mimeType: string;
  size: number;
  error?: string;
}

export interface TableExportData {
  tableName: string;
  columns: Array<{
    name: string;
    dataType: string;
    nullable?: boolean;
    defaultValue?: unknown;
    isPrimaryKey?: boolean;
  }>;
  rows: Array<Record<string, unknown>>;
}

export interface ExportProgress {
  total: number;
  current: number;
  tableName?: string;
  status: "preparing" | "exporting" | "complete" | "error";
}
