/**
 * Import Utilities
 * Functions for parsing and importing data from various file formats
 */

import type {
    CSVParseOptions,
    ParsedImportData,
    ImportPreview,
    ValidationResult,
} from "@/types/import";

/**
 * Parse CSV content into structured data
 */
export function parseCSV(
  content: string,
  options: CSVParseOptions = {}
): ParsedImportData {
  const {
    delimiter = ",",
    hasHeader = true,
    skipEmptyLines = true,
  } = options;

  const lines = content.split(/\r?\n/).filter((line) => {
    return !skipEmptyLines || line.trim().length > 0;
  });

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Parse header row
  const headerLine = lines[0];
  const columns = parseCSVLine(headerLine, delimiter);

  if (!hasHeader) {
    // Generate column names if no header
    columns.forEach((_, i) => {
      columns[i] = `column_${i + 1}`;
    });
  }

  // Parse data rows
  const startRow = hasHeader ? 1 : 0;
  const rows: any[] = [];

  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line, delimiter);
    const row: any = {};

    columns.forEach((col, idx) => {
      row[col] = values[idx] || null;
    });

    rows.push(row);
  }

  return {
    tableName: "imported_data",
    columns,
    rows,
    inferredTypes: inferColumnTypes(rows, columns),
  };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Parse JSON content
 */
