import { randomUUID } from "node:crypto";

import type {
    DdlAddColumnOperation,
    DdlCreateTableOperation,
    DdlDropColumnOperation,
    DdlDropTableOperation,
    OperationExecution,
} from "@/types/ai";
import type { DatabaseTable, TableColumnDefinition } from "@/types/file-db";

import { nowIso, validateColumn } from "../helpers";
import type { OperationContext } from "./types";

export function executeCreateTable(
  operation: DdlCreateTableOperation,
  context: OperationContext,
): OperationExecution {
  const { state, markDirty } = context;
  const existing = state.tables[operation.table];

  if (existing) {
    if (operation.ifExists === "skip") {
      return {
        id: randomUUID(),
        type: operation.type,
        category: "DDL",
        status: "skipped",
        detail: `Table "${operation.table}" already exists; skipping creation as requested.`,
      };
    }
    if (operation.ifExists === "replace") {
      delete state.tables[operation.table];
    } else {
      throw new Error(`Table "${operation.table}" already exists.`);
    }
  }

  if (!operation.columns.length) {
    throw new Error("Cannot create a table without columns.");
  }

  const now = nowIso();
  const columns: Record<string, TableColumnDefinition> = {};
  const columnOrder: string[] = [];
  let primaryKey: string | undefined;

  for (const blueprint of operation.columns) {
    const columnName = blueprint.name.trim();
    if (!columnName) {
      throw new Error("Column name cannot be empty.");
    }
    if (columns[columnName]) {
      throw new Error(`Duplicate column name "${columnName}".`);
    }

    const column: TableColumnDefinition = {
      name: columnName,
      dataType: blueprint.dataType.trim(),
      nullable: blueprint.nullable ?? true,
      defaultValue: blueprint.defaultValue,
      isPrimaryKey: blueprint.isPrimaryKey ?? false,
    };

    validateColumn(column);
    columns[columnName] = column;
    columnOrder.push(columnName);

    if (column.isPrimaryKey) {
      if (primaryKey) {
        throw new Error("Multiple primary keys are not supported in this file database.");
      }
      primaryKey = columnName;
    }
  }

  const table: DatabaseTable = {
    name: operation.table,
    description: operation.description,
    primaryKey,
    columns,
    columnOrder,
    permissions: {},
    rows: [],
    createdAt: now,
    updatedAt: now,
  };

  state.tables[operation.table] = table;
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DDL",
    status: "success",
    detail: `Created table "${operation.table}" with ${columnOrder.length} column(s).`,
  };
}

export function executeDropTable(
  operation: DdlDropTableOperation,
  context: OperationContext,
): OperationExecution {
  const { state, markDirty } = context;
  const table = state.tables[operation.table];

  if (!table) {
    if (operation.ifExists) {
      return {
        id: randomUUID(),
        type: operation.type,
        category: "DDL",
        status: "skipped",
        detail: `Table "${operation.table}" does not exist; skipping drop as requested.`,
      };
    }
    throw new Error(`Table "${operation.table}" does not exist.`);
  }

  delete state.tables[operation.table];
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DDL",
    status: "success",
    detail: `Dropped table "${operation.table}" (removed ${table.rows.length} row(s)).`,
  };
}

export function executeAddColumn(
  operation: DdlAddColumnOperation,
  context: OperationContext,
): OperationExecution {
  const { markDirty, requireTable } = context;
  const table = requireTable(operation.table);
  const columnName = operation.column.name.trim();

  if (!columnName) {
    throw new Error("Column name cannot be empty.");
  }
  if (table.columns[columnName]) {
    throw new Error(`Column "${columnName}" already exists on table "${operation.table}".`);
  }

  const column: TableColumnDefinition = {
    name: columnName,
    dataType: operation.column.dataType.trim(),
    nullable: operation.column.nullable ?? true,
    defaultValue: operation.column.defaultValue,
    isPrimaryKey: operation.column.isPrimaryKey ?? false,
  };
  validateColumn(column);

  if (column.isPrimaryKey && table.primaryKey) {
    throw new Error(`Table "${operation.table}" already has a primary key column.`);
  }

  if (!column.nullable && column.defaultValue === undefined && table.rows.length) {
    throw new Error(
      `Cannot add non-nullable column "${column.name}" without default value to a table containing rows.`,
    );
  }

  if (column.isPrimaryKey) {
    table.primaryKey = columnName;
  }

  const insertionIndex =
    typeof operation.position === "number" && operation.position >= 0
      ? Math.min(operation.position, table.columnOrder.length)
      : table.columnOrder.length;

  table.columnOrder.splice(insertionIndex, 0, columnName);
  table.columns[columnName] = column;

  for (const row of table.rows) {
    if (column.defaultValue !== undefined) {
      row[columnName] = column.defaultValue;
    } else if (!column.nullable) {
      throw new Error(
        `Existing row violates constraint for column "${columnName}"; expected default value to fill in.`,
      );
    } else {
      row[columnName] = null;
    }
  }

  table.updatedAt = nowIso();
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DDL",
    status: "success",
    detail: `Added column "${columnName}" to table "${operation.table}".`,
  };
}

export function executeDropColumn(
  operation: DdlDropColumnOperation,
  context: OperationContext,
): OperationExecution {
  const { markDirty, requireTable } = context;
  const table = requireTable(operation.table);
  const column = table.columns[operation.column];

  if (!column) {
    throw new Error(`Column "${operation.column}" does not exist on table "${operation.table}".`);
  }

  if (column.isPrimaryKey) {
    throw new Error("Dropping the primary key column is not supported.");
  }

  delete table.columns[operation.column];
  table.columnOrder = table.columnOrder.filter((name) => name !== operation.column);
  for (const row of table.rows) {
    delete row[operation.column];
  }

  table.updatedAt = nowIso();
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DDL",
    status: "success",
    detail: `Removed column "${operation.column}" from table "${operation.table}".`,
  };
}
