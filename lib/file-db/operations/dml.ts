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
      const duplicateInBatch = inserted.find((entry) => entry[primaryKey] === candidate);
      if (duplicateInBatch) {
        throw new Error(`Duplicate primary key value detected for column "${primaryKey}" within the same insert batch.`);
      }
      if (!replicator) {
        const duplicateExisting = table.rows.find((entry) => entry[primaryKey] === candidate);
        if (duplicateExisting) {
          throw new Error(`Duplicate primary key value detected for column "${primaryKey}".`);
        }
      }
    }

    inserted.push(record);
  }

  let insertedCount = inserted.length;

  if (replicator) {
    const result = await replicator.insert(table, inserted);
    insertedCount = result.inserted;
    const startingCount = table.rowCount ?? table.rows.length;
    table.rowCount = startingCount + insertedCount;
  } else {
    table.rows.push(...inserted);
    table.rowCount = table.rows.length;
  }

  table.updatedAt = nowIso();
  markDirty();

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DML",
    status: "success",
    detail: `Inserted ${insertedCount} row(s) into "${operation.table}".`,
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

  const coercedChanges: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(operation.changes)) {
    const column = table.columns[key];
    if (!column) {
      throw new Error(`Column "${key}" does not exist on table "${operation.table}".`);
    }
    coercedChanges[key] = coerceValue(column, raw);
  }

  let affected = 0;

  if (replicator) {
    const result = await replicator.update(table, operation.criteria ?? [], coercedChanges);
    affected = result.affected;
  } else {
    const predicate = buildPredicate(operation.criteria);
    for (const row of table.rows) {
      if (!predicate(row)) continue;
      for (const [key, value] of Object.entries(coercedChanges)) {
        row[key] = value;
      }
      affected += 1;
    }
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

export async function executeDelete(
  operation: DmlDeleteOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const { markDirty, requireTable, replicator } = context;
  const table = requireTable(operation.table);

  let removed = 0;

  if (replicator) {
    const result = await replicator.delete(table, operation.criteria ?? []);
    removed = result.removed;
    const startingCount = table.rowCount ?? table.rows.length;
    table.rowCount = Math.max(0, startingCount - removed);
  } else {
    const predicate = buildPredicate(operation.criteria);
    const survivors = table.rows.filter((row) => !predicate(row));
    removed = table.rows.length - survivors.length;
    table.rows = survivors;
    table.rowCount = table.rows.length;
  }

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