export function parseJSON(content: string): ParsedImportData {
  let data: any;

  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : "Parse error"}`);
  }

  // Handle array of objects
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error("JSON array is empty");
    }

    const firstRow = data[0];
    if (typeof firstRow !== "object" || firstRow === null) {
      throw new Error("JSON array must contain objects");
    }

    const columns = Object.keys(firstRow);
    return {
      tableName: "imported_data",
      columns,
      rows: data,
      inferredTypes: inferColumnTypes(data, columns),
    };
  }

  // Handle single table object with rows
  if (data.tableName && Array.isArray(data.rows)) {
    const columns = data.columns || (data.rows[0] ? Object.keys(data.rows[0]) : []);
    return {
      tableName: data.tableName,
      columns,
      rows: data.rows,
      inferredTypes: inferColumnTypes(data.rows, columns),
    };
  }

  throw new Error("JSON must be an array of objects or contain 'tableName' and 'rows' properties");
}

/**
 * Parse SQL INSERT statements
 */
export function parseSQL(content: string): ParsedImportData {
  // Extract table name from CREATE TABLE or INSERT INTO
  const createTableMatch = content.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?[`"]?(\w+)[`"]?/i);
  const insertIntoMatch = content.match(/INSERT INTO\s+[`"]?(\w+)[`"]?/i);
  
  const tableName = createTableMatch?.[1] || insertIntoMatch?.[1] || "imported_data";

  // Extract column definitions from CREATE TABLE
  let columns: string[] = [];
  const createMatch = content.match(/CREATE TABLE[^(]*\(([^;]+)\)/i);
  
  if (createMatch) {
    const columnDefs = createMatch[1];
    columns = columnDefs
      .split(",")
      .map((def) => {
        const match = def.trim().match(/^[`"]?(\w+)[`"]?/);
        return match ? match[1] : "";
      })
      .filter((col) => col && !col.match(/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)/i));
  }

  // Extract data from INSERT statements
  const rows: any[] = [];
  const insertRegex = /INSERT INTO\s+[`"]?\w+[`"]?\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([^;]+)\)/gi;
  
  let insertColumns: string[] = [];
  let match;
  while ((match = insertRegex.exec(content)) !== null) {
    const columnList = match[1];
    const valuesList = match[2];

    // Parse columns from INSERT statement (prioritize this over CREATE TABLE)
    if (columnList) {
      insertColumns = columnList.split(",").map((col) => col.trim().replace(/[`"]/g, ""));
    }

    // Use INSERT columns if available, otherwise use CREATE TABLE columns
    const columnsToUse = insertColumns.length > 0 ? insertColumns : columns;

    // Parse values (handling multiple value sets)
    const valueSets = valuesList.split(/\),\s*\(/);
    
    valueSets.forEach((valueSet) => {
      const values = parseValueSet(valueSet.replace(/^\(|\)$/g, ""));
      const row: any = {};
      
      columnsToUse.forEach((col, idx) => {
        row[col] = values[idx] !== undefined ? values[idx] : null;
      });
      
      rows.push(row);
    });
  }

  // Update columns to match what was actually used
  if (insertColumns.length > 0) {
    columns = insertColumns;
  }

  if (rows.length === 0) {
    throw new Error("No INSERT statements found in SQL file");
  }

  return {
    tableName,
    columns,
    rows,
    inferredTypes: inferColumnTypes(rows, columns),
  };
}

/**
 * Parse SQL value set handling strings, numbers, nulls
 */
function parseValueSet(valueSet: string): any[] {
  const values: any[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < valueSet.length; i++) {
    const char = valueSet[i];
    const nextChar = valueSet[i + 1];

    if ((char === "'" || char === '"') && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      if (nextChar === quoteChar) {
        // Escaped quote
        current += char;
        i++;
      } else {
        inQuotes = false;
        quoteChar = "";
      }
    } else if (char === "," && !inQuotes) {
      values.push(parseValue(current.trim()));
      current = "";
    } else {
      current += char;
    }
  }

  values.push(parseValue(current.trim()));
  return values;
}

/**
 * Parse a single SQL value
 */
function parseValue(value: string): any {
  if (value.toUpperCase() === "NULL") return null;
  if (value === "") return null;
  
  // Remove quotes
  if ((value.startsWith("'") && value.endsWith("'")) || 
      (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1).replace(/''/g, "'").replace(/""/g, '"');
  }
  
  // Try to parse as number
  const num = Number(value);
  if (!isNaN(num)) return num;
  
  // Try to parse as boolean
  if (value.toUpperCase() === "TRUE") return true;
  if (value.toUpperCase() === "FALSE") return false;
  
  return value;
}

/**
 * Infer column types from data
 */
export function inferColumnTypes(
  rows: any[],
  columns: string[]
): Record<string, string> {
  const types: Record<string, string> = {};

  columns.forEach((col) => {
    const values = rows.map((row) => row[col]).filter((v) => v !== null && v !== undefined);
    
    if (values.length === 0) {
      types[col] = "TEXT";
      return;
    }

    // Check if all values are booleans FIRST (before numbers)
    const allBooleans = values.every((v) => 
      typeof v === "boolean" || 
      v === "true" || 
      v === "false" || 
      v === true || 
      v === false ||
      (typeof v === "string" && (v.toLowerCase() === "true" || v.toLowerCase() === "false"))
    );
    if (allBooleans) {
      types[col] = "BOOLEAN";
      return;
    }

    // Check if all values are numbers
    const allNumbers = values.every((v) => {
      if (typeof v === "boolean") return false; // Exclude booleans
      if (typeof v === "string" && (v.toLowerCase() === "true" || v.toLowerCase() === "false")) return false;
      return typeof v === "number" || !isNaN(Number(v));
    });
    if (allNumbers) {
      const hasDecimals = values.some((v) => String(v).includes("."));
      types[col] = hasDecimals ? "REAL" : "INTEGER";
      return;
    }

    // Check if values look like dates (be strict - must match common date patterns)
    const allDates = values.every((v) => {
      if (typeof v !== "string") return false;
      // Only consider it a date if it matches common date patterns
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,                    // YYYY-MM-DD
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,  // ISO 8601
        /^\d{2}\/\d{2}\/\d{4}$/,                  // MM/DD/YYYY
        /^\d{4}\/\d{2}\/\d{2}$/,                  // YYYY/MM/DD
      ];
      const matchesPattern = datePatterns.some(pattern => pattern.test(v));
      if (!matchesPattern) return false;
      
      // Also verify it's a valid date
      const date = new Date(v);
      return !isNaN(date.getTime());
    });
    if (allDates) {
      types[col] = "TIMESTAMP";
      return;
    }

    types[col] = "TEXT";
  });

  return types;
}

/**
 * Generate preview of imported data
 */
export function generatePreview(
  parsed: ParsedImportData,
  maxRows: number = 10
): ImportPreview {
  const warnings: string[] = [];

  // Check for potential issues
  if (parsed.columns.length === 0) {
    warnings.push("No columns detected");
  }

  if (parsed.rows.length === 0) {
    warnings.push("No data rows found");
  }

  // Check for duplicate column names
  const columnCounts = new Map<string, number>();
  parsed.columns.forEach((col) => {
    columnCounts.set(col, (columnCounts.get(col) || 0) + 1);
  });
  columnCounts.forEach((count, col) => {
    if (count > 1) {
      warnings.push(`Duplicate column name: ${col}`);
    }
  });

  // Generate column info with sample values
  const columns = parsed.columns.map((col) => {
    const sampleValues = parsed.rows
      .slice(0, 5)
      .map((row) => row[col])
      .filter((v) => v !== null && v !== undefined);

    return {
      name: col,
      type: parsed.inferredTypes?.[col] || "TEXT",
      sampleValues,
    };
  });

  return {
    tableName: parsed.tableName,
    columns,
    rowCount: parsed.rows.length,
    previewRows: parsed.rows.slice(0, maxRows),
    warnings,
  };
}

/**
 * Validate import data
 */
export function validateImportData(parsed: ParsedImportData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check table name
  if (!parsed.tableName || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(parsed.tableName)) {
    errors.push("Invalid table name. Must start with letter/underscore and contain only alphanumeric characters.");
  }

  // Check columns
  if (parsed.columns.length === 0) {
    errors.push("No columns found in import data");
  }

  parsed.columns.forEach((col) => {
    if (!col || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
      errors.push(`Invalid column name: ${col}`);
    }
  });

  // Check rows
  if (parsed.rows.length === 0) {
    warnings.push("No data rows to import");
  }

  // Check for missing values
  const missingCounts: Record<string, number> = {};
  parsed.rows.forEach((row) => {
    parsed.columns.forEach((col) => {
      if (row[col] === null || row[col] === undefined || row[col] === "") {
        missingCounts[col] = (missingCounts[col] || 0) + 1;
      }
    });
  });

  Object.entries(missingCounts).forEach(([col, count]) => {
    const percentage = (count / parsed.rows.length) * 100;
    if (percentage > 50) {
      warnings.push(`Column '${col}' has ${percentage.toFixed(0)}% missing values`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
