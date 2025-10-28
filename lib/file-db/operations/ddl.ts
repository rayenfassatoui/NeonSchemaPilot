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

export async function executeCreateTable(
  operation: DdlCreateTableOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const { state, markDirty, replicator } = context;
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
    if (operation.ifExists !== "replace") {
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
    rowCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (existing && operation.ifExists === "replace" && replicator) {
    await replicator.dropTable({ type: "ddl.drop_table", table: operation.table, ifExists: true }, existing);
  }

  if (replicator) {
    await replicator.createTable(operation, table);
  }

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

export async function executeDropTable(
  operation: DdlDropTableOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const { state, markDirty, replicator } = context;
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

  if (replicator) {
    await replicator.dropTable(operation, table);
  }

  delete state.tables[operation.table];
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DDL",
    status: "success",
    detail: `Dropped table "${operation.table}" (removed ${(table.rowCount ?? table.rows.length)} row(s)).`,
  };
}

export async function executeAddColumn(
  operation: DdlAddColumnOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const { markDirty, requireTable, replicator } = context;
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

  if (replicator) {
    await replicator.addColumn(operation, column);
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

export async function executeDropColumn(
  operation: DdlDropColumnOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const { markDirty, requireTable, replicator } = context;
  const table = requireTable(operation.table);
  const column = table.columns[operation.column];

  if (!column) {
    throw new Error(`Column "${operation.column}" does not exist on table "${operation.table}".`);
  }

  if (column.isPrimaryKey) {
    throw new Error("Dropping the primary key column is not supported.");
  }

  if (replicator) {
    await replicator.dropColumn(operation, table);
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
