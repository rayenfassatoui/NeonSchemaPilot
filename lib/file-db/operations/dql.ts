import { randomUUID } from "node:crypto";

import type { DqlSelectOperation, OperationExecution } from "@/types/ai";

import { buildPredicate } from "../helpers";
import type { OperationContext } from "./types";

export async function executeSelect(
  operation: DqlSelectOperation,
  context: OperationContext,
): Promise<OperationExecution> {
  const table = context.requireTable(operation.table);
  const limit = Math.min(Math.max(operation.limit ?? 25, 1), 200);

  if (context.replicator) {
    const resultSet = await context.replicator.select(table, { ...operation, limit });
    return {
      id: randomUUID(),
      type: operation.type,
      category: "DQL",
      status: "success",
      detail: `Retrieved ${resultSet.rows.length} row(s) (scanned ${resultSet.rowCount}).`,
      resultSet,
    };
  }

  const predicate = buildPredicate(operation.criteria);

  const filtered = table.rows.filter((row) => predicate(row));
  const orderBy = operation.orderBy?.length ? operation.orderBy : undefined;

  if (orderBy) {
    filtered.sort((a, b) => {
      for (const clause of orderBy) {
        const direction = clause.direction?.toLowerCase() === "desc" ? -1 : 1;
        const leftValue = a[clause.column] as
          | string
          | number
          | boolean
          | null
          | undefined;
        const rightValue = b[clause.column] as
          | string
          | number
          | boolean
          | null
          | undefined;

        if (leftValue === rightValue) continue;
        if (leftValue === undefined || leftValue === null) return -direction;
        if (rightValue === undefined || rightValue === null) return direction;

        if (typeof leftValue === "number" && typeof rightValue === "number") {
          if (leftValue > rightValue) return direction;
          if (leftValue < rightValue) return -direction;
          continue;
        }

        const leftComparable = String(leftValue);
        const rightComparable = String(rightValue);
        if (leftComparable > rightComparable) return direction;
        if (leftComparable < rightComparable) return -direction;
      }
      return 0;
    });
  }

  const projectedColumns = operation.columns?.length
    ? operation.columns
    : table.columnOrder.slice();

  const rows = filtered.slice(0, limit).map((row) => {
    const next: Record<string, unknown> = {};
    for (const column of projectedColumns) {
      next[column] = row[column];
    }
    return next;
  });

  return {
    id: randomUUID(),
    type: operation.type,
    category: "DQL",
    status: "success",
    detail: `Retrieved ${rows.length} row(s) (scanned ${filtered.length}).`,
    resultSet: {
      title: `Query on ${operation.table}`,
      columns: projectedColumns,
      rows,
      rowCount: filtered.length,
      limit,
    },
  };
}
