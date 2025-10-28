import { z } from "zod";

import type { AiPlan } from "@/types/ai";

const comparisonOperatorSchema = z
  .enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"])
  .optional();

const criteriaConditionSchema = z.object({
  column: z.string().min(1),
  operator: comparisonOperatorSchema,
  value: z.unknown(),
});

const orderBySchema = z.object({
  column: z.string().min(1),
  direction: z.enum(["asc", "desc"]).optional(),
});

const columnBlueprintSchema = z.object({
  name: z.string().min(1),
  dataType: z.string().min(1),
  nullable: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  isPrimaryKey: z.boolean().optional(),
});

const createTableSchema = z.object({
  type: z.literal("ddl.create_table"),
  table: z.string().min(1),
  description: z.string().optional(),
  ifExists: z.enum(["abort", "skip", "replace"]).optional(),
  columns: z.array(columnBlueprintSchema).min(1),
});

const dropTableSchema = z.object({
  type: z.literal("ddl.drop_table"),
  table: z.string().min(1),
  ifExists: z.boolean().optional(),
});

const addColumnSchema = z.object({
  type: z.literal("ddl.alter_table_add_column"),
  table: z.string().min(1),
  column: columnBlueprintSchema,
  position: z.number().int().nonnegative().optional(),
});

const dropColumnSchema = z.object({
  type: z.literal("ddl.alter_table_drop_column"),
  table: z.string().min(1),
  column: z.string().min(1),
});

const insertSchema = z.object({
  type: z.literal("dml.insert"),
  table: z.string().min(1),
  rows: z.array(z.record(z.string(), z.unknown())).min(1),
});

const updateSchema = z.object({
  type: z.literal("dml.update"),
  table: z.string().min(1),
  criteria: z.array(criteriaConditionSchema).default([]),
  changes: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, {
    message: "Update operation must specify at least one change.",
  }),
});

const deleteSchema = z.object({
  type: z.literal("dml.delete"),
  table: z.string().min(1),
  criteria: z.array(criteriaConditionSchema).default([]),
});

const selectSchema = z.object({
  type: z.literal("dql.select"),
  table: z.string().min(1),
  columns: z.array(z.string().min(1)).optional(),
  criteria: z.array(criteriaConditionSchema).default([]),
  orderBy: z.array(orderBySchema).optional(),
  limit: z.number().int().positive().max(200).optional(),
});

const grantSchema = z.object({
  type: z.literal("dcl.grant"),
  role: z.string().min(1),
  table: z.string().min(1),
  privileges: z.array(z.string().min(1)).min(1),
  description: z.string().optional(),
});

const revokeSchema = z.object({
  type: z.literal("dcl.revoke"),
  role: z.string().min(1),
  table: z.string().min(1),
  privileges: z.array(z.string().min(1)).min(1),
});

const operationSchema = z.discriminatedUnion("type", [
  createTableSchema,
  dropTableSchema,
  addColumnSchema,
  dropColumnSchema,
  insertSchema,
  updateSchema,
  deleteSchema,
  selectSchema,
  grantSchema,
  revokeSchema,
]);

const planSchema = z.object({
  thought: z.string().optional(),
  finalResponse: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  operations: z.array(operationSchema),
});

export function parseAiPlan(raw: string): AiPlan {
  const sanitized = sanitizeModelResponse(raw);
  let payload: unknown;
  try {
    payload = JSON.parse(sanitized);
  } catch (error) {
    throw new Error(`Gemini response was not valid JSON: ${(error as Error).message}`);
  }

  const normalized = normalizePlanPayload(payload);
  const result = planSchema.parse(normalized);
  return result as AiPlan;
}

function sanitizeModelResponse(raw: string) {
  let candidate = raw.trim();
  if (!candidate) {
    return candidate;
  }

  const codeBlockMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    candidate = codeBlockMatch[1].trim();
  }

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    candidate = candidate.slice(firstBrace, lastBrace + 1);
  }

  return candidate;
}

function normalizePlanPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { operations: [] };
  }

  const plan = payload as Record<string, unknown>;
  const operationsSource = Array.isArray(plan.operations) ? plan.operations : [];

  const operations = operationsSource.map((operation) => normalizeOperationBlueprint(operation));

  return {
    ...plan,
    operations,
  };
}

function normalizeOperationBlueprint(operation: unknown) {
  if (!operation || typeof operation !== "object") {
    return operation;
  }

  const entry = { ...operation } as Record<string, unknown>;
  const normalizedType = normalizeOperationType(entry.type);
  if (normalizedType) {
    entry.type = normalizedType;
  }
  const type = entry.type;

  if (type === "ddl.create_table" && Array.isArray(entry.columns)) {
    entry.columns = entry.columns.map((column) => normalizeColumnBlueprint(column));
  }

  if (type === "ddl.alter_table_add_column" && entry.column) {
    entry.column = normalizeColumnBlueprint(entry.column);
  }

  return entry;
}

function normalizeColumnBlueprint(column: unknown) {
  if (!column || typeof column !== "object") {
    return column;
  }

  const blueprint = { ...column } as Record<string, unknown>;
  const dataType = typeof blueprint.dataType === "string" ? blueprint.dataType.trim() : "";
  blueprint.dataType = dataType || "text";

  if (typeof blueprint.nullable !== "boolean") {
    blueprint.nullable = true;
  }

  return blueprint;
}

function normalizeOperationType(type: unknown) {
  if (typeof type !== "string") {
    return undefined;
  }

  const trimmed = type.trim();
  if (!trimmed) {
    return undefined;
  }

  const withDelimiters = trimmed.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_");
  return withDelimiters.toLowerCase();
}
