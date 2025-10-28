import { randomUUID } from "node:crypto";

import type {
  DmlDeleteOperation,
  DmlInsertOperation,
  DmlUpdateOperation,
  OperationExecution,
} from "@/types/ai";

import { buildPredicate, coerceValue, nowIso } from "../helpers";
import type { OperationContext } from "./types";

export async function executeInsert(
  operation: DmlInsertOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const { markDirty, requireTable, replicator } = context;
  const table = requireTable(operation.table);

  if (!operation.rows.length) {
    throw new Error("Insert operation requires at least one row.");
  }

  const inserted: Array<Record<string, unknown>> = [];

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

    inserted.push(record);
  }

  if (replicator) {
    await replicator.insert(table, inserted);
  }

  table.rows.push(...inserted);
  table.updatedAt = nowIso();
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DML",
    status: "success",
    detail: `Inserted ${inserted.length} row(s) into "${operation.table}".`,
  };
}

export async function executeUpdate(
  operation: DmlUpdateOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const { markDirty, requireTable, replicator } = context;
  const table = requireTable(operation.table);

  if (!Object.keys(operation.changes).length) {
    throw new Error("Update operation requires at least one field to change.");
  }

  const predicate = buildPredicate(operation.criteria);
  const matchedRows = table.rows.filter((row) => predicate(row));

  const coercedChanges: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(operation.changes)) {
    const column = table.columns[key];
    if (!column) {
      throw new Error(`Column "${key}" does not exist on table "${operation.table}".`);
    }
    coercedChanges[key] = coerceValue(column, raw);
  }

  if (replicator) {
    await replicator.update(table, operation.criteria ?? [], coercedChanges);
  }

  for (const row of matchedRows) {
    for (const [key, value] of Object.entries(coercedChanges)) {
      row[key] = value;
    }
  }

  table.updatedAt = nowIso();
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DML",
    status: "success",
    detail: `Updated ${matchedRows.length} row(s) on "${operation.table}".`,
  };
}

export async function executeDelete(
  operation: DmlDeleteOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const { markDirty, requireTable, replicator } = context;
  const table = requireTable(operation.table);
  const predicate = buildPredicate(operation.criteria);

  const survivors = table.rows.filter((row) => !predicate(row));
  const removed = table.rows.length - survivors.length;

  if (replicator) {
    await replicator.delete(table, operation.criteria ?? []);
  }

  table.rows = survivors;
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
