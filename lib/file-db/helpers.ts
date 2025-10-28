import type {
    CriteriaCondition,
    OperationExecution,
} from "@/types/ai";
import type {
    DatabaseFile,
    DatabaseTable,
    DatabaseTableSummary,
    Privilege,
    TableColumnDefinition,
} from "@/types/file-db";

import { ALLOWED_PRIVILEGES } from "./constants";

export function nowIso() {
  return new Date().toISOString();
}

export function deriveCategory(type: OperationExecution["type"]): OperationExecution["category"] {
  if (type.startsWith("ddl")) return "DDL";
  if (type.startsWith("dml")) return "DML";
  if (type.startsWith("dql")) return "DQL";
  return "DCL";
}

export function validateColumn(column: TableColumnDefinition) {
  if (!column.name.trim()) {
    throw new Error("Column name cannot be empty.");
  }
  if (!column.dataType.trim()) {
    throw new Error(`Column "${column.name}" must declare a data type.`);
  }
}

export function coerceValue(column: TableColumnDefinition, value: unknown) {
  if (value === undefined || value === null) {
    if (!column.nullable) {
      throw new Error(`Column "${column.name}" does not allow null values.`);
    }
    return null;
  }

  switch (column.dataType.toLowerCase()) {
    case "string":
    case "text":
    case "uuid":
      return String(value);
    case "number":
    case "integer":
    case "float":
    case "decimal":
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value.trim());
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      throw new Error(`Value for column "${column.name}" must be numeric.`);
    case "boolean":
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
      }
      throw new Error(`Value for column "${column.name}" must be boolean.`);
    case "date":
    case "datetime": {
      const next = new Date(value as string);
      if (Number.isNaN(next.valueOf())) {
        throw new Error(`Value for column "${column.name}" must be a valid date.`);
      }
      return next.toISOString();
    }
    case "json":
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (error) {
          throw new Error(
            `Invalid JSON for column "${column.name}": ${(error as Error).message}`,
          );
        }
      }
      return value;
    default:
      return value;
  }
}

export function buildPredicate(criteria?: CriteriaCondition[]) {
  if (!criteria?.length) {
    return () => true;
  }

  return (row: Record<string, unknown>) =>
    criteria.every((condition) => evaluateCondition(row, condition));
}

function evaluateCondition(row: Record<string, unknown>, condition: CriteriaCondition) {
  const { column, operator = "eq", value } = condition;
  const candidate = row[column];

  switch (operator) {
    case "eq":
      return candidate === value;
    case "neq":
      return candidate !== value;
    case "gt":
      return typeof candidate === "number" && typeof value === "number" && candidate > value;
    case "gte":
      return typeof candidate === "number" && typeof value === "number" && candidate >= value;
    case "lt":
      return typeof candidate === "number" && typeof value === "number" && candidate < value;
    case "lte":
      return typeof candidate === "number" && typeof value === "number" && candidate <= value;
    case "contains":
      return typeof candidate === "string" && typeof value === "string" && candidate.includes(value);
    case "in":
      return Array.isArray(value) && value.some((entry) => entry === candidate);
    default:
      return false;
  }
}

export function ensurePrivileges(privileges: string[]): Privilege[] {
  return privileges
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry, index, array) => entry && array.indexOf(entry) === index)
    .map((entry) => {
      if (!ALLOWED_PRIVILEGES.includes(entry as Privilege)) {
        throw new Error(`Privilege "${entry}" is not supported.`);
      }
      return entry as Privilege;
    });
}

export function summarizeTable(table: DatabaseTable): DatabaseTableSummary {
  return {
    name: table.name,
    description: table.description,
    primaryKey: table.primaryKey,
    columnCount: table.columnOrder.length,
    rowCount: table.rows.length,
    updatedAt: table.updatedAt,
    columns: table.columnOrder.map((columnName) => table.columns[columnName]),
    permissions: Object.values(table.permissions).map((permission) => ({
      role: permission.role,
      privileges: permission.privileges,
    })),
  };
}

export function formatPromptDigest(state: DatabaseFile, maxRows = 2) {
  const lines: string[] = [];
  const tables = Object.values(state.tables);

  if (!tables.length) {
    lines.push("No tables are currently defined.");
  } else {
    for (const table of tables) {
      lines.push(
        `Table "${table.name}" (${table.rows.length} row(s), ${table.columnOrder.length} column(s))`,
      );
      if (table.description) {
        lines.push(`  Description: ${table.description}`);
      }
      lines.push("  Columns:");
      for (const columnName of table.columnOrder) {
        const column = table.columns[columnName];
        const pieces = [
          `    - ${column.name}: ${column.dataType}`,
          column.isPrimaryKey ? " PRIMARY KEY" : "",
          column.nullable ? "" : " NOT NULL",
        ];
        if (column.defaultValue !== undefined) {
          pieces.push(` DEFAULT ${JSON.stringify(column.defaultValue)}`);
        }
        lines.push(pieces.join(""));
      }
      if (table.rows.length) {
        lines.push("  Sample rows:");
        const samples = table.rows.slice(0, maxRows);
        for (const sample of samples) {
          lines.push(`    ${JSON.stringify(sample)}`);
        }
      }
      const permissionEntries = Object.values(table.permissions);
      if (permissionEntries.length) {
        lines.push("  Permissions:");
        for (const permission of permissionEntries) {
          lines.push(`    - ${permission.role}: ${permission.privileges.join(", ")}`);
        }
      }
    }
  }

  const roles = Object.values(state.roles);
  if (roles.length) {
    lines.push("Roles:");
    for (const role of roles) {
      lines.push(`  - ${role.name}${role.description ? ` (${role.description})` : ""}`);
    }
  }

  return lines.join("\n");
}
