import { randomUUID } from "node:crypto";

import type {
    DmlDeleteOperation,
    DmlInsertOperation,
    DmlUpdateOperation,
    OperationExecution,
} from "@/types/ai";

import { buildPredicate, coerceValue, nowIso } from "../helpers";
import type { OperationContext } from "./types";

export function executeInsert(
  operation: DmlInsertOperation,
  context: OperationContext,
): OperationExecution {
  const { markDirty, requireTable } = context;
  const table = requireTable(operation.table);

  if (!operation.rows.length) {
    throw new Error("Insert operation requires at least one row.");
  }

  for (const row of operation.rows) {
    const record: Record<string, unknown> = {};
    for (const columnName of table.columnOrder) {
      const column = table.columns[columnName];
      const incoming = row[columnName];
      const value = incoming === undefined ? column.defaultValue : incoming;
      record[columnName] = coerceValue(column, value);
    }

    const primaryKey = table.primaryKey;
    if (primaryKey) {
      const candidate = record[primaryKey];
      if (candidate === undefined || candidate === null) {
        throw new Error(`Primary key column "${primaryKey}" requires a value.`);
      }
      const duplicate = table.rows.find((entry) => entry[primaryKey] === candidate);
      if (duplicate) {
        throw new Error(`Duplicate primary key value detected for column "${primaryKey}".`);
      }
    }

    table.rows.push(record);
  }

  table.updatedAt = nowIso();
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DML",
    status: "success",
    detail: `Inserted ${operation.rows.length} row(s) into "${operation.table}".`,
  };
}

export function executeUpdate(
  operation: DmlUpdateOperation,
  context: OperationContext,
): OperationExecution {
  const { markDirty, requireTable } = context;
  const table = requireTable(operation.table);

  if (!Object.keys(operation.changes).length) {
    throw new Error("Update operation requires at least one field to change.");
  }

  const predicate = buildPredicate(operation.criteria);
  let affected = 0;

  for (const row of table.rows) {
    if (!predicate(row)) continue;
    for (const [key, raw] of Object.entries(operation.changes)) {
      const column = table.columns[key];
      if (!column) {
        throw new Error(`Column "${key}" does not exist on table "${operation.table}".`);
      }
      row[key] = coerceValue(column, raw);
    }
    affected += 1;
  }

  table.updatedAt = nowIso();
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DML",
    status: "success",
    detail: `Updated ${affected} row(s) on "${operation.table}".`,
  };
}

export function executeDelete(
  operation: DmlDeleteOperation,
  context: OperationContext,
): OperationExecution {
  const { markDirty, requireTable } = context;
  const table = requireTable(operation.table);
  const predicate = buildPredicate(operation.criteria);
  const before = table.rows.length;
  table.rows = table.rows.filter((row) => !predicate(row));
  const removed = before - table.rows.length;

  table.updatedAt = nowIso();
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DML",
    status: "success",
    detail: `Deleted ${removed} row(s) from "${operation.table}".`,
  };
}
